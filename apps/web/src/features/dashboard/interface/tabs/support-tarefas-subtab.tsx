import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@dosc-syspro/ui";
import { ActivityChart } from "@/components/platform/app/dashboard/activity-chart";
import { DashboardMetricCard } from "../components/dashboard-metric-card";
import { getTarefasData } from "../../application/tarefas-dashboard.queries";
import type { DashboardTarefasOverdueItem } from "@dosc-syspro/contracts/dashboard";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function OverdueItem({ item }: { item: DashboardTarefasOverdueItem }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <p className="truncate text-xs text-muted-foreground">{item.companyName}</p>
        {item.assignedToName ? (
          <p className="text-xs text-muted-foreground">{item.assignedToName}</p>
        ) : null}
      </div>
      <Badge variant="destructive" className="shrink-0 text-[10px]">
        {item.daysOverdue}d atraso
      </Badge>
    </div>
  );
}

export async function SupportTarefasSubtab() {
  const data = await getTarefasData();
  const { summary, activity, overdueItems, year, month } = data;

  const competencia = `${MONTH_NAMES[month - 1]} ${year}`;
  const completionRate =
    summary.total > 0
      ? Math.round((summary.completed / summary.total) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DashboardMetricCard
          title="Total de tarefas"
          value={summary.total}
          helper={`Competencia ${competencia}`}
          icon={ClipboardList}
          tone="blue"
        />
        <DashboardMetricCard
          title="Vencidas"
          value={summary.overdue}
          helper="Tarefas com prazo expirado"
          icon={AlertTriangle}
          tone="red"
          trend={
            summary.total > 0
              ? { delta: summary.overdue, label: "vencidas no mes", downIsGood: true }
              : undefined
          }
        />
        <DashboardMetricCard
          title="Aguardando cliente"
          value={summary.waitingCustomer}
          helper="Aguardando retorno do cliente"
          icon={Clock}
          tone="amber"
        />
        <DashboardMetricCard
          title="Concluidas"
          value={summary.completed}
          helper={`${completionRate}% de conclusao no mes`}
          icon={CheckCircle2}
          tone="emerald"
          trend={
            summary.total > 0
              ? { delta: summary.completed, label: "concluidas no mes", downIsGood: false }
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="min-w-0">
          <ActivityChart
            title="Movimentacao de tarefas"
            description={`Atividade dos ultimos 7 dias - competencia ${competencia}`}
            points={activity}
            badgeLabel="Concluidas / Recebidas"
            emptyLabel="Sem atividade recente no periodo"
          />
        </div>

        <div className="min-w-0">
          <Card className="h-full border-border/60 bg-card shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
              <CardTitle className="text-sm">Tarefas vencidas</CardTitle>
              <Badge variant="outline" className="border-border/60 bg-background/70 text-muted-foreground">
                {summary.overdue} vencidas
              </Badge>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {overdueItems.length > 0 ? (
                <div className="divide-y divide-border/50 rounded-lg border border-border/50 bg-background px-3">
                  {overdueItems.map((item) => (
                    <OverdueItem key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="flex h-[160px] items-center justify-center rounded-lg border border-border/50 bg-background">
                  <p className="text-sm text-muted-foreground">Nenhuma tarefa vencida.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
