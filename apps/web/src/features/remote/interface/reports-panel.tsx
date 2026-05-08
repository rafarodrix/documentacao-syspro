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
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@dosc-syspro/ui";
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
        <Badge variant="outline" className="h-fit border-border/60 bg-background px-4 py-1 text-sm text-muted-foreground">
          <Calendar className="mr-2 h-4 w-4" />
          Ultimos 100 atendimentos
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportStatCard
          icon={<Clock className="h-4 w-4" />}
          label="Tempo ate o remoto"
          value={formatDuration(metrics.averageTimeToRemoteSeconds)}
          hint="Media entre abertura do ticket e primeiro acesso."
          accent="slate"
        />
        <ReportStatCard
          icon={<Monitor className="h-4 w-4" />}
          label="Duracao media"
          value={formatDuration(metrics.averageSessionDurationSeconds)}
          hint="Tempo medio conectado nas maquinas."
          accent="indigo"
        />
        <ReportStatCard
          icon={<Users className="h-4 w-4" />}
          label="Total de sessoes"
          value={String(metrics.totalSessionsCount)}
          hint="Sessoes remotas finalizadas."
          accent="emerald"
        />
        <ReportStatCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Tickets impactados"
          value={String(metrics.totalTicketsWithRemote)}
          hint="Chamados que precisaram de acesso remoto."
          accent="violet"
        />
      </div>

      <Card className="overflow-hidden border-border/40 bg-background/50 shadow-sm">
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

function ReportStatCard(props: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  accent: "slate" | "indigo" | "emerald" | "violet";
}) {
  const accentClass = {
    slate: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
    indigo: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    violet: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  } as const;
  const valueClass = {
    slate: "text-slate-700 dark:text-slate-300",
    indigo: "text-indigo-700 dark:text-indigo-400",
    emerald: "text-emerald-700 dark:text-emerald-400",
    violet: "text-violet-700 dark:text-violet-400",
  } as const;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {props.label}
          </span>
          <span className={cn("rounded-md p-1.5", accentClass[props.accent])}>{props.icon}</span>
        </div>
        <div className={cn("mt-2 text-2xl font-bold leading-none", valueClass[props.accent])}>
          {props.value}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{props.hint}</div>
      </CardContent>
    </Card>
  );
}
