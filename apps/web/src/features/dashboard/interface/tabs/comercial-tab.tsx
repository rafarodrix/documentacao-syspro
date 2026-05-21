import { ArrowUpRight, DollarSign, FileText, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@dosc-syspro/ui";
import { SectionCard } from "@/components/patterns";
import { DashboardMetricCard } from "../components/dashboard-metric-card";
import { formatCurrency } from "@/lib/formatters";
import { ExecutiveLine } from "../components/executive-line";
import { CrmStageChart } from "../components/crm-stage-chart";
import { getComercialData } from "../../application";

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

  return (
    <div className="space-y-4">

      <div className="mb-2 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="Contratos ativos"
          value={contracts?.activeContracts ?? 0}
          helper="Clientes com contrato ativo"
          icon={FileText as any}
          tone="blue"
        />
        <DashboardMetricCard
          title="MRR estimado"
          value={contracts ? formatCurrency(contracts.totalValue) : "Sem dados"}
          helper="Receita recorrente mensal liquida estimada"
          icon={DollarSign as any}
          tone="emerald"
        />
        <DashboardMetricCard
          title="MRR medio"
          value={contracts ? formatCurrency(averageContractMrr) : "Sem dados"}
          helper="Receita media por contrato ativo"
          icon={FileText as any}
          tone="blue"
        />
        <DashboardMetricCard
          title="Cobertura do pipeline"
          value={`${pipelineCoverage.toFixed(1)}x`}
          helper="Pipeline bruto sobre o MRR atual"
          icon={Target as any}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="Pipeline ativo"
          value={crm?.activeLeads ?? 0}
          helper={crm ? formatCurrency(crm.pipelineValue) : "Sem dados"}
          icon={Target as any}
          tone="blue"
        />
        <DashboardMetricCard
          title="Em proposta"
          value={crm?.proposalLeads ?? 0}
          helper={`${crm?.negotiationLeads ?? 0} em negociacao`}
          icon={TrendingUp as any}
          tone="amber"
        />
        <DashboardMetricCard
          title="Ganhos"
          value={crm?.wonLeads ?? 0}
          helper={crm ? formatCurrency(crm.wonValue) : "Sem dados"}
          icon={Sparkles as any}
          tone="emerald"
        />
        <DashboardMetricCard
          title="Risco operacional"
          value={(crm?.overdueLeads ?? 0) + (crm?.noNextStepLeads ?? 0)}
          helper={`${crm?.overdueLeads ?? 0} atrasados · ${crm?.noNextStepLeads ?? 0} sem proximo passo`}
          icon={TrendingDown as any}
          tone="red"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <CrmStageChart distribution={stageDistribution} />

        <SectionCard title="Leitura executiva" className="border-border/50 bg-card" contentClassName="space-y-3 text-sm">
          <ExecutiveLine
            label="MRR estimado"
            value={contracts ? formatCurrency(contracts.totalValue) : "Sem dados"}
            emphasis="text-emerald-500"
          />
          <ExecutiveLine label="Leads ativos" value={`${crm?.activeLeads ?? 0}`} emphasis="text-foreground" />
          <ExecutiveLine label="Propostas abertas" value={`${crm?.proposalLeads ?? 0}`} />
          <ExecutiveLine label="Em negociacao" value={`${crm?.negotiationLeads ?? 0}`} />
          <ExecutiveLine label="Ticket medio do pipeline" value={crm ? formatCurrency(averagePipelineTicket) : "Sem dados"} />
          <ExecutiveLine label="Ticket medio ganho" value={crm ? formatCurrency(averageWonTicket) : "Sem dados"} />
          <ExecutiveLine label="Taxa de ganho" value={`${winRate.toFixed(1)}%`} />
          <ExecutiveLine label="Cobertura do pipeline" value={`${pipelineCoverage.toFixed(1)}x`} />
          <ExecutiveLine label="Perdidos" value={`${crm?.lostLeads ?? 0}`} />
          <ExecutiveLine
            label="Atrasados"
            value={`${crm?.overdueLeads ?? 0}`}
            emphasis={(crm?.overdueLeads ?? 0) > 0 ? "text-amber-500" : "text-foreground"}
          />
          <ExecutiveLine
            label="Sem proximo passo"
            value={`${crm?.noNextStepLeads ?? 0}`}
            emphasis={(crm?.noNextStepLeads ?? 0) > 0 ? "text-red-500" : "text-foreground"}
          />
          <div className="pt-2">
            <Button asChild variant="outline" className="w-full gap-2">
              <Link href="/portal/comercial/leads">
                <ArrowUpRight className="h-4 w-4" />
                Abrir pipeline comercial
              </Link>
            </Button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
