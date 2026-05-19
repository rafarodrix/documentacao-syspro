import { FileText, Headset, KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { DashboardMetricCard, formatCurrency } from "../components/dashboard-metric-card";
import { TicketFlowChart } from "../components/ticket-flow-chart";
import { TrustReleaseCard } from "../components/trust-release-card";
import { DocsInsightsPanel } from "../components/docs-insights-panel";
import { getOperacionalData } from "../../application";
import { TicketsSummary } from "@/features/tickets/interface";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import type { SettingsPermissionKey } from "@dosc-syspro/contracts/settings";
import { source } from "@/lib/source";

export async function OperacionalTab() {
  const [data, canReleaseInTrust] = await Promise.all([
    getOperacionalData(),
    currentUserHasPermission("dashboard:release_trust" as SettingsPermissionKey),
  ]);
  const { dailyPassword, ticketCounts, ticketFlow, contracts, tickets } = data;

  const todayActivity = (ticketFlow.opened.at(-1)?.value ?? 0) + (ticketFlow.inProgress.at(-1)?.value ?? 0);
  const yesterdayActivity = (ticketFlow.opened.at(-2)?.value ?? 0) + (ticketFlow.inProgress.at(-2)?.value ?? 0);
  const activityDelta = todayActivity - yesterdayActivity;
  const latestDocs = source
    .getPages()
    .filter((page) => !['/portal/docs/cliente', '/portal/docs/suporte', '/portal/docs/admin'].includes(page.url))
    .map((page) => ({
      href: page.url,
      title: String(page.data.title ?? 'Sem título'),
      lastUpdated: typeof page.data.lastUpdated === 'string' ? page.data.lastUpdated : undefined,
    }))
    .sort((a, b) => (Date.parse(b.lastUpdated ?? '') || 0) - (Date.parse(a.lastUpdated ?? '') || 0))
    .slice(0, 5);

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {dailyPassword ? (
          <Card className="border-border/50 bg-card shadow-none">
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

        {contracts ? (
          <DashboardMetricCard
            title="Contratos ativos"
            value={contracts.activeContracts}
            helper={formatCurrency(contracts.totalValue) + " MRR estimado"}
            icon={FileText as any}
            tone="emerald"
          />
        ) : null}

        {canReleaseInTrust ? <TrustReleaseCard /> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="min-w-0">
          <TicketFlowChart flow={ticketFlow} />
        </div>
        <div className="min-w-0">
          <TicketsSummary tickets={tickets} />
        </div>
      </div>

      <DocsInsightsPanel latestUpdates={latestDocs} />
    </div>
  );
}
