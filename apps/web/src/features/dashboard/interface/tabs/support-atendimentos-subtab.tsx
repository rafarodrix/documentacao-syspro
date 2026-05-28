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
  Clock3,
  Inbox,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Search,
  ShieldAlert,
  UserRound,
  Users,
  CheckCircle2,
  TrendingUp,
  Tag,
} from "lucide-react";
import { ErrorState, SectionCard, StaleState } from "@/components/patterns";
import { ActivityChart } from "@/components/platform/app/dashboard/activity-chart";
import { formatDateTimeSafe } from "@/lib/date";
import { formatNumber } from "@/lib/formatters";
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
  if (value < 60) return `${formatNumber(value)} min`;
  return `${formatNumber(value / 60, { maximumFractionDigits: 1 })} h`;
}

function formatHours(value: number | null) {
  if (value === null) return "Sem base";
  if (value < 24) return `${formatNumber(value, { maximumFractionDigits: 1 })} h`;
  return `${formatNumber(value / 24, { maximumFractionDigits: 1 })} d`;
}

function formatPercent(value: number, base: number) {
  if (base <= 0) return "0%";
  return `${Math.round((value / base) * 100)}%`;
}

function formatScore(value: number | null) {
  if (value === null) return "Sem base";
  return formatNumber(value, {
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

      {/* Operational Warning Alert for Unassigned Tickets */}
      {!loading && (data?.unassignedCount ?? 0) > 0 ? (
        <div className="flex items-start gap-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-md p-4 text-rose-200 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-400">Alerta Operacional Crítico</p>
            <p className="text-sm text-rose-200/90 leading-relaxed">
              Existem <span className="font-extrabold text-white text-base">{data?.unassignedCount}</span> atendimentos sem responsável neste período. Isso representa <span className="font-extrabold text-white text-base">
                {data?.totalCount ? Math.round((data.unassignedCount / data.totalCount) * 1000) / 10 : 0}%
              </span> do volume total. Vale revisar a distribuição e ownership imediato da fila.
            </p>
          </div>
        </div>
      ) : null}

      {/* Row 1: Executive Cards (9 Cards) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <DashboardMetricCard title="Total" value={data?.totalCount ?? 0} helper="Geral no período" icon={Inbox as any} tone="blue" />
        <DashboardMetricCard title="Abertos" value={data?.openCount ?? 0} helper="Fila ativa" icon={Loader2 as any} tone="amber" />
        <DashboardMetricCard title="Sem Dono" value={data?.unassignedCount ?? 0} helper="Sem atendente" icon={ShieldAlert as any} tone={(data?.unassignedCount ?? 0) > 0 ? "red" : "blue"} />
        <DashboardMetricCard title="Resolvidos" value={data?.resolvedCount ?? 0} helper="Concluídos" icon={CheckCircle2 as any} tone="emerald" />
        <DashboardMetricCard title="CSAT Médio" value={formatScore(data?.csatAverageScore ?? null)} helper={`${data?.csatResponseCount ?? 0} avaliações`} icon={MessageSquareText as any} tone="emerald" />
        <DashboardMetricCard title="1ª Resposta" value={formatMinutes(data?.avgFirstResponseMinutes ?? null)} helper={data?.slaFirstResponsePct != null ? `${data.slaFirstResponsePct}% no SLA` : "Agilidade"} icon={Clock3 as any} tone="blue" />
        <DashboardMetricCard title="Resolução" value={formatHours(data?.avgResolutionHours ?? null)} helper={data?.slaResolutionPct != null ? `${data.slaResolutionPct}% no SLA` : "Eficiência"} icon={TrendingUp as any} tone="blue" />
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <DashboardMetricCard
          title="Aguardando Cliente"
          value={`${(data?.statusCounts ?? []).find((item) => item.status === "Aguardando cliente")?.count ?? 0}`}
          helper="Retorno do cliente"
          icon={UserRound as any}
          tone="blue"
        />
        <DashboardMetricCard
          title="Aguardando Interno"
          value={`${(data?.statusCounts ?? []).find((item) => item.status === "Aguardando interno")?.count ?? 0}`}
          helper="Retorno da equipe"
          icon={Users as any}
          tone="amber"
        />
      </div>

      {/* Row 2: Charts */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ActivityChart
            title="Volume de atendimentos"
            description={loading ? "Carregando período selecionado" : "Conversas criadas no período filtrado"}
            points={data?.activity ?? []}
            badgeLabel="Chatwoot"
            emptyLabel="Sem conversas no recorte"
          />
        </div>

        <SectionCard
          title="Situação atual da fila"
          className="border-border/50 bg-card/60 backdrop-blur shadow-sm"
          contentClassName="space-y-4"
        >
          {(data?.statusCounts ?? []).map((item) => {
            let color = "bg-primary/70";
            if (item.status === "Sem responsavel") color = "bg-rose-500/70";
            if (item.status === "Aguardando cliente") color = "bg-sky-500/70";
            if (item.status === "Aguardando interno") color = "bg-amber-500/70";
            if (item.status === "Resolvido") color = "bg-emerald-500/70";

            return (
              <div key={item.status} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-muted-foreground">{item.status}</span>
                  <span className="font-bold tabular-nums text-foreground">{item.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted/30">
                  <div className={`h-2 rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.min(100, (item.count / statusBase) * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </SectionCard>
      </div>

      {/* Row 3: Operation & SLAs */}
      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard
          title="SLA e Prazos"
          className="border-border/50 bg-card/60 backdrop-blur shadow-sm"
          contentClassName="space-y-3.5 text-sm"
        >
          <ExecutiveLine
            label="Dentro do SLA de 1ª Resposta"
            value={data?.slaFirstResponsePct != null ? `${data.slaFirstResponsePct}%` : "Sem dados"}
            emphasis={data?.slaFirstResponsePct && data.slaFirstResponsePct < 85 ? "text-amber-500 font-bold" : "text-emerald-500 font-bold"}
          />
          <ExecutiveLine label="Tempo Médio de 1ª Resposta" value={formatMinutes(data?.avgFirstResponseMinutes ?? null)} />
          <ExecutiveLine
            label="Resolvidos dentro do Prazo"
            value={data?.slaResolutionPct != null ? `${data.slaResolutionPct}%` : "Sem dados"}
            emphasis={data?.slaResolutionPct && data.slaResolutionPct < 80 ? "text-amber-500 font-bold" : "text-emerald-500 font-bold"}
          />
          <ExecutiveLine label="Tempo Médio de Resolução" value={formatHours(data?.avgResolutionHours ?? null)} />
          <ExecutiveLine
            label="Atendimentos Fora do Prazo (Atrasados)"
            value={`${data?.delayedOpenCount ?? 0}`}
            emphasis={(data?.delayedOpenCount ?? 0) > 0 ? "text-rose-500 font-bold" : "text-muted-foreground"}
          />
        </SectionCard>

        <SectionCard
          title="Backlog (Acúmulo de Abertos)"
          className="border-border/50 bg-card/60 backdrop-blur shadow-sm"
          contentClassName="space-y-3 text-sm"
        >
          <ExecutiveLine label="Abertos hoje" value={`${data?.backlog?.today ?? 0}`} />
          <ExecutiveLine label="Abertos há mais de 1 dia" value={`${data?.backlog?.over1d ?? 0}`} emphasis={(data?.backlog?.over1d ?? 0) > 0 ? "text-amber-500 font-bold" : "text-muted-foreground"} />
          <ExecutiveLine label="Abertos há mais de 3 dias" value={`${data?.backlog?.over3d ?? 0}`} emphasis={(data?.backlog?.over3d ?? 0) > 0 ? "text-orange-500 font-bold" : "text-muted-foreground"} />
          <ExecutiveLine label="Abertos há mais de 7 dias" value={`${data?.backlog?.over7d ?? 0}`} emphasis={(data?.backlog?.over7d ?? 0) > 0 ? "text-rose-500 font-bold" : "text-muted-foreground"} />
        </SectionCard>

        <SectionCard
          title="Pendências e Riscos"
          className="border-border/50 bg-card/60 backdrop-blur shadow-sm"
          contentClassName="space-y-3.5 text-sm"
        >
          <ExecutiveLine
            label="Sem responsável"
            value={`${data?.unassignedCount ?? 0}`}
            emphasis={(data?.unassignedCount ?? 0) > 0 ? "text-rose-500 font-bold" : "text-muted-foreground"}
          />
          <ExecutiveLine
            label="Aguardando interno"
            value={`${(data?.statusCounts ?? []).find((item) => item.status === "Aguardando interno")?.count ?? 0}`}
            emphasis={((data?.statusCounts ?? []).find((item) => item.status === "Aguardando interno")?.count ?? 0) > 0 ? "text-amber-500 font-bold" : "text-muted-foreground"}
          />
          <ExecutiveLine
            label="Cancelados no período"
            value={`${data?.cancelledCount ?? 0}`}
            emphasis={(data?.cancelledCount ?? 0) > 0 ? "text-orange-500 font-bold" : "text-muted-foreground"}
          />
          <div className="pl-3 text-xs text-muted-foreground space-y-1">
            <p>• Cancelados pelo cliente: {data?.cancelledByCustomerCount ?? 0}</p>
            <p>• Cancelados pelo suporte: {data?.cancelledByAgentCount ?? 0}</p>
            <p>• Descartados como Spam: {data?.spamCount ?? 0}</p>
          </div>
        </SectionCard>
      </div>

      {/* Row 4: Equipe (Unified Productivity Table) */}
      <SectionCard
        title="Produtividade da Equipe"
        className="border-border/50 bg-card/60 backdrop-blur shadow-sm"
        contentClassName="overflow-x-auto"
      >
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-border/40 text-muted-foreground text-xs uppercase tracking-wider">
              <th className="py-3 px-4 font-semibold">Atendente</th>
              <th className="py-3 px-4 font-semibold text-center">Abertos</th>
              <th className="py-3 px-4 font-semibold text-center">Resolvidos</th>
              <th className="py-3 px-4 font-semibold text-center">Tempo Resposta</th>
              <th className="py-3 px-4 font-semibold text-center">Tempo Resolução</th>
              <th className="py-3 px-4 font-semibold text-center">Avaliação (CSAT)</th>
              <th className="py-3 px-4 font-semibold text-center">Respostas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {(data?.assigneeLoads ?? []).length ? (
              (data?.assigneeLoads ?? []).map((item) => {
                let scoreColor = "text-foreground font-semibold";
                if (item.averageScore != null) {
                  if (item.averageScore >= 4.5) scoreColor = "text-emerald-500 font-bold";
                  else if (item.averageScore < 3.5) scoreColor = "text-rose-500 font-bold";
                  else scoreColor = "text-amber-500 font-semibold";
                }

                return (
                  <tr key={`${item.userId ?? "none"}-${item.name}`} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-foreground flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      {item.name}
                    </td>
                    <td className="py-3.5 px-4 text-center tabular-nums font-semibold">{item.openCount}</td>
                    <td className="py-3.5 px-4 text-center tabular-nums text-muted-foreground">{item.resolvedCount ?? 0}</td>
                    <td className="py-3.5 px-4 text-center tabular-nums">{formatMinutes(item.avgFirstResponseMinutes ?? null)}</td>
                    <td className="py-3.5 px-4 text-center tabular-nums">{formatHours(item.avgResolutionHours ?? null)}</td>
                    <td className={`py-3.5 px-4 text-center tabular-nums ${scoreColor}`}>
                      {item.averageScore != null ? formatScore(item.averageScore) : "Sem nota"}
                    </td>
                    <td className="py-3.5 px-4 text-center tabular-nums text-xs text-muted-foreground">
                      {item.responseCount ?? 0} resp.
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-6 text-center text-muted-foreground">
                  Sem atendentes identificados no recorte.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SectionCard>

      {/* Row 5: Qualidade (CSAT Health & Score Distribution) */}
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Saúde do CSAT"
          className="border-border/50 bg-card/60 backdrop-blur shadow-sm"
          contentClassName="grid gap-3.5 sm:grid-cols-2 text-sm"
        >
          <div className="space-y-3.5">
            <ExecutiveLine label="CSAT Médio" value={formatScore(data?.csatAverageScore ?? null)} emphasis="text-emerald-500 font-extrabold text-base" />
            <ExecutiveLine label="Conversas Elegíveis" value={`${data?.csatEligibleResolvedCount ?? 0}`} />
            <ExecutiveLine label="Respostas Recebidas" value={`${data?.csatResponseCount ?? 0}`} />
            <ExecutiveLine label="Taxa de Resposta" value={formatPercent(data?.csatResponseCount ?? 0, data?.csatEligibleResolvedCount ?? 0)} />
          </div>
          <div className="space-y-3.5 border-t border-border/30 pt-3.5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
            <ExecutiveLine
              label="Notas Baixas (≤ 2)"
              value={`${data?.csatLowScoreCount ?? 0}`}
              emphasis={(data?.csatLowScoreCount ?? 0) > 0 ? "text-rose-500 font-bold" : "text-muted-foreground"}
            />
            <ExecutiveLine label="Avaliações Ignoradas" value={`${data?.csatSkippedCount ?? 0}`} />
            <ExecutiveLine
              label="Satisfação Alta (4 e 5 ★)"
              value={(() => {
                const highCount = (data?.csatScoreDistribution ?? [])
                  .filter((item) => item.score >= 4)
                  .reduce((sum, item) => sum + item.count, 0);
                return formatPercent(highCount, data?.csatResponseCount ?? 0);
              })()}
              emphasis="text-emerald-500 font-bold"
            />
            <p className="text-[11px] text-muted-foreground/80 leading-snug">
              {(() => {
                const note5 = (data?.csatScoreDistribution ?? []).find(item => item.score === 5)?.count ?? 0;
                return `${note5} de ${data?.csatResponseCount ?? 0} avaliações foram Nota 5 (Excelente).`;
              })()}
            </p>
          </div>
        </SectionCard>

        <SectionCard
          title="Distribuição das Notas"
          className="border-border/50 bg-card/60 backdrop-blur shadow-sm"
          contentClassName="space-y-2.5"
        >
          {([...(data?.csatScoreDistribution ?? [])].sort((l, r) => r.score - l.score)).map((item) => (
            <div key={item.score} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-muted-foreground">Nota {item.score} ★</span>
                <span className="font-bold tabular-nums text-foreground">{item.count}</span>
              </div>
              <div className="h-2 rounded-full bg-muted/30">
                <div className="h-2 rounded-full bg-emerald-500/70 transition-all duration-500" style={{ width: `${Math.min(100, (item.count / csatBase) * 100)}%` }} />
              </div>
            </div>
          ))}
        </SectionCard>
      </div>

      {/* Row 6: Causa Raiz */}
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Causa Raiz & Categorias ERP"
          className="border-border/50 bg-card/60 backdrop-blur shadow-sm"
          contentClassName="space-y-3"
        >
          {(data?.categories ?? []).length ? (
            (data?.categories ?? []).map((item) => (
              <ExecutiveLine
                key={item.name}
                label={item.name.charAt(0).toUpperCase() + item.name.slice(1)}
                value={`${item.count} chamados · ${formatPercent(item.count, data?.totalCount ?? 0)}`}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum chamado categorizado no período.</p>
          )}
        </SectionCard>

        <SectionCard
          title="Contatos Recorrentes (Ownership & Reincidência)"
          className="border-border/50 bg-card/60 backdrop-blur shadow-sm"
          contentClassName="overflow-x-auto"
        >
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">Cliente / Contato</th>
                <th className="py-2.5 px-3 text-center">Frequência</th>
                <th className="py-2.5 px-3">Principal Motivo</th>
                <th className="py-2.5 px-3">Último Contato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {(data?.topContacts ?? []).length ? (
                (data?.topContacts ?? []).map((item) => (
                  <tr key={item.key} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3 px-3 font-semibold text-foreground flex items-center gap-1.5">
                      <span className="text-primary">•</span> {item.name}
                    </td>
                    <td className="py-3 px-3 text-center tabular-nums font-bold text-amber-500">{item.count} atend.</td>
                    <td className="py-3 px-3 text-muted-foreground">{item.motive ?? "Sem categoria"}</td>
                    <td className="py-3 px-3 font-medium text-foreground">{item.lastAttendance ?? "Sem registro"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted-foreground">
                    Sem contatos identificados no recorte.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Origem dos Atendimentos (Canais)"
          className="border-border/50 bg-card/60 backdrop-blur shadow-sm"
          contentClassName="space-y-3"
        >
          {(data?.channelCounts ?? []).map((item) => {
            let label: string = item.channel;
            if (item.channel === "WHATSAPP") label = "WhatsApp 💬";
            if (item.channel === "EMAIL") label = "E-mail ✉️";
            if (item.channel === "PORTAL") label = "Portal Syspro 🌐";
            if (item.channel === "PHONE") label = "Telefone 📞";

            return (
              <ExecutiveLine
                key={item.channel}
                label={label}
                value={`${item.count} atend. · ${formatPercent(item.count, data?.totalCount ?? 0)}`}
              />
            );
          })}
        </SectionCard>

        <SectionCard
          title="Tags Operacionais Mais Usadas"
          className="border-border/50 bg-card/60 backdrop-blur shadow-sm"
          contentClassName="flex flex-wrap gap-2 pt-2"
        >
          {(data?.topTags ?? []).length ? (
            (data?.topTags ?? []).map((item) => (
              <div
                key={item.name}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card px-2.5 py-1 text-xs text-foreground font-semibold hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 cursor-default"
              >
                <Tag className="h-3 w-3 text-primary shrink-0" />
                <span>{item.name}</span>
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary tabular-nums">
                  {item.count}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground w-full text-center py-4">Nenhuma tag operacional identificada.</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
