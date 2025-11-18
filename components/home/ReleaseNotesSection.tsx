import Link from 'next/link';
import { Rocket, Sparkles, Bug, Calendar } from 'lucide-react';
import { getReleases } from '@/src/lib/releases';
import { formatRecency } from '@/src/lib/date';
import { groupReleasesByMonth } from '@/src/lib/releases-helpers';
import type { Release } from '@/src/lib/types';

export async function ReleaseNotesSection() {
  const allReleases: Release[] = await getReleases();
  const monthlySummaries = groupReleasesByMonth(allReleases);
  const latestMonthsSnippet = monthlySummaries.slice(0, 3);
  const latestUpdateText = allReleases.length > 0 ? formatRecency(allReleases[0].isoDate) : "Nenhuma atualização recente";

  return (
    <section className="w-full max-w-5xl mb-20">
      <div className="border rounded-xl p-6 md:p-8 bg-gradient-to-tr from-card to-secondary/30 text-left">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-3">
              {latestUpdateText}
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Sempre Evoluindo para Você
            </h2>
          </div>
          <Link href="/docs/suporte/releasenotes" className="no-underline w-full md:w-auto">
            <button className="group w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-md hover:bg-primary/90 transition-all shadow-md hover:scale-105">
              <Rocket className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              Ver Todas as Atualizações
            </button>
          </Link>
        </div>

        <p className="text-muted-foreground text-sm max-w-2xl mt-2">
          Confira um resumo das implementações e correções dos últimos meses.
        </p>

        {latestMonthsSnippet.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-6">
            {latestMonthsSnippet.map((summary, index) => (
              <Link key={`${summary.year}-${summary.month}`} href={`/docs/suporte/release/${summary.year}/${summary.month}`} className="no-underline group block">
                <div className="h-full p-4 border bg-background/50 rounded-lg transition-all hover:shadow-md hover:-translate-y-1 hover:border-primary">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {summary.monthName}
                    </p>
                    {index === 0 && (
                      <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                        Mais Recente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-left text-muted-foreground mb-3">{summary.year}</p>
                  <div className="border-t pt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-green-500" /> Melhorias</span>
                      <span className="font-medium text-foreground">{summary.melhorias}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Bug className="w-4 h-4 text-amber-500" /> Bugs Corrigidos</span>
                      <span className="font-medium text-foreground">{summary.bugs}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}