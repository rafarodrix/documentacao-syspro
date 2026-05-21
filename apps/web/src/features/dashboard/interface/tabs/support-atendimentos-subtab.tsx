"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { adminAtendimentosDataSchema } from "@dosc-syspro/contracts/dashboard";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dosc-syspro/ui";
import {
  AlertTriangle,
  Clock3,
  Inbox,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Search,
  ShieldAlert,
  UserRound,
  Users,
} from "lucide-react";
import { SectionCard } from "@/components/patterns";
import { ActivityChart } from "@/components/platform/app/dashboard/activity-chart";
import { formatDateTimeSafe } from "@/lib/date";
import { DashboardMetricCard } from "../components/dashboard-metric-card";
import { ExecutiveLine } from "../components/executive-line";

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildRangePreset(preset: "today" | "7d" | "30d") {
  const end = new Date();
  const start = new Date(end);

  if (preset === "7d") start.setDate(end.getDate() - 6);
  if (preset === "30d") start.setDate(end.getDate() - 29);

  return {
    from: toDateInputValue(start),
    to: toDateInputValue(end),
  };
}

function formatMinutes(value: number | null) {
  if (value === null) return "Sem base";
  if (value < 60) return `${value.toLocaleString("pt-BR")} min`;
  return `${(value / 60).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
}

function formatHours(value: number | null) {
  if (value === null) return "Sem base";
  if (value < 24) return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
  return `${(value / 24).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} d`;
}

function formatPercent(value: number, base: number) {
  if (base <= 0) return "0%";
  return `${Math.round((value / base) * 100)}%`;
}

function formatScore(value: number | null) {
  if (value === null) return "Sem base";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

async function getAtendimentosData(params?: {
  from?: string;
  to?: string;
  assigneeId?: string;
  contact?: string;
  refresh?: boolean;
}) {
  const query = new URLSearchParams();
  if (params?.from?.trim()) query.set("from", params.from.trim());
  if (params?.to?.trim()) query.set("to", params.to.trim());
  if (params?.assigneeId?.trim()) query.set("assigneeId", params.assigneeId.trim());
  if (params?.contact?.trim()) query.set("contact", params.contact.trim());
  if (params?.refresh) query.set("refresh", "1");

  const suffix = query.size ? `?${query.toString()}` : "";
  const res = await fetch(`/api/dashboard/suporte/atendimentos${suffix}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const error =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `Falha HTTP ${res.status}`;
    throw new Error(error);
  }

  return adminAtendimentosDataSchema.parse(payload?.data);
}

type AtendimentosData = Awaited<ReturnType<typeof getAtendimentosData>>;

