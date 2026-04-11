import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { getRemoteEfficiencyMetrics } from "@/features/remote/application/report-queries";
import {
  BarChart3,
  Clock,
  ChevronRight,
  TrendingUp,
  Users,
  Monitor,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

function formatDuration(seconds: number | null) {
  if (seconds === null) return "N/A";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export default async function RemoteEfficiencyReportsPage() {
  await requireSession();
  if (!(await currentUserHasPermission("tools:all"))) {
    redirect("/portal");
  }

  const tenantScope = await getRemoteTenantScope();
  const metrics = await getRemoteEfficiencyMetrics(tenantScope);

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-4">
        <Link
          href="/portal/plataforma-remota"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Plataforma
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground lg:text-5xl">
              Eficiencia de Suporte
            </h1>
            <p className="mt-2 text-xl text-muted-foreground max-w-3xl">
              Metricas de performance para o modulo de suporte remoto e tempo de resposta a incidentes.
            </p>
          </div>
          <Badge variant="outline" className="h-fit px-4 py-1 text-sm bg-muted/30 border-primary/20 text-primary">
            <Calendar className="mr-2 h-4 w-4" />
            Ultimos 100 atendimentos
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-border/50 bg-linear-to-br from-background to-muted/20 shadow-lg">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Clock className="h-20 w-20 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-sm font-medium uppercase tracking-wider">Time to Remote (TTR)</CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight text-primary">
              {formatDuration(metrics.averageTimeToRemoteSeconds)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Media entre abertura do ticket e 1o acesso</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/50 bg-linear-to-br from-background to-muted/20 shadow-lg">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Monitor className="h-20 w-20 text-indigo-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-sm font-medium uppercase tracking-wider">Duracao Media</CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight text-indigo-500">
              {formatDuration(metrics.averageSessionDurationSeconds)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Tempo medio logado nas maquinas</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/50 bg-linear-to-br from-background to-muted/20 shadow-lg">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Users className="h-20 w-20 text-emerald-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-sm font-medium uppercase tracking-wider">Total de Sessoes</CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight text-emerald-500">
              {metrics.totalSessionsCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Atendimentos remotos finalizados</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/50 bg-linear-to-br from-background to-muted/20 shadow-lg">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <BarChart3 className="h-20 w-20 text-violet-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-sm font-medium uppercase tracking-wider">Tickets Impactados</CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight text-violet-500">
              {metrics.totalTicketsWithRemote}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Chamados que precisaram de acesso</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40 shadow-xl overflow-hidden bg-background/50 backdrop-blur-md">
        <CardHeader className="border-b border-border/40 bg-muted/10">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Historico de Eficiencia</CardTitle>
          </div>
          <CardDescription>Detalhamento por ticket focado no tempo de resposta.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border/40">
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Ticket</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Host / Empresa</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Tecnico</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-muted-foreground tracking-wider">TTR (Tempo p/ Remoto)</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Duracao</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-muted-foreground tracking-wider text-right">Acao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {metrics.sessions.map((session) => (
                  <tr key={session.sessionId} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-sm font-bold text-foreground">#{session.ticketNumber || "N/A"}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(session.createdAt).toLocaleString("pt-BR")}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm text-foreground">{session.hostName}</span>
                        <span className="text-xs text-muted-foreground">{session.companyName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-foreground">{session.requestedByName}</span>
                    </td>
                    <td className="px-6 py-4">
                      {session.timeToRemoteSeconds !== null ? (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-mono",
                              session.timeToRemoteSeconds > 3600
                                ? "border-rose-500/50 text-rose-600 bg-rose-500/5"
                                : "border-emerald-500/50 text-emerald-600 bg-emerald-500/5",
                            )}
                          >
                            {formatDuration(session.timeToRemoteSeconds)}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Nao calculado</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-foreground">{formatDuration(session.durationSeconds)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/portal/plataforma-remota/${session.hostName}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary/80 hover:text-primary opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0"
                      >
                        Ver Host
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
