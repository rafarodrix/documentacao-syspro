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
import { Clock3, Loader2, RefreshCw, Search } from "lucide-react";
import { ErrorState, StaleState } from "@/components/patterns";
import { formatDateTimeSafe } from "@/lib/date";
import { getAtendimentosData } from "../../application/client";
import { SupportCustomerAnalysis } from "./support-customer-analysis";
import { SupportDataQualityBanner } from "./support-data-quality-banner";
import { SupportOverviewCards } from "./support-overview-cards";
import { SupportPriorityQueueTable } from "./support-priority-queue-table";
import { SupportQualityCsat } from "./support-quality-csat";
import { SupportTeamWorkload } from "./support-team-workload";
import { SupportVolumeBacklogChart } from "./support-volume-backlog-chart";

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

type AtendimentosData = Awaited<ReturnType<typeof getAtendimentosData>>;

export function SupportAtendimentosDashboard() {
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

  const triggerRefresh = () => {
    forceRefreshRef.current = true;
    setRefreshTick((current) => current + 1);
  };

  const applyPreset = (preset: "today" | "7d" | "30d") => {
    const next = buildRangePreset(preset);
    setFrom(next.from);
    setTo(next.to);
    if (preset === "7d" || preset === "30d") {
      setAssigneeId("");
      setContact("");
    }
  };

  const isPresetActive = (preset: "today" | "7d" | "30d") => {
    const range = buildRangePreset(preset);
    return from === range.from && to === range.to;
  };

  const activePreset = isPresetActive("today")
    ? "today"
    : isPresetActive("7d")
      ? "7d"
      : isPresetActive("30d")
        ? "30d"
        : "custom";

  const shouldHideDetailFilters = activePreset === "7d" || activePreset === "30d";

  const staleMessage = data?.warning ?? (error && data ? error : null);
  const hasHardError = Boolean(error && !data);

  return (
    <div className="space-y-6">
      {/* Filter Control Header */}
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="gap-3 pb-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
              Painel de Operações
            </p>
            <CardTitle className="text-base font-bold">Atendimentos Chatwoot</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/70 px-2.5 py-1">
              <Clock3 className="h-3.5 w-3.5" />
              Atualizado em {formatDateTimeSafe(data?.refreshedAt, "Sem histórico")}
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
              Últimos 7 dias
            </Button>
            <Button variant={isPresetActive("30d") ? "default" : "outline"} size="sm" onClick={() => applyPreset("30d")}>
              Últimos 30 dias
            </Button>
          </div>

          {shouldHideDetailFilters ? null : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="atendimentos-from">De</Label>
                <Input id="atendimentos-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="atendimentos-to">Até</Label>
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
          )}
        </CardContent>
      </Card>

      {staleMessage ? (
        <StaleState
          title={data?.warning ? "Chatwoot em contingência parcial" : "Último snapshot preservado"}
          message={staleMessage}
        />
      ) : null}

      {hasHardError ? (
        <ErrorState
          title="Falha na carga"
          description={error ?? "Não foi possível carregar os atendimentos do Chatwoot."}
          action={{ label: "Tentar novamente", onClick: triggerRefresh }}
          className="rounded-xl border border-rose-500/20 bg-rose-500/5"
        />
      ) : null}

      {!data ? null : (
        <>
          {/* Section A: Resumo Operacional (5 Cards) */}
          <SupportOverviewCards
            operation={data.operation}
            openCountFallback={data.openCount}
            unassignedCountFallback={data.unassignedCount}
            delayedOpenCountFallback={data.delayedOpenCount}
            slaFirstResponsePctFallback={data.slaFirstResponsePct}
            avgFirstResponseMinutesFallback={data.avgFirstResponseMinutes}
          />

          {/* Section B: Tendência de Volume e Backlog */}
          <SupportVolumeBacklogChart
            activity={data.activity ?? []}
            totalCount={data.totalCount}
            resolvedCount={data.resolvedCount}
            openCount={data.openCount}
            loading={loading}
          />

          {/* Section C: Fila Prioritária exigindo ação */}
          <SupportPriorityQueueTable
            items={data.priorityQueue ?? []}
            unassignedConversationsFallback={data.unassignedConversations}
          />

          {/* Section D: Equipe & Carga */}
          <SupportTeamWorkload
            assigneeLoads={data.assigneeLoads ?? []}
            medianFirstResponseMinutes={data.medianFirstResponseMinutes}
            medianResolutionHours={data.medianResolutionHours}
          />

          {/* Section E: Qualidade / CSAT */}
          <SupportQualityCsat
            csatAverageScore={data.csatAverageScore}
            csatResponseCount={data.csatResponseCount}
            csatEligibleResolvedCount={data.csatEligibleResolvedCount}
            csatLowScoreCount={data.csatLowScoreCount}
            csatScoreDistribution={data.csatScoreDistribution ?? []}
            csatAgentPerformance={data.csatAgentPerformance ?? []}
          />

          {/* Section F: Clientes, Categorias e Causas */}
          <SupportCustomerAnalysis
            topCompanies={data.topCompanies ?? []}
            topContacts={data.topContacts ?? []}
            categories={data.categories ?? []}
            topTags={data.topTags ?? []}
          />

          {/* Section G: Alerta de Qualidade dos Dados */}
          <SupportDataQualityBanner
            unlinkedCount={data.unlinkedCount}
            dataQuality={data.dataQuality}
          />
        </>
      )}
    </div>
  );
}
