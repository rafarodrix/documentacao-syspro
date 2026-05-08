'use client';

import Link from 'next/link';
import { ArrowRight, BarChart3, Bug, Calendar, Rocket, Sparkles } from 'lucide-react';
import { Card, CardContent } from "@dosc-syspro/ui";
import { cn } from '@/lib/utils';
import type { ReleaseMonthSummary } from '@/features/releases/domain/release-grouping';

type ReleaseCycleCardProps = {
  summaries: ReleaseMonthSummary[];
  releaseLink: string;
  className?: string;
  title?: string;
  description?: string;
  ctaLabel?: string;
};

export function ReleaseCycleCard({
  summaries,
  releaseLink,
  className,
  title = 'Ciclo de Atualizacoes',
  description = 'Evolucao continua do produto',
  ctaLabel = 'Roadmap completo',
}: ReleaseCycleCardProps) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden border-border/50 bg-background/60 backdrop-blur-sm',
        'transition-all duration-300 hover:border-purple-500/30 hover:shadow-lg',
        className,
      )}
    >
      <div className="pointer-events-none absolute -top-24 left-1/2 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-purple-500/10 blur-[80px]" />

      <CardContent className="relative z-10 p-6 md:p-8">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-500">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold leading-none text-foreground md:text-2xl">{title}</h3>
              <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
            </div>
          </div>

          <Link
            href={releaseLink}
            className="group inline-flex items-center gap-1 text-sm font-medium text-purple-500 transition-colors hover:text-purple-400"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {summaries.length > 0 ? (
            summaries.map((summary) => (
              <Link
                key={`${summary.year}-${summary.month}`}
                href={`/portal/releases/${summary.year}/${summary.month}`}
                className="group/card block rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-purple-500/30 hover:bg-accent/50"
              >
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Calendar className="h-4 w-4 text-muted-foreground transition-colors group-hover/card:text-purple-500" />
                  {summary.monthName}
                  <span className="text-xs font-normal opacity-50">/{summary.year}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-md border border-green-500/20 bg-green-500/10 px-2.5 py-1.5 text-xs text-green-600">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Rocket className="h-3 w-3" />
                      Melhorias
                    </span>
                    <span className="font-mono font-bold">{summary.melhorias}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-sky-500/20 bg-sky-500/10 px-2.5 py-1.5 text-xs text-sky-600">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Sparkles className="h-3 w-3" />
                      Novas funcs.
                    </span>
                    <span className="font-mono font-bold">{summary.novasFuncionalidades}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-600">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Bug className="h-3 w-3" />
                      Correcoes
                    </span>
                    <span className="font-mono font-bold">{summary.bugs}</span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
              Nenhuma atualizacao recente.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
