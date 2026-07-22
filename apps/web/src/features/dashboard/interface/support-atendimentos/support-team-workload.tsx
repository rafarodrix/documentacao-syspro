"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { formatNumber } from "@/lib/formatters";
import { CheckCircle2, Clock, Users } from "lucide-react";

type AssigneeLoad = {
  userId: string | null;
  name: string;
  openCount: number;
  waitingCount: number;
  resolvedCount?: number;
  avgFirstResponseMinutes?: number | null;
  avgResolutionHours?: number | null;
  averageScore?: number | null;
  responseCount?: number;
};

type SupportTeamWorkloadProps = {
  assigneeLoads: AssigneeLoad[];
  medianFirstResponseMinutes?: number | null;
  medianResolutionHours?: number | null;
};

function formatMinutes(value: number | null | undefined) {
  if (value == null) return "Sem base";
  return `${formatNumber(value, { maximumFractionDigits: 1 })} min`;
}

function formatHours(value: number | null | undefined) {
  if (value == null) return "Sem base";
  return `${formatNumber(value, { maximumFractionDigits: 1 })}h`;
}

function resolveCapacityStatus(openCount: number) {
  if (openCount === 0) return { label: "Disponivel", tone: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
  if (openCount <= 3) return { label: "Capacidade normal", tone: "bg-sky-500/15 text-sky-400 border-sky-500/30" };
  if (openCount <= 6) return { label: "Carga moderada", tone: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  return { label: "Alta demanda", tone: "bg-rose-500/15 text-rose-400 border-rose-500/30" };
}

export function SupportTeamWorkload({
  assigneeLoads,
  medianFirstResponseMinutes,
  medianResolutionHours,
}: SupportTeamWorkloadProps) {
  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-sky-500" />
            <CardTitle className="text-base font-semibold text-foreground">
              Equipe & Distribuição de Carga
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Acompanhamento operacional de atendimento com tempos medianos de resposta e resolução.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-sky-400" /> Mediana 1ª resposta: <strong className="text-foreground">{formatMinutes(medianFirstResponseMinutes)}</strong>
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Mediana Resolução: <strong className="text-foreground">{formatHours(medianResolutionHours)}</strong>
          </span>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        {assigneeLoads.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Sem dados de atendentes no período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/50 bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-semibold">Atendente</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Abertos Agora</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Em Espera</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Resolvidos</th>
                  <th className="px-4 py-2.5 text-center font-semibold">1ª Resposta</th>
                  <th className="px-4 py-2.5 text-center font-semibold">CSAT Médio</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Status de Carga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {assigneeLoads.map((agent) => {
                  const capacity = resolveCapacityStatus(agent.openCount);

                  return (
                    <tr key={agent.name} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                        {agent.name}
                      </td>

                      <td className="px-4 py-3 text-center font-bold tabular-nums text-foreground">
                        {agent.openCount}
                      </td>

                      <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">
                        {agent.waitingCount}
                      </td>

                      <td className="px-4 py-3 text-center font-semibold tabular-nums text-emerald-500">
                        {agent.resolvedCount ?? 0}
                      </td>

                      <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">
                        {formatMinutes(agent.avgFirstResponseMinutes)}
                      </td>

                      <td className="px-4 py-3 text-center tabular-nums font-semibold text-foreground">
                        {agent.averageScore != null ? (
                          <span>
                            {formatNumber(agent.averageScore, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ⭐
                            <span className="text-[10px] text-muted-foreground font-normal ml-1">({agent.responseCount})</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-normal">Sem notas</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${capacity.tone}`}>
                          {capacity.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
