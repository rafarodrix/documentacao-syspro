import { KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { DashboardMetricGrid } from "../components/dashboard-metric-grid";
import { TicketFlowChart } from "../components/ticket-flow-chart";
import { TrustReleaseCard } from "../components/trust-release-card";
import { DocsInsightsPanel } from "../components/docs-insights-panel";
import { ExecutiveSummaryCard } from "../components/executive-summary-card";
import { ExecutiveLine } from "../components/executive-line";
import { DashboardNextActionCard } from "../components/dashboard-next-action-card";
import { getOperacionalData } from "../../application/operacional-dashboard.queries";
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
  const waitingShare = ticketCounts.total > 0 ? Math.round((ticketCounts.waiting / ticketCounts.total) * 100) : 0;
  const latestDocs = source
    .getPages()
    .filter((page) => !["/portal/docs/cliente", "/portal/docs/suporte", "/portal/docs/admin"].includes(page.url))
    .map((page) => ({
      href: page.url,
      title: String(page.data.title ?? "Sem titulo"),
      lastUpdated: typeof page.data.lastUpdated === "string" ? page.data.lastUpdated : undefined,
    }))
    .sort((a, b) => (Date.parse(b.lastUpdated ?? "") || 0) - (Date.parse(a.lastUpdated ?? "") || 0))
    .slice(0, 5);

  return (
    <div className="space-y-5">
      <ExecutiveSummaryCard
        title="Leitura executiva da operacao"
        description="Leia primeiro a saude da fila, depois o ritmo de movimentacao e, por fim, os blocos utilitarios que exigem resposta operacional imediata."
      >
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <ExecutiveLine label="Tickets em aberto" value={`${ticketCounts.total}`} />
          <ExecutiveLine
            label="Aguardando retorno"
            value={`${ticketCounts.waiting} (${waitingShare}%)`}
            emphasis={ticketCounts.waiting > 0 ? "font-bold text-amber-500" : "text-foreground"}
          />
          <ExecutiveLine
            label="Movimento vs ontem"
            value={`${activityDelta > 0 ? "+" : ""}${activityDelta}`}
            emphasis={activityDelta > 0 ? "font-bold text-red-500" : "font-bold text-emerald-500"}
          />
        </div>
      </ExecutiveSummaryCard>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {dailyPassword ? (
          <Card className="border-border/50 bg-card/85 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between px-4 pb-1.5 pt-4">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
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
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Bloco utilitario para liberacoes operacionais do dia.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <div className="col-span-1 md:col-span-2">
          <DashboardMetricGrid
            className="grid-cols-1 md:grid-cols-2 xl:grid-cols-2"
            metrics={[
              {
                title: "Total em aberto",
                value: ticketCounts.total,
                helper: "Tickets ativos no momento",
                icon: "headset",
                tone: "blue",
                trend: { delta: activityDelta, label: "movimentos vs ontem", downIsGood: true },
              },
              ...(contracts
                ? [{
                    title: "Contratos ativos",
                    value: contracts.activeContracts,
                    helper: "Base recorrente em operacao",
                    icon: "fileText" as const,
                    tone: "emerald" as const,
                  }]
                : []),
            ]}
          />
        </div>

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

      <DashboardNextActionCard
        description="Feche a leitura entrando na fila operacional e use a documentacao interna apenas quando houver bloqueio de processo ou contexto tecnico."
        primaryHref="/portal/tickets"
        primaryLabel="Ir para fila operacional"
        secondaryHref="/portal/docs/admin"
        secondaryLabel="Abrir documentacao interna"
      />
    </div>
  );
}
