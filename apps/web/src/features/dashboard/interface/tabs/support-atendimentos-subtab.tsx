"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { ErrorState, SectionCard, StaleState } from "@/components/patterns";
import { ActivityChart } from "@/components/platform/app/dashboard/activity-chart";
import { formatDateTimeSafe } from "@/lib/date";
import { formatNumber } from "@/lib/formatters";
import { getAtendimentosData } from "../../application/client";
import { DashboardMetricGrid } from "../components/dashboard-metric-grid";
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

function formatMinutes(value: number | null | undefined) {
  if (value == null) return "Sem base";
  return `${formatNumber(value, { maximumFractionDigits: value % 1 === 0 ? 0 : 1 })} min`;
}

function getChannelLabel(channel: "WHATSAPP" | "EMAIL" | "PORTAL" | "PHONE") {
  if (channel === "WHATSAPP") return "WhatsApp";
  if (channel === "EMAIL") return "E-mail";
  if (channel === "PORTAL") return "Portal";
  return "Telefone";
}

const STATUS_META: Record<string, { label: string; tone: string }> = {
  Novo: { label: "Novo", tone: "border-sky-500/30 bg-sky-500/15 text-sky-300" },
  "Sem responsavel": { label: "Sem responsavel", tone: "border-rose-500/30 bg-rose-500/15 text-rose-300" },
  Triagem: { label: "Triagem", tone: "border-violet-500/30 bg-violet-500/15 text-violet-300" },
  "Em andamento": { label: "Em atendimento", tone: "border-amber-500/30 bg-amber-500/15 text-amber-300" },
  "Aguardando cliente": { label: "Aguardando cliente", tone: "border-cyan-500/30 bg-cyan-500/15 text-cyan-300" },
  "Aguardando interno": { label: "Em espera interna", tone: "border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-300" },
  Teste: { label: "Teste", tone: "border-indigo-500/30 bg-indigo-500/15 text-indigo-300" },
  Resolvido: { label: "Resolvido", tone: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300" },
  Arquivado: { label: "Arquivado", tone: "border-zinc-500/30 bg-zinc-500/15 text-zinc-300" },
};

type AtendimentosData = Awaited<ReturnType<typeof getAtendimentosData>>;

export function SupportAtendimentosSubtab() {
  const defaultRange = useMemo(() => buildRangePreset("7d"), []);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
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

    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
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

  const csatBase = useMemo(() => Math.max(data?.csatResponseCount ?? 0, 1), [data?.csatResponseCount]);
  const statusHighlights = useMemo(
    () =>
      (data?.statusCounts ?? [])
        .filter((item) => item.count > 0)
        .sort((left, right) => right.count - left.count)
        .slice(0, 6),
    [data?.statusCounts],
  );

  const triggerRefresh = () => {
    forceRefreshRef.current = true;
    setRefreshTick((current) => current + 1);
  };

  const statusCount = (status: string) =>
    (data?.statusCounts ?? []).find((item) => item.status === status)?.count ?? 0;

  const channelCount = (channel: "WHATSAPP" | "EMAIL" | "PORTAL" | "PHONE") =>
    (data?.channelCounts ?? []).find((item) => item.channel === channel)?.count ?? 0;

  const staleMessage = data?.warning ?? (error && data ? error : null);
  const hasHardError = Boolean(error && !data);

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
    <div className="space-y-5">
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="gap-3 pb-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
              Controle do recorte
            </p>
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
              onClick={triggerRefresh}
              disabled={loading || refreshing}
            >
              {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant={isPresetActive("today") ? "default" : "outline"} size="sm" onClick={() => applyPreset("today")}>
              Hoje
            </Button>
            <Button variant={isPresetActive("7d") ? "default" : "outline"} size="sm" onClick={() => applyPreset("7d")}>
              Ultimos 7 dias
            </Button>
            <Button variant={isPresetActive("30d") ? "default" : "outline"} size="sm" onClick={() => applyPreset("30d")}>
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

      {staleMessage ? (
        <StaleState
          title={data?.warning ? "Chatwoot em contingencia parcial" : "Ultimo snapshot preservado"}
          message={staleMessage}
        />
      ) : null}

      {hasHardError ? (
        <ErrorState
          title="Falha na carga"
          description={error ?? "Nao foi possivel carregar os atendimentos do Chatwoot."}
          action={{ label: "Tentar novamente", onClick: triggerRefresh }}
          className="rounded-xl border border-rose-500/20 bg-rose-500/5"
        />
      ) : null}

      {!data ? null : (
        <>
      <DashboardMetricGrid
        className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5"
        metrics={[
          { title: "Total", value: data.totalCount, helper: "Conversas carregadas no recorte", icon: "inbox", tone: "blue" },
          { title: "Em aberto", value: data.openCount, helper: "Fila ativa no momento", icon: "loader", tone: "amber" },
          { title: "Sem responsavel", value: data.unassignedCount, helper: "Atribuicao pendente", icon: "shieldAlert", tone: data.unassignedCount > 0 ? "red" : "blue" },
          {
            title: "Abertos > 3 dias",
            value: data.delayedOpenCount ?? 0,
            helper: `${data.backlog?.over7d ?? 0} com mais de 7 dias`,
            icon: "alertTriangle",
            tone: (data.delayedOpenCount ?? 0) > 0 ? "red" : "emerald",
          },
          {
            title: "SLA 1a resposta",
            value: data.slaFirstResponsePct != null ? `${data.slaFirstResponsePct}%` : "Sem base",
            helper: `Media ${formatMinutes(data.avgFirstResponseMinutes)}`,
            icon: "clock",
            tone: (data.slaFirstResponsePct ?? 0) >= 80 ? "emerald" : "amber",
          },
        ]}
      />

      <ActivityChart
        title="Volume de atendimentos"
        description={loading ? "Carregando periodo selecionado" : "Conversas criadas no periodo filtrado"}
        points={data.activity ?? []}
        badgeLabel="Chatwoot"
        emptyLabel="Sem conversas no recorte"
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Fila operacional"
          className="border-border/50 bg-card/60 shadow-sm backdrop-blur"
          contentClassName="grid gap-4 text-sm sm:grid-cols-2"
        >
          <div className="space-y-3.5">
            <ExecutiveLine label="Abertos hoje" value={`${data.backlog?.today ?? 0}`} />
            <ExecutiveLine label="Mais de 1 dia" value={`${data.backlog?.over1d ?? 0}`} />
            <ExecutiveLine
              label="Mais de 3 dias"
              value={`${data.backlog?.over3d ?? 0}`}
              emphasis={(data.backlog?.over3d ?? 0) > 0 ? "font-bold text-amber-500" : undefined}
            />
            <ExecutiveLine
              label="Mais de 7 dias"
              value={`${data.backlog?.over7d ?? 0}`}
              emphasis={(data.backlog?.over7d ?? 0) > 0 ? "font-bold text-rose-500" : undefined}
            />
          </div>
          <div className="space-y-3.5 border-t border-border/30 pt-3.5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <ExecutiveLine label="Resolvidos" value={`${data.resolvedCount}`} />
            <ExecutiveLine label="Cancelados" value={`${data.cancelledCount}`} />
            <ExecutiveLine
              label="Sem vinculo Syspro"
              value={`${data.unlinkedCount}`}
              emphasis={data.unlinkedCount > 0 ? "font-bold text-amber-500" : undefined}
            />
            <ExecutiveLine
              label="SLA resolucao"
              value={data.slaResolutionPct != null ? `${data.slaResolutionPct}%` : "Sem base"}
              emphasis={(data.slaResolutionPct ?? 0) >= 80 ? "font-bold text-emerald-500" : undefined}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Canais e status dominantes"
          className="border-border/50 bg-card/60 shadow-sm backdrop-blur"
          contentClassName="space-y-4"
        >
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <ExecutiveLine label="WhatsApp" value={`${channelCount("WHATSAPP")}`} />
            <ExecutiveLine label="Portal" value={`${channelCount("PORTAL")}`} />
            <ExecutiveLine label="E-mail" value={`${channelCount("EMAIL")}`} />
            <ExecutiveLine label="Telefone" value={`${channelCount("PHONE")}`} />
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <ExecutiveLine label="Aguardando cliente" value={`${statusCount("Aguardando cliente")}`} />
            <ExecutiveLine label="Em espera interna" value={`${statusCount("Aguardando interno")}`} />
            <ExecutiveLine label="Sem responsavel" value={`${statusCount("Sem responsavel")}`} />
            <ExecutiveLine label="Arquivados" value={`${statusCount("Arquivado")}`} />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Status do Chatwoot" className="border-border/50 bg-card/60 shadow-sm backdrop-blur" contentClassName="space-y-4">
        <div className="flex flex-wrap gap-2">
          {statusHighlights.length ? (
            statusHighlights.map((item) => {
              const meta = STATUS_META[item.status] ?? {
                label: item.status,
                tone: "border-border/60 bg-muted/30 text-foreground",
              };
              return (
                <div key={item.status} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${meta.tone}`}>
                  <span>{meta.label}</span>
                  <span className="tabular-nums text-foreground">{item.count}</span>
                </div>
              );
            })
          ) : (
            <span className="text-sm text-muted-foreground">Sem status relevantes no recorte.</span>
          )}
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Categorias recorrentes"
          className="border-border/50 bg-card/60 shadow-sm backdrop-blur"
          contentClassName="space-y-3"
        >
          {(data.categories ?? []).length ? (
            data.categories.slice(0, 6).map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-semibold tabular-nums text-foreground">{item.count}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sem categorias relevantes no recorte.</p>
          )}
        </SectionCard>

        <SectionCard
          title="Tags operacionais"
          className="border-border/50 bg-card/60 shadow-sm backdrop-blur"
          contentClassName="space-y-3"
        >
          {(data.topTags ?? []).length ? (
            data.topTags.slice(0, 6).map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-semibold tabular-nums text-foreground">{item.count}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sem tags relevantes no recorte.</p>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Produtividade da equipe" className="border-border/50 bg-card/60 shadow-sm backdrop-blur" contentClassName="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border/40 text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Atendente</th>
              <th className="px-4 py-3 text-center font-semibold">Em aberto</th>
              <th className="px-4 py-3 text-center font-semibold">Em espera</th>
              <th className="px-4 py-3 text-center font-semibold">Resolvidos</th>
              <th className="px-4 py-3 text-center font-semibold">1a resposta</th>
              <th className="px-4 py-3 text-center font-semibold">CSAT medio</th>
              <th className="px-4 py-3 text-center font-semibold">Respostas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {(data.assigneeLoads ?? []).length ? (
              (data.assigneeLoads ?? []).map((item) => {
                let scoreColor = "text-foreground font-semibold";
                if (item.averageScore != null) {
                  if (item.averageScore >= 4.5) scoreColor = "text-emerald-500 font-bold";
                  else if (item.averageScore < 3.5) scoreColor = "text-rose-500 font-bold";
                  else scoreColor = "text-amber-500 font-semibold";
                }

                return (
                  <tr key={`${item.userId ?? "none"}-${item.name}`} className="transition-colors hover:bg-muted/20">
                    <td className="flex items-center gap-2 px-4 py-3.5 font-medium text-foreground">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      {item.name}
                    </td>
                    <td className="px-4 py-3.5 text-center font-semibold tabular-nums">{item.openCount}</td>
                    <td className="px-4 py-3.5 text-center text-muted-foreground tabular-nums">{item.waitingCount}</td>
                    <td className="px-4 py-3.5 text-center text-muted-foreground tabular-nums">{item.resolvedCount ?? 0}</td>
                    <td className="px-4 py-3.5 text-center text-xs text-muted-foreground tabular-nums">
                      {formatMinutes(item.avgFirstResponseMinutes)}
                    </td>
                    <td className={`px-4 py-3.5 text-center tabular-nums ${scoreColor}`}>
                      {item.averageScore != null ? formatScore(item.averageScore) : "Sem nota"}
                    </td>
                    <td className="px-4 py-3.5 text-center text-xs text-muted-foreground tabular-nums">
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

      {data.unassignedConversations?.length ? (
        <SectionCard
          title="Conversas sem responsavel"
          className="border-border/50 bg-card/60 shadow-sm backdrop-blur"
          contentClassName="overflow-x-auto"
        >
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border/40 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Referencia</th>
                <th className="px-4 py-3 font-semibold">Contato</th>
                <th className="px-4 py-3 font-semibold">Assunto</th>
                <th className="px-4 py-3 text-center font-semibold">Canal</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Ultima atividade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {data.unassignedConversations.slice(0, 8).map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-muted/10">
                  <td className="px-4 py-3.5 font-semibold text-foreground">{item.reference}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{item.contactName}</td>
                  <td className="max-w-[380px] px-4 py-3.5 text-foreground">{item.subject}</td>
                  <td className="px-4 py-3.5 text-center text-muted-foreground">{getChannelLabel(item.channel)}</td>
                  <td className="px-4 py-3.5 text-center text-muted-foreground">{item.status}</td>
                  <td className="px-4 py-3.5 text-right text-muted-foreground">
                    {formatDateTimeSafe(item.lastUpdate, "Sem historico")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Saude do CSAT" className="border-border/50 bg-card/60 shadow-sm backdrop-blur" contentClassName="grid gap-4 text-sm sm:grid-cols-2">
          <div className="space-y-3.5">
            <ExecutiveLine label="CSAT medio" value={formatScore(data.csatAverageScore ?? null)} emphasis="text-base font-extrabold text-emerald-500" />
            <ExecutiveLine label="Conversas elegiveis" value={`${data.csatEligibleResolvedCount ?? 0}`} />
            <ExecutiveLine label="Respostas recebidas" value={`${data.csatResponseCount ?? 0}`} />
            <ExecutiveLine label="Taxa de resposta" value={formatPercent(data.csatResponseCount ?? 0, data.csatEligibleResolvedCount ?? 0)} />
          </div>
          <div className="space-y-3.5 border-t border-border/30 pt-3.5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <ExecutiveLine
              label="Notas baixas (<= 2)"
              value={`${data.csatLowScoreCount ?? 0}`}
              emphasis={(data.csatLowScoreCount ?? 0) > 0 ? "font-bold text-rose-500" : "text-muted-foreground"}
            />
            <ExecutiveLine label="Avaliacoes ignoradas" value={`${data.csatSkippedCount ?? 0}`} />
            <ExecutiveLine
              label="Satisfacao alta (4 e 5)"
              value={(() => {
                const highCount = (data.csatScoreDistribution ?? [])
                  .filter((item) => item.score >= 4)
                  .reduce((sum, item) => sum + item.count, 0);
                return formatPercent(highCount, data.csatResponseCount ?? 0);
              })()}
              emphasis="font-bold text-emerald-500"
            />
            <p className="text-[11px] leading-snug text-muted-foreground/80">
              {(() => {
                const note5 = (data.csatScoreDistribution ?? []).find((item) => item.score === 5)?.count ?? 0;
                return `${note5} de ${data.csatResponseCount ?? 0} avaliacoes foram nota 5.`;
              })()}
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Distribuicao das notas" className="border-border/50 bg-card/60 shadow-sm backdrop-blur" contentClassName="space-y-3">
          {([...(data.csatScoreDistribution ?? [])].sort((left, right) => right.score - left.score)).map((item) => (
            <div key={item.score} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-muted-foreground">Nota {item.score}</span>
                <span className="font-bold text-foreground tabular-nums">{item.count}</span>
              </div>
              <div className="h-2 rounded-full bg-muted/30">
                <div
                  className="h-2 rounded-full bg-emerald-500/70 transition-all duration-500"
                  style={{ width: `${Math.min(100, (item.count / csatBase) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Contatos com mais atendimentos (Top 10)" className="border-border/50 bg-card/60 shadow-sm backdrop-blur" contentClassName="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border/40 font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2.5">Contato</th>
                <th className="px-3 py-2.5 text-center">Volume</th>
                <th className="px-3 py-2.5">Canal preferencial</th>
                <th className="px-3 py-2.5">Ultimo contato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {(data.topContacts ?? []).length ? (
                (data.topContacts ?? []).map((item) => (
                  <tr key={item.key} className="transition-colors hover:bg-muted/10">
                    <td className="flex items-center gap-1.5 px-3 py-3 font-semibold text-foreground">
                      <span className="text-primary">*</span> {item.name}
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-amber-500 tabular-nums">{item.count} atend.</td>
                    <td className="px-3 py-3 text-muted-foreground">{getChannelLabel(item.channel)}</td>
                    <td className="px-3 py-3 font-medium text-foreground">{item.lastAttendance ?? "Sem registro"}</td>
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

        <SectionCard title="Empresas com mais atendimentos (Top 10)" className="border-border/50 bg-card/60 shadow-sm backdrop-blur" contentClassName="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border/40 font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2.5">Empresa</th>
                <th className="px-3 py-2.5 text-center">Volume</th>
                <th className="px-3 py-2.5">Canal preferencial</th>
                <th className="px-3 py-2.5">Ultimo contato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {(data.topCompanies ?? []).length ? (
                (data.topCompanies ?? []).map((item) => (
                  <tr key={item.key} className="transition-colors hover:bg-muted/10">
                    <td className="flex items-center gap-1.5 px-3 py-3 font-semibold text-foreground">
                      <span className="text-emerald-500">*</span> {item.name}
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-emerald-500 tabular-nums">{item.count} atend.</td>
                    <td className="px-3 py-3 text-muted-foreground">{getChannelLabel(item.channel)}</td>
                    <td className="px-3 py-3 font-medium text-foreground">{item.lastAttendance ?? "Sem registro"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted-foreground">
                    Sem empresas identificadas no recorte.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </SectionCard>
      </div>
        </>
      )}
    </div>
  );
}
