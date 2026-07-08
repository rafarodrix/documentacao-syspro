import { ActivityChart } from "@/components/platform/app/dashboard/activity-chart";
import { OpenTicketsInsights } from "@/components/platform/app/dashboard/open-tickets-insights";
import { TicketPriorityChart } from "../components/ticket-priority-chart";
import { ExecutiveSummaryCard } from "../components/executive-summary-card";
import { ExecutiveLine } from "../components/executive-line";
import { getSuporteData } from "../../application/tickets-dashboard.queries";

export async function SupportTicketsSubtab() {
  const data = await getSuporteData();
  const { openTicketRecords, activity, scopeMode, allowAreaFilter } = data;
  const supportCount = openTicketRecords.filter((record) => record.team === "SUPORTE").length;
  const developmentCount = openTicketRecords.filter((record) => record.team === "DESENVOLVIMENTO").length;
  const unassignedModuleCount = openTicketRecords.filter((record) => !record.module?.trim()).length;

  return (
    <div className="space-y-5">
      <ExecutiveSummaryCard
        title="Leitura executiva dos tickets"
        description="Leia o tamanho da fila, a distribuicao entre suporte e desenvolvimento e os pontos onde a classificacao ainda enfraquece a triagem."
      >
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <ExecutiveLine label="Fila aberta" value={`${openTicketRecords.length}`} />
          <ExecutiveLine label="Suporte vs desenvolvimento" value={`${supportCount} | ${developmentCount}`} />
          <ExecutiveLine
            label="Sem modulo definido"
            value={`${unassignedModuleCount}`}
            emphasis={unassignedModuleCount > 0 ? "font-bold text-amber-500" : "text-foreground"}
          />
        </div>
      </ExecutiveSummaryCard>

      <OpenTicketsInsights
        records={openTicketRecords}
        scopeMode={scopeMode}
        allowAreaFilter={allowAreaFilter}
        showScopeHeader={false}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="min-w-0">
          <TicketPriorityChart records={openTicketRecords} />
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