export function SupportAtendimentosSubtab() {
  const todayRange = useMemo(() => buildRangePreset("today"), []);
  const [from, setFrom] = useState(todayRange.from);
  const [to, setTo] = useState(todayRange.to);
  const [assigneeId, setAssigneeId] = useState("");
  const [contact, setContact] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const forceRefreshRef = useRef(false);
  const [data, setData] = useState<AtendimentosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const isManualRefresh = forceRefreshRef.current;
    forceRefreshRef.current = false;

    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    getAtendimentosData({ from, to, assigneeId, contact, refresh: isManualRefresh })
      .then((result) => {
        if (!active) return;
        setData(result);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Falha ao carregar atendimentos.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      active = false;
    };
  }, [from, to, assigneeId, contact, refreshTick]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRefreshTick((current) => current + 1);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const statusBase = useMemo(() => Math.max(data?.totalCount ?? 0, 1), [data?.totalCount]);
  const csatBase = useMemo(() => Math.max(data?.csatResponseCount ?? 0, 1), [data?.csatResponseCount]);
  const waitingCount = useMemo(
    () =>
      (data?.statusCounts ?? [])
        .filter((item) => item.status === "Aguardando cliente" || item.status === "Aguardando interno")
        .reduce((sum, item) => sum + item.count, 0),
    [data?.statusCounts],
  );

  const applyPreset = (preset: "today" | "7d" | "30d") => {
    const next = buildRangePreset(preset);
    setFrom(next.from);
    setTo(next.to);
  };

  const isPresetActive = (preset: "today" | "7d" | "30d") => {
    const range = buildRangePreset(preset);
    return from === range.from && to === range.to;
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="gap-3 pb-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Atendimentos</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/70 px-2.5 py-1">
              <Clock3 className="h-3.5 w-3.5" />
              Atualizado em {formatDateTimeSafe(data?.refreshedAt, "Sem historico")}
            </span>
            <span className="rounded-md border border-border/60 bg-background/70 px-2.5 py-1">
              Cache {data?.cacheTtlSeconds ?? 45}s
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                forceRefreshRef.current = true;
                setRefreshTick((current) => current + 1);
              }}
              disabled={loading || refreshing}
            >
              {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={isPresetActive("today") ? "default" : "outline"}
              size="sm"
              onClick={() => applyPreset("today")}
            >
              Hoje
            </Button>
            <Button
              variant={isPresetActive("7d") ? "default" : "outline"}
              size="sm"
              onClick={() => applyPreset("7d")}
            >
              Ultimos 7 dias
            </Button>
            <Button
              variant={isPresetActive("30d") ? "default" : "outline"}
              size="sm"
              onClick={() => applyPreset("30d")}
            >
              Ultimos 30 dias
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="atendimentos-from">De</Label>
              <Input id="atendimentos-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="atendimentos-to">Ate</Label>
              <Input id="atendimentos-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Atendente</Label>
              <Select value={assigneeId || "__all__"} onValueChange={(value) => setAssigneeId(value === "__all__" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {(data?.assigneeOptions ?? []).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="atendimentos-contact">Contato</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="atendimentos-contact"
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                  placeholder="Nome, telefone ou identificador"
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {data?.warning ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{data.warning}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <DashboardMetricCard title="Total" value={data?.totalCount ?? 0} helper="Atendimentos no periodo" icon={Inbox as any} tone="blue" />
        <DashboardMetricCard title="Em andamento" value={data?.openCount ?? 0} helper="Fila operacional ativa" icon={UserRound as any} tone="amber" />
        <DashboardMetricCard title="Aguardando" value={waitingCount} helper="Cliente ou retorno interno" icon={Users as any} tone="blue" />
        <DashboardMetricCard title="CSAT medio" value={formatScore(data?.csatAverageScore ?? null)} helper={`${data?.csatResponseCount ?? 0} resposta(s)`} icon={MessageSquareText as any} tone="emerald" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <ActivityChart
          title="Volume de atendimentos"
          description={loading ? "Carregando periodo selecionado" : "Conversas criadas no periodo filtrado"}
          points={data?.activity ?? []}
          badgeLabel="Chatwoot"
          emptyLabel="Sem conversas no recorte"
        />

        <div className="grid gap-4">
          <SectionCard
            title="Ritmo operacional"
            className="border-border/50 bg-card"
            contentClassName="space-y-3 text-sm"
          >
            <ExecutiveLine
              label="Sem responsavel"
              value={`${data?.unassignedCount ?? 0}`}
              emphasis={(data?.unassignedCount ?? 0) > 0 ? "text-red-500" : "text-foreground"}
            />
            <ExecutiveLine label="Aguardando cliente" value={`${(data?.statusCounts ?? []).find((item) => item.status === "Aguardando cliente")?.count ?? 0}`} />
            <ExecutiveLine label="Aguardando interno" value={`${(data?.statusCounts ?? []).find((item) => item.status === "Aguardando interno")?.count ?? 0}`} />
            <ExecutiveLine label="Primeira resposta" value={formatMinutes(data?.avgFirstResponseMinutes ?? null)} />
            <ExecutiveLine label="Resolucao media" value={formatHours(data?.avgResolutionHours ?? null)} />
          </SectionCard>

          <SectionCard
            title="Encerramentos"
            className="border-border/50 bg-card"
            contentClassName="space-y-3 text-sm"
          >
            <ExecutiveLine label="Resolvidos" value={`${data?.resolvedCount ?? 0}`} />
            <ExecutiveLine
              label="Cancelados"
              value={`${data?.cancelledCount ?? 0}`}
              emphasis={(data?.cancelledCount ?? 0) > 0 ? "text-amber-500" : "text-foreground"}
            />
            <ExecutiveLine label="Cancelado cliente" value={`${data?.cancelledByCustomerCount ?? 0}`} />
            <ExecutiveLine label="Cancelado agente" value={`${data?.cancelledByAgentCount ?? 0}`} />
            <ExecutiveLine label="Spam" value={`${data?.spamCount ?? 0}`} />
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard
          title="Saude do CSAT"
          className="border-border/50 bg-card"
          contentClassName="space-y-3 text-sm"
        >
          <ExecutiveLine label="Respondido" value={`${data?.csatResponseCount ?? 0} · ${formatPercent(data?.csatResponseCount ?? 0, data?.csatEligibleResolvedCount ?? 0)}`} />
          <ExecutiveLine label="Elegivel" value={`${data?.csatEligibleResolvedCount ?? 0}`} />
          <ExecutiveLine
            label="Notas baixas"
            value={`${data?.csatLowScoreCount ?? 0} · ${formatPercent(data?.csatLowScoreCount ?? 0, data?.csatResponseCount ?? 0)}`}
            emphasis={(data?.csatLowScoreCount ?? 0) > 0 ? "text-red-500" : "text-foreground"}
          />
          <ExecutiveLine label="CSAT ignorado" value={`${data?.csatSkippedCount ?? 0}`} />
        </SectionCard>

        <SectionCard
          title="Risco operacional"
          className="border-border/50 bg-card"
          contentClassName="space-y-3 text-sm"
        >
          <ExecutiveLine
            label="Sem responsavel"
            value={`${data?.unassignedCount ?? 0}`}
            emphasis={(data?.unassignedCount ?? 0) > 0 ? "text-red-500" : "text-foreground"}
          />
          <ExecutiveLine
            label="Notas baixas"
            value={`${data?.csatLowScoreCount ?? 0}`}
            emphasis={(data?.csatLowScoreCount ?? 0) > 0 ? "text-amber-500" : "text-foreground"}
          />
          <ExecutiveLine label="Cancelados" value={`${data?.cancelledCount ?? 0}`} />
          <ExecutiveLine label="Sem vinculo" value={`${data?.unlinkedCount ?? 0}`} />
        </SectionCard>

        <SectionCard
          title="Cobertura"
          className="border-border/50 bg-card"
          contentClassName="space-y-3 text-sm"
        >
          <ExecutiveLine label="Atendentes ativos" value={`${data?.assigneeLoads?.length ?? 0}`} />
          <ExecutiveLine label="Top contatos" value={`${data?.topContacts?.length ?? 0}`} />
          <ExecutiveLine label="Canais ativos" value={`${(data?.channelCounts ?? []).filter((item) => item.count > 0).length}`} />
          <ExecutiveLine label="Faixas CSAT" value={`${(data?.csatScoreDistribution ?? []).filter((item) => item.count > 0).length}`} />
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard
          title="Status da fila"
          className="border-border/50 bg-card xl:col-span-2"
          contentClassName="grid gap-3 lg:grid-cols-2"
        >
          {(data?.statusCounts ?? []).map((item) => (
            <div key={item.status} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{item.status}</span>
                <span className="font-medium tabular-nums">{item.count}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary/70" style={{ width: `${Math.min(100, (item.count / statusBase) * 100)}%` }} />
              </div>
            </div>
          ))}
        </SectionCard>

        <SectionCard
          title="Canais"
          className="border-border/50 bg-card"
          contentClassName="space-y-3"
        >
          {(data?.channelCounts ?? []).map((item) => (
            <ExecutiveLine key={item.channel} label={item.channel} value={`${item.count} · ${formatPercent(item.count, data?.totalCount ?? 0)}`} />
          ))}
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Carga por atendente"
          className="border-border/50 bg-card"
          contentClassName="space-y-3"
        >
          {(data?.assigneeLoads ?? []).length ? (
            (data?.assigneeLoads ?? []).map((item) => (
              <ExecutiveLine key={`${item.userId ?? "none"}-${item.name}`} label={item.name} value={`${item.openCount} abertas · ${item.waitingCount} aguardando`} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sem atendentes identificados no recorte.</p>
          )}
        </SectionCard>

        <SectionCard
          title="CSAT por atendente"
          className="border-border/50 bg-card"
          contentClassName="space-y-3"
        >
          {(data?.csatAgentPerformance ?? []).length ? (
            (data?.csatAgentPerformance ?? []).map((item) => (
              <ExecutiveLine
                key={`${item.agentId ?? "none"}-${item.agentName}`}
                label={item.agentName}
                value={`${formatScore(item.averageScore)} · ${item.responseCount} resp. · ${item.lowScoreCount} baixas`}
                emphasis={item.lowScoreCount > 0 ? "text-amber-500" : "text-foreground"}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sem respostas de CSAT no recorte.</p>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Distribuicao do CSAT"
          className="border-border/50 bg-card"
          contentClassName="space-y-3"
        >
          {(data?.csatScoreDistribution ?? []).map((item) => (
            <div key={item.score} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Nota {item.score}</span>
                <span className="font-medium tabular-nums">{item.count}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary/70" style={{ width: `${Math.min(100, (item.count / csatBase) * 100)}%` }} />
              </div>
            </div>
          ))}
        </SectionCard>

        <SectionCard
          title="Contatos mais recorrentes"
          className="border-border/50 bg-card"
          contentClassName="space-y-3"
        >
          {(data?.topContacts ?? []).length ? (
            (data?.topContacts ?? []).map((item) => (
              <ExecutiveLine key={item.key} label={item.name} value={`${item.count} atend. · ${item.channel}`} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sem contatos identificados no recorte.</p>
          )}
        </SectionCard>
      </div>

      {!loading && (data?.unassignedCount ?? 0) > 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Existem atendimentos sem responsavel neste recorte. Vale revisar distribuicao e ownership da fila.</span>
        </div>
      ) : null}
    </div>
  );
}
