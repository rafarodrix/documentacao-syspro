import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "@dosc-syspro/ui";
import { ActivityChart } from "@/components/platform/app/dashboard/activity-chart";
import { DashboardMetricCard } from "../components/dashboard-metric-card";
import { getTarefasData } from "../../application";
import type { DashboardTarefasOverdueItem } from "@dosc-syspro/contracts/dashboard";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
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
          title="Total de Tarefas"
          value={summary.total}
          helper={`Competência ${competencia}`}
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
              ? { delta: summary.overdue, label: "vencidas no mês", downIsGood: true }
              : undefined
          }
        />
        <DashboardMetricCard
          title="Aguardando Cliente"
          value={summary.waitingCustomer}
          helper="Aguardando retorno do cliente"
          icon={Clock}
          tone="amber"
        />
        <DashboardMetricCard
          title="Concluídas"
          value={summary.completed}
          helper={`${completionRate}% de conclusão no mês`}
          icon={CheckCircle2}
          tone="emerald"
          trend={
            summary.total > 0
              ? { delta: summary.completed, label: "concluídas no mês", downIsGood: false }
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="min-w-0">
          <ActivityChart
            title="Movimentação de tarefas"
            description={`Atividade dos últimos 7 dias — competência ${competencia}`}
            points={activity}
            badgeLabel="Concluídas / Recebidas"
            emptyLabel="Sem atividade recente no período"
          />
        </div>

        <div className="min-w-0">
          <Card className="h-full border-border/60 bg-card/70 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-sm">Tarefas vencidas</CardTitle>
                <CardDescription className="text-sm">
                  {overdueItems.length > 0
                    ? `${overdueItems.length} tarefa${overdueItems.length === 1 ? "" : "s"} com prazo expirado`
                    : "Nenhuma tarefa vencida no período."}
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-border/60 bg-background/70 text-muted-foreground">
                {summary.overdue} vencidas
              </Badge>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {overdueItems.length > 0 ? (
                <div className="divide-y divide-border/50 rounded-xl border border-border/50 bg-background/60 px-3">
                  {overdueItems.map((item) => (
                    <OverdueItem key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="flex h-[200px] items-center justify-center rounded-xl border border-border/50 bg-background/60">
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
