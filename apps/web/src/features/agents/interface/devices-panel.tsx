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
import { type ColumnDef } from "@tanstack/react-table";
import {
  Badge,
  Button,
  Card,
  CardContent,
  DataTable,
  Input,
} from "@dosc-syspro/ui";

type StatusFilter = "all" | "online" | "offline";

export function AgentDevicesPanel(props: {
  initialStats: AgentFleetStats;
  initialList: AgentDeviceListResult;
  initialSearch: string;
  initialStatus: StatusFilter;
}) {
  const { initialStats, initialList, initialSearch } = props;
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Cpu className="h-4 w-4" />}
          label="Total de dispositivos"
          value={stats.total}
          accent="slate"
        />
        <StatCard
          icon={<MonitorCheck className="h-4 w-4" />}
          label="Online"
          value={stats.online}
          hint={`${onlinePct}% do parque`}
          accent="emerald"
        />
        <StatCard
          icon={<WifiOff className="h-4 w-4" />}
          label="Offline"
          value={stats.offline}
          hint={`janela de ${Math.round(stats.onlineThresholdSeconds / 60)} min`}
          accent="amber"
        />
        <StatCard
          icon={<Building2 className="h-4 w-4" />}
          label="Vinculados a empresa"
          value={stats.withCompany}
          hint={`${linkedPct}% - ${stats.withoutCompany} sem vinculo`}
          accent="violet"
        />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex max-w-xl flex-1 items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Buscar por hostname, deviceId ou SO..."
                  className="h-9 pl-9"
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
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <DevicesTable items={list.items} />

          <div className="flex items-center justify-between border-t pt-2">
            <span className="text-xs text-muted-foreground">
              {pagination.total === 0
                ? "Nenhum dispositivo"
                : `${(page - 1) * pagination.pageSize + 1}-${Math.min(page * pagination.pageSize, pagination.total)} de ${pagination.total} dispositivos`}
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={page <= 1 || isRefreshing}
                onClick={() => changePage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-xs tabular-nums text-muted-foreground">
                {page} / {pagination.totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={page >= pagination.totalPages || isRefreshing}
                onClick={() => changePage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
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
          <span className={`rounded-md p-1.5 ${accentClass[props.accent]}`}>{props.icon}</span>
        </div>
        <div className="mt-2 text-2xl font-bold tabular-nums leading-none">{props.value}</div>
        {props.hint ? <div className="mt-1 text-xs text-muted-foreground">{props.hint}</div> : null}
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
      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
      : tone === "amber"
        ? "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400"
        : "border-foreground bg-foreground text-background";

  return (
    <button
      type="button"
      onClick={props.onClick}
      className={
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors " +
        (props.active ? activeClass : "border-border bg-background text-muted-foreground hover:bg-muted")
      }
    >
      <span>{props.label}</span>
      <span className="text-[10px] opacity-70">{props.count}</span>
    </button>
  );
}

function DevicesTable({ items }: { items: AgentDeviceSummary[] }) {
  const columns = useMemo<ColumnDef<AgentDeviceSummary>[]>(() => [
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <StatusDot online={row.original.isOnline} />,
    },
    {
      id: "hostname",
      header: "Hostname",
      cell: ({ row }) => (
        <Link
          href={`/portal/infraestrutura/agentes/${encodeURIComponent(row.original.deviceId)}`}
          className="text-sm font-medium transition-colors hover:text-primary hover:underline"
        >
          {row.original.hostname ?? <span className="font-normal text-muted-foreground">-</span>}
        </Link>
      ),
    },
    {
      id: "os",
      header: "SO",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.os ?? "-"}</span>,
    },
    {
      id: "company",
      header: "Empresa",
      cell: ({ row }) =>
        row.original.companyName ? (
          <span className="inline-flex items-center gap-1.5 text-xs">
            <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="max-w-[140px] truncate">{row.original.companyName}</span>
          </span>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            sem vinculo
          </Badge>
        ),
    },
    {
      id: "remoteHost",
      header: "Host remoto",
      cell: ({ row }) =>
        row.original.remoteHostId && row.original.remoteHostName ? (
          <Link
            href={`/portal/infraestrutura/hosts/${row.original.remoteHostId}`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="max-w-[140px] truncate">{row.original.remoteHostName}</span>
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        ),
    },
    {
      id: "version",
      header: "Versao",
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.agentVersion ?? "-"}</span>,
    },
    {
      id: "heartbeat",
      header: "Ultimo heartbeat",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatRelativeTime(row.original.lastHeartbeatAt, row.original.heartbeatLagSeconds)}</span>,
    },
    {
      id: "deviceId",
      header: () => <div className="text-right">Device ID</div>,
      meta: { className: "text-right" },
      cell: ({ row }) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {row.original.deviceId.slice(0, 12)}...
        </span>
      ),
    },
  ], []);

  const renderMobileItem = (item: AgentDeviceSummary) => (
    <Link
      href={`/portal/infraestrutura/agentes/${encodeURIComponent(item.deviceId)}`}
      className="block space-y-3 p-4 transition-colors hover:bg-muted/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{item.hostname ?? "Sem hostname"}</p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">{item.os ?? "SO nao informado"}</p>
        </div>
        <StatusDot online={item.isOnline} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {item.companyName ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/20 px-2 py-1 text-[11px] text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span className="max-w-[180px] truncate">{item.companyName}</span>
          </span>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            sem vinculo
          </Badge>
        )}
        <span className="rounded-md border border-border/60 bg-background px-2 py-1 font-mono text-[10px] text-muted-foreground">
          {item.agentVersion ?? "-"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <span>{formatRelativeTime(item.lastHeartbeatAt, item.heartbeatLagSeconds)}</span>
        <span className="font-mono">{item.deviceId.slice(0, 12)}...</span>
      </div>
    </Link>
  );

  return (
    <DataTable
      columns={columns}
      data={items}
      flexible={true}
      minWidthClassName="min-w-[1040px]"
      cardClassName="border-none bg-transparent shadow-none rounded-none animate-none"
      emptyState={{
        title: "Nenhum dispositivo encontrado",
        description: "Ajuste filtros ou aguarde o proximo heartbeat dos agentes.",
        icon: ServerOff,
      }}
      rowClassName="hover:bg-muted/40"
      renderMobileItem={renderMobileItem}
    />
  );
}

function StatusDot({ online }: { online: boolean }) {
  if (online) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
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
  if (lagSeconds < 60) return `ha ${lagSeconds}s`;
  if (lagSeconds < 3600) return `ha ${Math.floor(lagSeconds / 60)}min`;
  if (lagSeconds < 86400) return `ha ${Math.floor(lagSeconds / 3600)}h`;
  return `ha ${Math.floor(lagSeconds / 86400)}d`;
}
