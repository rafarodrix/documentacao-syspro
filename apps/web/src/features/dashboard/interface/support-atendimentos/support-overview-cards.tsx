"use client";

import { MetricValue } from "@dosc-syspro/contracts/dashboard";
import { Card, CardContent, CardHeader, CardTitle, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@dosc-syspro/ui";
import { AlertTriangle, Clock, HelpCircle, Inbox, ShieldAlert, TrendingDown, TrendingUp, UserX } from "lucide-react";
import { formatNumber } from "@/lib/formatters";

type SupportOverviewCardsProps = {
  operation?: {
    openNow: MetricValue;
    unassignedNow: MetricValue;
    waitingCustomerNow: MetricValue;
    slaAtRiskNow: MetricValue;
    slaBreachedNow: MetricValue;
    firstResponseMedianMinutes: MetricValue;
  };
  openCountFallback: number;
  unassignedCountFallback: number;
  delayedOpenCountFallback?: number;
  slaFirstResponsePctFallback?: number | null;
  avgFirstResponseMinutesFallback?: number | null;
  onFilterUnassigned?: () => void;
  onFilterBreached?: () => void;
};

function formatMinutes(value: number | null | undefined) {
  if (value == null) return "Sem base";
  return `${formatNumber(value, { maximumFractionDigits: value % 1 === 0 ? 0 : 1 })} min`;
}

function MetricCardWithTooltip({
  title,
  value,
  previousValue,
  variationPercent,
  trend,
  definition,
  icon: Icon,
  tone,
  onClick,
}: {
  title: string;
  value: string | number;
  previousValue?: number | null;
  variationPercent?: number | null;
  trend?: "up" | "down" | "stable" | "unavailable";
  definition: string;
  icon: React.ElementType;
  tone: "amber" | "rose" | "sky" | "emerald" | "violet";
  onClick?: () => void;
}) {
  const toneClasses = {
    amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    sky: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    violet: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  };

  return (
    <Card
      className={`border-border/60 bg-linear-to-b from-card to-card/90 shadow-sm transition-all hover:border-border/80 ${onClick ? "cursor-pointer hover:shadow-md" : ""}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 pb-2 pt-3.5">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground/60 hover:text-foreground">
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {definition}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${toneClasses[tone]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-1.5 px-4 pb-3.5">
        <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
          {value}
        </div>

        {variationPercent != null ? (
          <div className="flex items-center gap-1 text-xs">
            {variationPercent > 0 ? (
              <span className="flex items-center font-medium text-rose-500">
                <TrendingUp className="mr-0.5 h-3 w-3" />+{variationPercent}%
              </span>
            ) : variationPercent < 0 ? (
              <span className="flex items-center font-medium text-emerald-500">
                <TrendingDown className="mr-0.5 h-3 w-3" />
                {variationPercent}%
              </span>
            ) : (
              <span className="text-muted-foreground">Estavel</span>
            )}
            <span className="text-[11px] text-muted-foreground">vs periodo anterior</span>
          </div>
        ) : previousValue != null ? (
          <div className="text-[11px] text-muted-foreground">
            Anterior: {previousValue}
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground">Fila ativa em tempo real</div>
        )}
      </CardContent>
    </Card>
  );
}

export function SupportOverviewCards({
  operation,
  openCountFallback,
  unassignedCountFallback,
  delayedOpenCountFallback = 0,
  slaFirstResponsePctFallback,
  avgFirstResponseMinutesFallback,
  onFilterUnassigned,
  onFilterBreached,
}: SupportOverviewCardsProps) {
  const openNowValue = operation?.openNow?.value ?? openCountFallback;
  const unassignedValue = operation?.unassignedNow?.value ?? unassignedCountFallback;
  const waitingCustomerValue = operation?.waitingCustomerNow?.value ?? 0;
  const slaBreachedValue = operation?.slaBreachedNow?.value ?? delayedOpenCountFallback;
  const slaAtRiskValue = operation?.slaAtRiskNow?.value ?? 0;
  const firstResponseMedianValue = operation?.firstResponseMedianMinutes?.value ?? avgFirstResponseMinutesFallback;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <MetricCardWithTooltip
        title="Em aberto agora"
        value={openNowValue}
        previousValue={operation?.openNow?.previousValue}
        variationPercent={operation?.openNow?.variationPercent}
        trend={operation?.openNow?.trend}
        definition="Quantidade atual de conversas ativas no Chatwoot aguardando atendimento ou em andamento."
        icon={Inbox}
        tone="amber"
      />

      <MetricCardWithTooltip
        title="Sem responsável"
        value={unassignedValue}
        previousValue={operation?.unassignedNow?.previousValue}
        variationPercent={operation?.unassignedNow?.variationPercent}
        trend={operation?.unassignedNow?.trend}
        definition="Conversas ativas na fila que ainda não foram atribuídas a nenhum atendente da equipe."
        icon={UserX}
        tone={unassignedValue > 0 ? "rose" : "sky"}
        onClick={onFilterUnassigned}
      />

      <MetricCardWithTooltip
        title="Aguardando cliente"
        value={waitingCustomerValue}
        previousValue={operation?.waitingCustomerNow?.previousValue}
        variationPercent={operation?.waitingCustomerNow?.variationPercent}
        trend={operation?.waitingCustomerNow?.trend}
        definition="Conversas ativas onde a equipe respondeu e o fluxo está pendente de retorno do cliente."
        icon={Clock}
        tone="violet"
      />

      <MetricCardWithTooltip
        title="SLA em risco / violado"
        value={slaBreachedValue > 0 ? `${slaBreachedValue} violados` : `${slaAtRiskValue} em risco`}
        previousValue={operation?.slaBreachedNow?.previousValue}
        variationPercent={operation?.slaBreachedNow?.variationPercent}
        trend={operation?.slaBreachedNow?.trend}
        definition="Conversas com tempo de resposta ou resolução excedido ou prestes a estourar a meta do SLA."
        icon={ShieldAlert}
        tone={slaBreachedValue > 0 ? "rose" : "emerald"}
        onClick={onFilterBreached}
      />

      <MetricCardWithTooltip
        title="1ª Resposta (Mediana)"
        value={formatMinutes(firstResponseMedianValue)}
        previousValue={operation?.firstResponseMedianMinutes?.previousValue}
        variationPercent={operation?.firstResponseMedianMinutes?.variationPercent}
        trend={operation?.firstResponseMedianMinutes?.trend}
        definition="Tempo mediano até o primeiro envio de mensagem pública por um atendente após o contato."
        icon={Clock}
        tone={firstResponseMedianValue && firstResponseMedianValue <= 15 ? "emerald" : "amber"}
      />
    </div>
  );
}
