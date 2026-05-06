import { Clock, FileText, Headset, KeyRound, RadioTower, Sparkles, Users, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardMetricCard, formatCurrency } from "../components/dashboard-metric-card";
import { cn } from "@/lib/utils";
import { getOperacionalData } from "../../application";

type SefazHealth = "online" | "unstable" | "offline" | "unknown";

const sefazIconClasses: Record<SefazHealth, string> = {
  online: "bg-emerald-500/10 text-emerald-500",
  unstable: "bg-amber-500/10 text-amber-500",
  offline: "bg-red-500/10 text-red-500",
  unknown: "bg-muted/50 text-muted-foreground",
};

const sefazTextClasses: Record<SefazHealth, string> = {
  online: "text-emerald-500",
  unstable: "text-amber-500",
  offline: "text-red-500",
  unknown: "text-muted-foreground",
};

const sefazDotClasses: Record<SefazHealth, string> = {
  online: "bg-emerald-500",
  unstable: "animate-pulse bg-amber-500",
  offline: "animate-pulse bg-red-500",
  unknown: "bg-muted-foreground/40",
};

const sefazLabels: Record<SefazHealth, string> = {
  online: "Operacional",
  unstable: "Instável",
  offline: "Offline",
  unknown: "Sem dados",
};

export async function OperacionalTab() {
  const data = await getOperacionalData();
  const { dailyPassword, ticketCounts, sefazHealth, sefazRoutesCount, contracts } = data;

  const openTicketsNow = ticketCounts.total;
  const openTicketsWaiting = ticketCounts.waiting;
  const openTicketsInProgress = ticketCounts.inProgress;
  const openTicketsSupport = ticketCounts.support;
  const openTicketsDevelopment = ticketCounts.development;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card className="border-border/50 bg-muted/30 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between px-4 pb-1.5 pt-4">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Senha do dia</CardTitle>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10">
            <KeyRound className="h-3.5 w-3.5 text-amber-500" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="rounded-lg border border-border/50 bg-background/80 px-3 py-2 text-center font-mono text-lg font-semibold tracking-[0.16em]">
            {dailyPassword?.password ?? "-----"}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Uso operacional interno.</p>
        </CardContent>
      </Card>

      <DashboardMetricCard
        title="Total em aberto"
        value={openTicketsNow}
        helper={`${openTicketsWaiting} aguardando · ${openTicketsInProgress} em andamento`}
        icon={Headset as any}
        tone="blue"
      />

      <DashboardMetricCard
        title="Aguardando"
        value={openTicketsWaiting}
        helper="Tickets sem atendimento iniciado"
        icon={Clock as any}
        tone="amber"
      />

      <DashboardMetricCard
        title="Em andamento"
        value={openTicketsInProgress}
        helper="Tickets com atendimento em curso"
        icon={Zap as any}
        tone="emerald"
      />

      <DashboardMetricCard
        title="Fila Suporte"
        value={openTicketsSupport}
        helper="Tickets na equipe de suporte"
        icon={Users as any}
        tone="blue"
      />

      <DashboardMetricCard
        title="Fila Desenvolvimento"
        value={openTicketsDevelopment}
        helper="Tickets na equipe de desenvolvimento"
        icon={Sparkles as any}
        tone="amber"
      />

      <Card className="border-border/50 bg-card/70 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between px-4 pb-1.5 pt-4">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">SEFAZ</CardTitle>
          <div className={cn("flex h-7 w-7 items-center justify-center rounded-md", sefazIconClasses[sefazHealth])}>
            <RadioTower className="h-3.5 w-3.5" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className={cn("flex items-center gap-2 text-2xl font-bold tracking-tight tabular-nums", sefazTextClasses[sefazHealth])}>
            <span className={cn("inline-block h-2.5 w-2.5 rounded-full", sefazDotClasses[sefazHealth])} />
            {sefazLabels[sefazHealth]}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {sefazRoutesCount} rota{sefazRoutesCount !== 1 ? "s" : ""} monitorada{sefazRoutesCount !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      {contracts ? (
        <DashboardMetricCard
          title="Contratos ativos"
          value={contracts.activeContracts}
          helper={formatCurrency(contracts.totalValue) + " MRR estimado"}
          icon={FileText as any}
          tone="emerald"
        />
      ) : null}
    </div>
  );
}
