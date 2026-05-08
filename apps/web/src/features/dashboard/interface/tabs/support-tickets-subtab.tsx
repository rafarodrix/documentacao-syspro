import { ActivityChart } from "@/components/platform/app/dashboard/activity-chart";
import { OpenTicketsInsights } from "@/components/platform/app/dashboard/open-tickets-insights";
import { TicketsSummary } from "@/features/tickets/interface";
import { TicketPriorityChart } from "../components/ticket-priority-chart";
import { getSuporteData } from "../../application";

export async function SupportTicketsSubtab() {
  const data = await getSuporteData();
  const { openTicketRecords, tickets, totalOpen, activity, scopeMode, allowAreaFilter } = data;

  return (
    <div className="space-y-4">
      <OpenTicketsInsights
        records={openTicketRecords}
        scopeMode={scopeMode}
        allowAreaFilter={allowAreaFilter}
        showScopeHeader={false}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="min-w-0">
          <TicketPriorityChart records={openTicketRecords} />
        </div>
        <div className="min-w-0">
          <TicketsSummary tickets={tickets} totalOpen={totalOpen} />
        </div>
        <div className="min-w-0">
          <ActivityChart
            title="Atualizacoes de tickets"
            description="Movimento operacional dos ultimos 7 dias"
            points={activity}
            badgeLabel="Fila operacional"
            emptyLabel="Sem atividade recente no periodo"
          />
        </div>
      </div>
    </div>
  );
}
