"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { formatNumber } from "@/lib/formatters";
import { Award, Frown, MessageSquare, Star, ThumbsUp } from "lucide-react";

type SupportQualityCsatProps = {
  csatAverageScore: number | null;
  csatResponseCount: number;
  csatEligibleResolvedCount: number;
  csatLowScoreCount: number;
  csatScoreDistribution: Array<{ score: number; count: number }>;
  csatAgentPerformance: Array<{
    agentId: string | null;
    agentName: string;
    averageScore: number;
    responseCount: number;
    lowScoreCount: number;
  }>;
};

export function SupportQualityCsat({
  csatAverageScore,
  csatResponseCount,
  csatEligibleResolvedCount,
  csatLowScoreCount,
  csatScoreDistribution,
  csatAgentPerformance,
}: SupportQualityCsatProps) {
  const responseRatePct = csatEligibleResolvedCount > 0
    ? Math.round((csatResponseCount / csatEligibleResolvedCount) * 100)
    : 0;

  const maxDistributionCount = Math.max(...csatScoreDistribution.map((d) => d.count), 1);

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base font-semibold text-foreground">
              Qualidade & Satisfação (CSAT)
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Indicadores de satisfação do cliente, taxa de adesão às pesquisas e distribuição de avaliações.
          </p>
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 md:grid-cols-12 pt-1">
        {/* Metric Summaries (5 cols) */}
        <div className="md:col-span-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>CSAT Médio</span>
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground tabular-nums">
              {csatAverageScore != null ? formatNumber(csatAverageScore, { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : "Sem base"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Escala de 1 a 5 estrelas</p>
          </div>

          <div className="rounded-xl border border-border/50 bg-muted/20 p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Taxa de Resposta</span>
              <MessageSquare className="h-4 w-4 text-sky-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground tabular-nums">
              {responseRatePct}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {csatResponseCount} de {csatEligibleResolvedCount} encerrados
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Avaliações Positivas</span>
              <ThumbsUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-400 tabular-nums">
              {csatScoreDistribution.filter((d) => d.score >= 4).reduce((acc, curr) => acc + curr.count, 0)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Notas 4 e 5 estrelas</p>
          </div>

          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Avaliações Críticas</span>
              <Frown className="h-4 w-4 text-rose-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-400 tabular-nums">
              {csatLowScoreCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Notas 1 e 2 estrelas</p>
          </div>
        </div>

        {/* Compact Rating Distribution (7 cols) */}
        <div className="md:col-span-7 flex flex-col justify-between rounded-xl border border-border/50 bg-muted/10 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Distribuição das Notas (1 a 5 Estrelas)
          </h4>
          <div className="space-y-2 text-xs">
            {[5, 4, 3, 2, 1].map((score) => {
              const count = csatScoreDistribution.find((d) => d.score === score)?.count ?? 0;
              const pct = Math.round((count / maxDistributionCount) * 100);

              return (
                <div key={score} className="flex items-center gap-3">
                  <span className="w-12 font-medium text-foreground flex items-center gap-1">
                    {score} <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  </span>
                  <div className="flex-1 h-3 rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        score >= 4 ? "bg-emerald-500" : score === 3 ? "bg-amber-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono font-semibold tabular-nums text-foreground">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          {csatAgentPerformance.length > 0 ? (
            <div className="mt-4 pt-3 border-t border-border/40 text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              <span className="font-semibold text-foreground">Destaques da equipe:</span>
              {csatAgentPerformance.slice(0, 3).map((agent) => (
                <span key={agent.agentName}>
                  {agent.agentName}: <strong className="text-foreground">{formatNumber(agent.averageScore, { minimumFractionDigits: 1 })}⭐</strong> ({agent.responseCount})
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
