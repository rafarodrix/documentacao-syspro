"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  ExternalLink,
  Loader2,
  MonitorCheck,
  RefreshCw,
  Search,
  ServerOff,
  WifiOff,
} from "lucide-react";
import type {
  AgentDeviceListResult,
  AgentDeviceSummary,
  AgentFleetStats,
} from "@dosc-syspro/contracts/agent";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type StatusFilter = "all" | "online" | "offline";

export function AgentDevicesPanel(props: {
  initialStats: AgentFleetStats;
  initialList: AgentDeviceListResult;
  initialSearch: string;
  initialStatus: StatusFilter;
}) {
  const { initialStats, initialList, initialSearch, initialStatus } = props;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRefreshing, startRefresh] = useTransition();
  const [searchInput, setSearchInput] = useState(initialSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const status = (searchParams.get("status") as StatusFilter | null) ?? "all";
  const page = Number(searchParams.get("page") ?? "1") || 1;

  const updateParam = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    startRefresh(() => router.replace(`?${params.toString()}`, { scroll: false }));
  };

  const changePage = (next: number) => {
    updateParam({ page: String(next) });
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchInput === initialSearch) return;
    debounceRef.current = setTimeout(() => {
      updateParam({ search: searchInput.trim() || null, page: null });
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const stats = initialStats;
  const list = initialList;
  const { pagination } = list;

  const onlinePct = stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0;
  const linkedPct = stats.total > 0 ? Math.round((stats.withCompany / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Cpu className="w-4 h-4" />}
          label="Total de dispositivos"
          value={stats.total}
          accent="slate"
        />
        <StatCard
          icon={<MonitorCheck className="w-4 h-4" />}
          label="Online"
          value={stats.online}
          hint={`${onlinePct}% do parque`}
          accent="emerald"
        />
        <StatCard
          icon={<WifiOff className="w-4 h-4" />}
          label="Offline"
          value={stats.offline}
          hint={`janela de ${Math.round(stats.onlineThresholdSeconds / 60)} min`}
          accent="amber"
        />
        <StatCard
          icon={<Building2 className="w-4 h-4" />}
          label="Vinculados a empresa"
          value={stats.withCompany}
          hint={`${linkedPct}% — ${stats.withoutCompany} sem vinculo`}
          accent="violet"
        />
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-1 items-center gap-2 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Buscar por hostname, deviceId ou SO..."
                  className="pl-9 h-9"
                />
              </div>
              {(searchInput || initialSearch) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchInput("");
                    updateParam({ search: null, page: null });
                  }}
                >
                  Limpar
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <FilterPill
                label="Todos"
                count={stats.total}
                active={status === "all"}
                onClick={() => updateParam({ status: null, page: null })}
              />
              <FilterPill
                label="Online"
                count={stats.online}
                active={status === "online"}
                onClick={() => updateParam({ status: "online", page: null })}
                tone="emerald"
              />
              <FilterPill
                label="Offline"
                count={stats.offline}
                active={status === "offline"}
                onClick={() => updateParam({ status: "offline", page: null })}
                tone="amber"
              />
              <Button
                variant="ghost"
                size="icon"
                title="Recarregar"
                onClick={() => startRefresh(() => router.refresh())}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <DevicesTable items={list.items} />

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              {pagination.total === 0
                ? "Nenhum dispositivo"
                : `${(page - 1) * pagination.pageSize + 1}–${Math.min(page * pagination.pageSize, pagination.total)} de ${pagination.total} dispositivos`}
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={page <= 1 || isRefreshing}
                onClick={() => changePage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-2 tabular-nums">
                {page} / {pagination.totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={page >= pagination.totalPages || isRefreshing}
                onClick={() => changePage(page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard(props: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  accent: "slate" | "emerald" | "amber" | "violet";
}) {
  const accentClass = useMemo(
    () => ({
      slate: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
      emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      violet: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    }),
    [],
  );

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {props.label}
          </span>
          <span className={`p-1.5 rounded-md ${accentClass[props.accent]}`}>{props.icon}</span>
        </div>
        <div className="mt-2 text-2xl font-bold tabular-nums leading-none">{props.value}</div>
        {props.hint && <div className="mt-1 text-xs text-muted-foreground">{props.hint}</div>}
      </CardContent>
    </Card>
  );
}

function FilterPill(props: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  tone?: "default" | "emerald" | "amber";
}) {
  const tone = props.tone ?? "default";
  const activeClass =
    tone === "emerald"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
      : tone === "amber"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
        : "bg-foreground text-background border-foreground";

  return (
    <button
      type="button"
      onClick={props.onClick}
      className={
        "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold border transition-colors " +
        (props.active
          ? activeClass
          : "bg-background text-muted-foreground border-border hover:bg-muted")
      }
    >
      <span>{props.label}</span>
      <span className="text-[10px] opacity-70">{props.count}</span>
    </button>
  );
}

function DevicesTable({ items }: { items: AgentDeviceSummary[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground border border-dashed rounded-lg">
        <ServerOff className="w-8 h-8" />
        <span className="text-sm font-medium">Nenhum dispositivo encontrado</span>
        <span className="text-xs">Ajuste filtros ou aguarde o proximo heartbeat dos agentes.</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b">
            <th className="py-2 pr-3 font-semibold">Status</th>
            <th className="py-2 pr-3 font-semibold">Hostname</th>
            <th className="py-2 pr-3 font-semibold">SO</th>
            <th className="py-2 pr-3 font-semibold">Empresa</th>
            <th className="py-2 pr-3 font-semibold">Host remoto</th>
            <th className="py-2 pr-3 font-semibold">Versao</th>
            <th className="py-2 pr-3 font-semibold">Ultimo heartbeat</th>
            <th className="py-2 pl-3 font-semibold text-right">Device ID</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-muted/40">
              <td className="py-2.5 pr-3">
                <StatusDot online={item.isOnline} />
              </td>
              <td className="py-2.5 pr-3 font-medium">
                <Link
                  href={`/portal/infraestrutura/agentes/${encodeURIComponent(item.deviceId)}`}
                  className="hover:text-primary hover:underline transition-colors"
                >
                  {item.hostname ?? <span className="text-muted-foreground font-normal">—</span>}
                </Link>
              </td>
              <td className="py-2.5 pr-3 text-muted-foreground">{item.os ?? "—"}</td>
              <td className="py-2.5 pr-3">
                {item.companyName ? (
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-[140px]">{item.companyName}</span>
                  </span>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    sem vinculo
                  </Badge>
                )}
              </td>
              <td className="py-2.5 pr-3">
                {item.remoteHostId && item.remoteHostName ? (
                  <Link
                    href={`/portal/infraestrutura/hosts/${item.remoteHostId}`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[140px]">{item.remoteHostName}</span>
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-2.5 pr-3 text-xs font-mono text-muted-foreground">
                {item.agentVersion ?? "—"}
              </td>
              <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                {formatRelativeTime(item.lastHeartbeatAt, item.heartbeatLagSeconds)}
              </td>
              <td className="py-2.5 pl-3 text-right font-mono text-[11px] text-muted-foreground">
                {item.deviceId.slice(0, 12)}…
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusDot({ online }: { online: boolean }) {
  if (online) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Online
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
      Offline
    </span>
  );
}

function formatRelativeTime(iso: string | null, lagSeconds: number | null): string {
  if (!iso || lagSeconds === null) return "nunca";
  if (lagSeconds < 60) return `há ${lagSeconds}s`;
  if (lagSeconds < 3600) return `há ${Math.floor(lagSeconds / 60)}min`;
  if (lagSeconds < 86400) return `há ${Math.floor(lagSeconds / 3600)}h`;
  return `há ${Math.floor(lagSeconds / 86400)}d`;
}
