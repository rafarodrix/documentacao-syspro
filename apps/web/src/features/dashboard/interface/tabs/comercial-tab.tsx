import { ArrowUpRight, DollarSign, FileText, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardMetricCard, formatCurrency } from "../components/dashboard-metric-card";
import { ExecutiveLine } from "../components/executive-line";
import { CrmStageChart } from "../components/crm-stage-chart";
import { getComercialData } from "../../application";

export async function ComercialTab() {
  const data = await getComercialData();
  const { contracts, crm } = data;

  const stageDistribution = crm?.stageDistribution ?? [];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">Métricas de Contratos e Receita</h3>
      <div className="mb-2 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="Contratos Ativos"
          value={contracts?.activeContracts ?? 0}
          helper="Clientes com contrato ativo"
          icon={FileText as any}
          tone="blue"
        />
        <DashboardMetricCard
          title="MRR Estimado"
          value={contracts ? formatCurrency(contracts.totalValue) : "Sem dados"}
          helper="Receita recorrente mensal"
          icon={DollarSign as any}
          tone="emerald"
        />
      </div>

      <h3 className="mt-6 text-sm font-medium text-muted-foreground">Pipeline CRM</h3>
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
          helper={`${crm?.overdueLeads ?? 0} atrasados • ${crm?.noNextStepLeads ?? 0} sem proximo passo`}
          icon={TrendingDown as any}
          tone="red"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <CrmStageChart distribution={stageDistribution} />

        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Leitura executiva</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ExecutiveLine label="Leads ativos" value={`${crm?.activeLeads ?? 0}`} emphasis="text-foreground" />
            <ExecutiveLine label="Propostas abertas" value={`${crm?.proposalLeads ?? 0}`} />
            <ExecutiveLine label="Em negociacao" value={`${crm?.negotiationLeads ?? 0}`} />
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
                  Abrir CRM Comercial
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
