"use client";

import Link from "next/link";
import {
  BarChart3,
  Calendar,
  ChevronRight,
  Clock,
  Monitor,
  TrendingUp,
  Users,
} from "lucide-react";
import type { EfficiencyMetrics } from "@/features/remote/application/report-queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number | null) {
  if (seconds === null) return "N/A";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function RemoteEfficiencyReportsPanel({ metrics }: { metrics: EfficiencyMetrics }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Badge variant="outline" className="h-fit px-4 py-1 text-sm bg-muted/30 border-primary/20 text-primary">
          <Calendar className="mr-2 h-4 w-4" />
          Ultimos 100 atendimentos
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="relative overflow-hidden border-border/50 bg-linear-to-br from-background to-muted/20 shadow-lg">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Clock className="h-20 w-20 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-sm font-medium uppercase tracking-wider">Tempo ate o remoto</CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight text-primary">
              {formatDuration(metrics.averageTimeToRemoteSeconds)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Media entre abertura do ticket e primeiro acesso.</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/50 bg-linear-to-br from-background to-muted/20 shadow-lg">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Monitor className="h-20 w-20 text-indigo-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-sm font-medium uppercase tracking-wider">Duracao media</CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight text-indigo-500">
              {formatDuration(metrics.averageSessionDurationSeconds)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Tempo medio conectado nas maquinas.</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/50 bg-linear-to-br from-background to-muted/20 shadow-lg">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Users className="h-20 w-20 text-emerald-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-sm font-medium uppercase tracking-wider">Total de sessoes</CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight text-emerald-500">
              {metrics.totalSessionsCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Sessoes remotas finalizadas.</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/50 bg-linear-to-br from-background to-muted/20 shadow-lg">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <BarChart3 className="h-20 w-20 text-violet-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-sm font-medium uppercase tracking-wider">Tickets impactados</CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight text-violet-500">
              {metrics.totalTicketsWithRemote}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Chamados que precisaram de acesso remoto.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-border/40 bg-background/50 shadow-xl backdrop-blur-md">
        <CardHeader className="border-b border-border/40 bg-muted/10">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Historico de eficiencia</CardTitle>
          </div>
          <CardDescription>Detalhamento por chamado com foco no tempo de resposta.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ticket</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Host / Empresa</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tecnico</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tempo ate remoto</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duracao</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {metrics.sessions.map((session) => (
                  <tr key={session.sessionId} className="group transition-colors hover:bg-muted/20">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground">#{session.ticketNumber || "N/A"}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(session.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{session.hostName}</span>
                        <span className="text-xs text-muted-foreground">{session.companyName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-foreground">{session.requestedByName}</span>
                    </td>
                    <td className="px-6 py-4">
                      {session.timeToRemoteSeconds !== null ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-mono",
                            session.timeToRemoteSeconds > 3600
                              ? "border-rose-500/50 bg-rose-500/5 text-rose-600"
                              : "border-emerald-500/50 bg-emerald-500/5 text-emerald-600",
                          )}
                        >
                          {formatDuration(session.timeToRemoteSeconds)}
                        </Badge>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">Nao calculado</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-foreground">{formatDuration(session.durationSeconds)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {session.hostId ? (
                        <Link
                          href={`/portal/infraestrutura/hosts/${session.hostId}`}
                          className="inline-flex translate-x-2 items-center gap-1 text-xs font-semibold text-primary/80 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 hover:text-primary"
                        >
                          Ver host
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      ) : null}
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
