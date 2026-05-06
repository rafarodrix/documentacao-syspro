import { FileText, Headset, KeyRound, Sparkles, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardMetricCard, formatCurrency } from "../components/dashboard-metric-card";
import { TicketFlowChart } from "../components/ticket-flow-chart";
import { getOperacionalData } from "../../application";

export async function OperacionalTab() {
  const data = await getOperacionalData();
  const { dailyPassword, ticketCounts, ticketFlow, contracts } = data;

  const todayActivity =
    (ticketFlow.opened.at(-1)?.value ?? 0) +
    (ticketFlow.inProgress.at(-1)?.value ?? 0);
  const yesterdayActivity =
    (ticketFlow.opened.at(-2)?.value ?? 0) +
    (ticketFlow.inProgress.at(-2)?.value ?? 0);
  const activityDelta = todayActivity - yesterdayActivity;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {dailyPassword ? (
          <Card className="border-border/50 bg-muted/30 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between px-4 pb-1.5 pt-4">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Senha do dia
              </CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10">
                <KeyRound className="h-3.5 w-3.5 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="rounded-lg border border-border/50 bg-background/80 px-3 py-2 text-center font-mono text-lg font-semibold tracking-[0.16em]">
                {dailyPassword.password}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Uso operacional interno.</p>
            </CardContent>
          </Card>
        ) : null}

        <DashboardMetricCard
          title="Total em aberto"
          value={ticketCounts.total}
          helper={`${ticketCounts.waiting} aguardando · ${ticketCounts.inProgress} em andamento`}
          icon={Headset as any}
          tone="blue"
          trend={{ delta: activityDelta, label: "movimentos vs ontem", downIsGood: true }}
        />

        <DashboardMetricCard
          title="Fila Suporte"
          value={ticketCounts.support}
          helper="Tickets na equipe de suporte"
          icon={Users as any}
          tone="blue"
        />

        <DashboardMetricCard
          title="Fila Desenvolvimento"
          value={ticketCounts.development}
          helper="Tickets na equipe de desenvolvimento"
          icon={Sparkles as any}
          tone="amber"
        />

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

      <TicketFlowChart flow={ticketFlow} />
    </div>
  );
}
