import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { AlertTriangle, CheckCircle2, Clock3, Inbox, Link2Off, UserRound } from "lucide-react";
import { ActivityChart } from "@/components/platform/app/dashboard/activity-chart";
import { DashboardMetricCard } from "../components/dashboard-metric-card";
import { getAtendimentosData } from "../../application";

function formatMinutes(value: number | null) {
  if (value === null) return "Sem base";
  if (value < 60) return `${value.toLocaleString("pt-BR")} min`;
  return `${(value / 60).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
}

function formatHours(value: number | null) {
  if (value === null) return "Sem base";
  if (value < 24) return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
  return `${(value / 24).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} d`;
}

export async function SupportAtendimentosSubtab() {
  const data = await getAtendimentosData();

  return (
    <div className="space-y-4">
      {data.warning ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{data.warning}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="Conversas abertas"
          value={data.openCount}
          helper="Fila ativa de atendimento"
          icon={Inbox}
          tone="blue"
        />
        <DashboardMetricCard
          title="Sem responsavel"
          value={data.unassignedCount}
          helper="Conversas que ainda exigem ownership"
          icon={UserRound}
          tone="amber"
        />
        <DashboardMetricCard
          title="Resolvidas 7d"
          value={data.resolvedCount}
          helper="Conversas encerradas no recorte"
          icon={CheckCircle2}
          tone="emerald"
        />
        <DashboardMetricCard
          title="Sem vinculo"
          value={data.unlinkedCount}
          helper="Atendimentos sem empresa/contato associado"
          icon={Link2Off}
          tone="red"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <ActivityChart
          title="Movimento de atendimentos"
          description="Ultimas interacoes registradas nos ultimos 7 dias"
          points={data.activity}
          badgeLabel="Chat operacional"
          emptyLabel="Sem conversas recentes no periodo"
        />

        <div className="grid grid-cols-1 gap-4">
          <Card className="border-border/60 bg-card/70 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tempo medio</CardTitle>
              <CardDescription>Baseado nas conversas registradas no portal.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                  <Clock3 className="h-4 w-4" />
                  <span className="text-sm">Primeira resposta</span>
                </div>
                <div className="text-2xl font-semibold tracking-tight">{formatMinutes(data.avgFirstResponseMinutes)}</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                  <Clock3 className="h-4 w-4" />
                  <span className="text-sm">Resolucao</span>
                </div>
                <div className="text-2xl font-semibold tracking-tight">{formatHours(data.avgResolutionHours)}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/70 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Canais e status</CardTitle>
              <CardDescription>Leitura rapida da fila de atendimento.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                {data.channelCounts.map((item) => (
                  <div key={item.channel} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2">
                    <span className="text-sm font-medium">{item.channel}</span>
                    <Badge variant="outline" className="tabular-nums">{item.count}</Badge>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {data.statusCounts.map((item) => (
                  <div key={item.status} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{item.status}</span>
                      <span className="font-medium tabular-nums">{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary/70"
                        style={{ width: `${data.openCount > 0 ? Math.min(100, (item.count / Math.max(data.openCount, 1)) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border/60 bg-card/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Carga por responsavel</CardTitle>
          <CardDescription>Conversas abertas e itens aguardando retorno.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.assigneeLoads.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum responsavel ativo encontrado neste recorte.</p>
          ) : (
            data.assigneeLoads.map((item) => (
              <div key={`${item.userId ?? "none"}-${item.name}`} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.waitingCount > 0 ? `${item.waitingCount} aguardando retorno` : "Sem aguardando no recorte"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold tabular-nums">{item.openCount}</p>
                  <p className="text-xs text-muted-foreground">abertas</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
