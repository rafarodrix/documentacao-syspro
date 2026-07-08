import { SectionCard } from "@/components/patterns";
import { DashboardMetricGrid } from "../components/dashboard-metric-grid";
import { ExecutiveSummaryCard } from "../components/executive-summary-card";
import { ExecutiveLine } from "../components/executive-line";
import { DashboardNextActionCard } from "../components/dashboard-next-action-card";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { CrmStageChart } from "../components/crm-stage-chart";
import { getComercialData } from "../../application/comercial-dashboard.queries";
import { cn } from "@/lib/utils";

export async function ComercialTab() {
  const data = await getComercialData();
  const { contracts, crm } = data;

  const stageDistribution = crm?.stageDistribution ?? [];
  const winBase = (crm?.wonLeads ?? 0) + (crm?.lostLeads ?? 0);
  const winRate = winBase > 0 ? ((crm?.wonLeads ?? 0) / winBase) * 100 : 0;
  const averagePipelineTicket = (crm?.activeLeads ?? 0) > 0 ? (crm?.pipelineValue ?? 0) / (crm?.activeLeads ?? 1) : 0;
  const averageWonTicket = (crm?.wonLeads ?? 0) > 0 ? (crm?.wonValue ?? 0) / (crm?.wonLeads ?? 1) : 0;
  const averageContractMrr = (contracts?.activeContracts ?? 0) > 0
    ? (contracts?.totalValue ?? 0) / (contracts?.activeContracts ?? 1)
    : 0;
  const pipelineCoverage = (contracts?.totalValue ?? 0) > 0 ? (crm?.pipelineValue ?? 0) / (contracts?.totalValue ?? 1) : 0;

  const pipelineValueFormatted = crm ? formatCurrency(crm.pipelineValue) : "R$ 0,00";
  const averagePipelineTicketFormatted = crm ? formatCurrency(averagePipelineTicket) : "R$ 0,00";
  const averageWonTicketFormatted = crm ? formatCurrency(averageWonTicket) : "R$ 0,00";
  const winRateFormatted = formatNumber(winRate, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pipelineCoverageFormatted = formatNumber(pipelineCoverage, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const overdueLeads = crm?.overdueLeads ?? 0;
  const noNextStepLeads = crm?.noNextStepLeads ?? 0;
  const wonValueFormatted = crm ? formatCurrency(crm.wonValue) : "R$ 0,00";
  const totalMrrFormatted = contracts ? formatCurrency(contracts.totalValue) : "R$ 0,00";

  return (
    <div className="space-y-4">
      <ExecutiveSummaryCard
        title="Leitura executiva do comercial"
        description="Use esta aba para responder rapido se o pipeline sustenta a receita atual, onde o funil esta travando e quanto valor esta exposto por falta de acompanhamento."
      >
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <ExecutiveLine
            label="Cobertura do pipeline"
            value={`${pipelineCoverageFormatted}x`}
            emphasis={pipelineCoverage >= 1 ? "font-bold text-emerald-500" : "font-bold text-amber-500"}
          />
          <ExecutiveLine label="Conversao historica" value={`${winRateFormatted}%`} />
          <ExecutiveLine
            label="Risco no funil"
            value={`${overdueLeads + noNextStepLeads} lead(s)`}
            emphasis={overdueLeads + noNextStepLeads > 0 ? "font-bold text-rose-500" : "text-foreground"}
          />
        </div>
      </ExecutiveSummaryCard>

      <DashboardMetricGrid
        metrics={[
          {
            title: "Contratos ativos",
            value: contracts?.activeContracts ?? 0,
            helper: "Clientes com contrato ativo",
            icon: "fileText",
            tone: "blue",
          },
          {
            title: "MRR estimado",
            value: contracts ? formatCurrency(contracts.totalValue) : "Sem dados",
            helper: "Receita recorrente mensal liquida estimada",
            icon: "dollar",
            tone: "emerald",
          },
          {
            title: "MRR medio",
            value: contracts ? formatCurrency(averageContractMrr) : "Sem dados",
            helper: "Receita media por contrato ativo",
            icon: "fileText",
            tone: "blue",
          },
          {
            title: "Cobertura do pipeline",
            value: `${formatNumber(pipelineCoverage, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x`,
            helper: "Pipeline bruto sobre o MRR atual",
            icon: "target",
            tone: "amber",
          },
        ]}
      />

      <DashboardMetricGrid
        metrics={[
          {
            title: "Pipeline ativo",
            value: crm?.activeLeads ?? 0,
            helper: crm ? formatCurrency(crm.pipelineValue) : "Sem dados",
            icon: "target",
            tone: "blue",
          },
          {
            title: "Em proposta",
            value: crm?.proposalLeads ?? 0,
            helper: `${crm?.negotiationLeads ?? 0} em negociacao`,
            icon: "trendingUp",
            tone: "amber",
          },
          {
            title: "Ganhos",
            value: crm?.wonLeads ?? 0,
            helper: crm ? formatCurrency(crm.wonValue) : "Sem dados",
            icon: "sparkles",
            tone: "emerald",
          },
          {
            title: "Risco operacional",
            value: (crm?.overdueLeads ?? 0) + (crm?.noNextStepLeads ?? 0),
            helper: `${crm?.overdueLeads ?? 0} atrasados | ${crm?.noNextStepLeads ?? 0} sem proximo passo`,
            icon: "trendingDown",
            tone: "red",
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <CrmStageChart distribution={stageDistribution} />

        <SectionCard
          title="Narrativa e saude do pipeline"
          className="border-border/50 bg-card/60 shadow-sm backdrop-blur"
          contentClassName="space-y-4 text-sm leading-relaxed"
        >
          <div className="space-y-2.5 rounded-lg border border-border/40 bg-muted/20 p-3.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Desempenho comercial</h4>
            <p className="text-xs leading-normal text-foreground">
              O pipeline hoje concentra <strong className="font-semibold text-foreground">{crm?.activeLeads ?? 0} leads ativos</strong> e <strong className="font-semibold text-primary">{pipelineValueFormatted}</strong> em valor bruto. O ticket medio atual esta em <span className="font-medium text-foreground">{averagePipelineTicketFormatted}</span>.
            </p>
            <p className="text-xs leading-normal text-foreground">
              A conversao historica esta em <strong className="font-medium">{winRateFormatted}%</strong>. Cada negocio ganho entrega em media <strong className="font-semibold text-emerald-500">{averageWonTicketFormatted}</strong>, somando <strong className="font-semibold text-emerald-500">{wonValueFormatted}</strong> em {crm?.wonLeads ?? 0} fechamentos.
            </p>
          </div>

          <div className="space-y-2.5 rounded-lg border border-border/40 bg-muted/20 p-3.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cobertura de receita</h4>
            <p className="text-xs leading-normal text-foreground">
              O pipeline ativo cobre <strong className="font-medium">{pipelineCoverageFormatted}x</strong> o MRR atual de <strong className="font-medium">{totalMrrFormatted}</strong>. Esse numero mostra se a esteira comercial sustenta o ritmo de expansao sem depender de leitura detalhada do funil.
            </p>
          </div>

          <div
            className={cn(
              "space-y-2 rounded-lg border p-3.5",
              overdueLeads > 0 || noNextStepLeads > 0
                ? "border-rose-500/20 bg-rose-500/5 text-rose-200"
                : "border-emerald-500/20 bg-emerald-500/5 text-emerald-200",
            )}
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
              <span className={cn("h-2 w-2 rounded-full", overdueLeads > 0 || noNextStepLeads > 0 ? "animate-pulse bg-rose-500" : "bg-emerald-500")} />
              <span>Analise de risco operacional</span>
            </div>
            {overdueLeads > 0 || noNextStepLeads > 0 ? (
              <p className="text-xs leading-normal text-muted-foreground">
                Ha risco real de execucao: <strong className="font-bold text-rose-400">{overdueLeads} lead(s) estao com atividades em atraso</strong> e <strong className="font-bold text-rose-400">{noNextStepLeads} lead(s) seguem sem proxima acao</strong>. Isso expoe cerca de <strong className="font-semibold text-foreground">{crm ? formatCurrency((overdueLeads + noNextStepLeads) * averagePipelineTicket) : "R$ 0,00"}</strong> em receita potencial.
              </p>
            ) : (
              <p className="text-xs leading-normal text-muted-foreground">
                O acompanhamento esta em dia. Todas as oportunidades possuem proxima acao definida e nao ha atrasos registrados.
              </p>
            )}
          </div>
        </SectionCard>
      </div>

      <DashboardNextActionCard
        description="Feche este ciclo abrindo o pipeline para remover gargalos imediatos e registre um novo lead quando a cobertura comercial ainda nao sustentar a meta de receita."
        primaryHref="/portal/comercial/leads"
        primaryLabel="Ir para pipeline"
        secondaryHref="/portal/comercial/leads/novo"
        secondaryLabel="Cadastrar novo lead"
      />
    </div>
  );
}
