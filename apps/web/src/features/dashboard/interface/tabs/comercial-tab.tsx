import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@dosc-syspro/ui";
import { SectionCard } from "@/components/patterns";
import { DashboardMetricCard } from "../components/dashboard-metric-card";
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

      <div className="mb-2 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="Contratos ativos"
          value={contracts?.activeContracts ?? 0}
          helper="Clientes com contrato ativo"
          icon="fileText"
          tone="blue"
        />
        <DashboardMetricCard
          title="MRR estimado"
          value={contracts ? formatCurrency(contracts.totalValue) : "Sem dados"}
          helper="Receita recorrente mensal liquida estimada"
          icon="dollar"
          tone="emerald"
        />
        <DashboardMetricCard
          title="MRR medio"
          value={contracts ? formatCurrency(averageContractMrr) : "Sem dados"}
          helper="Receita media por contrato ativo"
          icon="fileText"
          tone="blue"
        />
        <DashboardMetricCard
          title="Cobertura do pipeline"
          value={`${formatNumber(pipelineCoverage, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x`}
          helper="Pipeline bruto sobre o MRR atual"
          icon="target"
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="Pipeline ativo"
          value={crm?.activeLeads ?? 0}
          helper={crm ? formatCurrency(crm.pipelineValue) : "Sem dados"}
          icon="target"
          tone="blue"
        />
        <DashboardMetricCard
          title="Em proposta"
          value={crm?.proposalLeads ?? 0}
          helper={`${crm?.negotiationLeads ?? 0} em negociacao`}
          icon="trendingUp"
          tone="amber"
        />
        <DashboardMetricCard
          title="Ganhos"
          value={crm?.wonLeads ?? 0}
          helper={crm ? formatCurrency(crm.wonValue) : "Sem dados"}
          icon="sparkles"
          tone="emerald"
        />
        <DashboardMetricCard
          title="Risco operacional"
          value={(crm?.overdueLeads ?? 0) + (crm?.noNextStepLeads ?? 0)}
          helper={`${crm?.overdueLeads ?? 0} atrasados · ${crm?.noNextStepLeads ?? 0} sem proximo passo`}
          icon="trendingDown"
          tone="red"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <CrmStageChart distribution={stageDistribution} />

        <SectionCard
          title="Narrativa e Saúde do Pipeline"
          className="border-border/50 bg-card/60 shadow-sm backdrop-blur"
          contentClassName="space-y-4 text-sm leading-relaxed"
        >
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3.5 space-y-2.5">
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Desempenho Comercial</h4>
            <p className="text-foreground text-xs leading-normal">
              Nosso pipeline comercial conta atualmente com <strong className="text-foreground font-semibold">{crm?.activeLeads ?? 0} leads ativos</strong>, totalizando um volume bruto de <strong className="text-primary font-semibold">{pipelineValueFormatted}</strong>. O ticket médio do pipeline está em <span className="font-medium text-foreground">{averagePipelineTicketFormatted}</span>.
            </p>
            <p className="text-foreground text-xs leading-normal">
              Historicamente, temos uma <strong className="font-medium">taxa de conversão de {winRateFormatted}%</strong> nos fechamentos. Com base nisso, o ticket médio ganho real atinge <strong className="font-semibold text-emerald-500">{averageWonTicketFormatted}</strong>, com um acumulado de <strong className="font-semibold text-emerald-500">{wonValueFormatted}</strong> ({crm?.wonLeads ?? 0} negócios fechados).
            </p>
          </div>

          <div className="rounded-lg border border-border/40 bg-muted/20 p-3.5 space-y-2.5">
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Cobertura de Receita</h4>
            <p className="text-foreground text-xs leading-normal">
              O pipeline ativo cobre <strong className="font-medium">{pipelineCoverageFormatted}x</strong> a nossa receita recorrente mensal (MRR) atual de <strong className="font-medium">{totalMrrFormatted}</strong>. Isso fornece uma cobertura saudável para alimentar as metas de expansão do trimestre.
            </p>
          </div>

          <div className={cn(
            "rounded-lg border p-3.5 space-y-2",
            (overdueLeads > 0 || noNextStepLeads > 0)
              ? "border-rose-500/20 bg-rose-500/5 text-rose-200"
              : "border-emerald-500/20 bg-emerald-500/5 text-emerald-200"
          )}>
            <div className="flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider">
              <span className={cn("h-2 w-2 rounded-full", (overdueLeads > 0 || noNextStepLeads > 0) ? "bg-rose-500 animate-pulse" : "bg-emerald-500")} />
              <span>Análise de Risco Operacional</span>
            </div>
            {(overdueLeads > 0 || noNextStepLeads > 0) ? (
              <p className="text-xs leading-normal text-muted-foreground">
                Atenção comercial necessária! Identificamos <strong className="font-bold text-rose-400">{overdueLeads} lead(s) com atividades em atraso</strong> e <strong className="font-bold text-rose-400">{noNextStepLeads} lead(s) sem nenhuma próxima ação</strong> agendada. A falta de acompanhamento coloca em risco cerca de <strong className="font-semibold text-foreground">{crm ? formatCurrency((overdueLeads + noNextStepLeads) * averagePipelineTicket) : "R$ 0,00"}</strong> em receita potencial de novos contratos.
              </p>
            ) : (
              <p className="text-xs leading-normal text-muted-foreground">
                Excelente controle operacional! Todas as oportunidades no funil possuem atividades futuras agendadas e não há pendências de atraso registradas.
              </p>
            )}
          </div>

          <div className="pt-2">
            <Button asChild variant="outline" className="w-full gap-2">
              <Link href="/portal/comercial/leads">
                <ArrowUpRight className="h-4 w-4" />
                Acessar Pipeline de Vendas
              </Link>
            </Button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
