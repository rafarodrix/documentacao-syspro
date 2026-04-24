'use client';

import { useMemo, type CSSProperties } from 'react';
import Link from 'next/link';
import type { Role } from '@prisma/client';
import {
  ArrowRight,
  Calendar,
  Clock,
  History,
  Search,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { LargeSearchToggle } from 'fumadocs-ui/components/layout/search-toggle';
import { DocsSectionHeader } from '@/components/docs/DocsSectionHeader';
import { DocsEmptyState } from '@/components/docs/DocsEmptyState';
import { formatDateMedium, formatDateTime, parseDate } from '@/lib/docs-utils';
import { useDocsDashboard, type DocsHomeEntry } from './use-docs-dashboard';
import { InsightLink, PremiumLinkCard } from './DocsHomeComponents';
import {
  BASE_QUICK_LINKS,
  TECHNICAL_QUICK_LINK,
} from './docs-home-config';

const staggerStyle = (index: number): CSSProperties => ({
  animationDelay: `${Math.min(index * 60, 600)}ms`,
});

type DocsHomePageProps = {
  pages: DocsHomeEntry[];
  canViewTechnical: boolean;
  role: Role;
};

export function DocsHomePage({ pages, canViewTechnical, role }: DocsHomePageProps) {
  const { derived } = useDocsDashboard(pages, role, canViewTechnical);

  const quickLinks = useMemo(() => {
    return canViewTechnical
      ? [...BASE_QUICK_LINKS, TECHNICAL_QUICK_LINK]
      : BASE_QUICK_LINKS;
  }, [canViewTechnical]);

  const cycleSummary = useMemo(() => {
    const referenceDate = parseDate(derived.latestUpdates[0]?.lastUpdated);
    const hasReference = referenceDate > 0;
    const ref = hasReference ? new Date(referenceDate) : new Date();
    const monthLabel = ref.toLocaleDateString('pt-BR', { month: 'long' });
    const yearLabel = String(ref.getFullYear());

    const updatesThisMonth = derived.latestUpdates.filter((item) => {
      const time = parseDate(item.lastUpdated);
      if (time <= 0) return false;
      const date = new Date(time);
      return date.getMonth() === ref.getMonth() && date.getFullYear() === ref.getFullYear();
    }).length;

    return {
      monthLabel,
      yearLabel,
      updatesThisMonth,
      readingCount: derived.recent.length,
    };
  }, [derived.latestUpdates, derived.recent.length]);

  return (
    <div className="docs-home-page space-y-6 pb-12">
      <section
        className="animate-docs-fade-up rounded-[28px] border border-border/60 bg-card/35 p-4 opacity-0 shadow-sm md:p-5"
        style={staggerStyle(0)}
      >
        <div className="rounded-[22px] border border-border/60 bg-background/65 p-3 backdrop-blur-xl">
          <LargeSearchToggle className="h-12 w-full justify-start rounded-[18px] border-0 bg-background/70 px-4 text-left text-sm shadow-none" />
        </div>
      </section>

      <section
        className="animate-docs-fade-up grid gap-4 opacity-0 xl:grid-cols-[minmax(0,1.75fr)_360px]"
        style={staggerStyle(1)}
      >
        <div className="rounded-[28px] border border-border/60 bg-card/35 p-4 shadow-sm">
          <DocsSectionHeader icon={Search} label="Acessos rapidos" />
          <div className="grid gap-3 md:grid-cols-2">
            {quickLinks.map((item, index) => (
              <PremiumLinkCard key={item.href} item={item} style={staggerStyle(index + 2)} />
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-border/60 bg-[linear-gradient(180deg,hsl(var(--background)/0.86),hsl(var(--card)/0.96))] p-5 shadow-sm">
          <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative z-10">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Ciclo de Atualizacoes</h3>
                  <p className="text-sm text-muted-foreground">Evolucao continua da base</p>
                </div>
              </div>
              <Link href="/portal/releases" className="inline-flex items-center gap-1 text-sm font-medium text-primary no-underline">
                Releases
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-[22px] border border-border/60 bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="capitalize">{cycleSummary.monthLabel}</span>
                <span className="text-xs font-normal text-muted-foreground">/{cycleSummary.yearLabel}</span>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Paginas atualizadas
                  </span>
                  <span className="font-semibold tabular-nums">{cycleSummary.updatesThisMonth}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-sm text-sky-400">
                  <span className="inline-flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Leituras recentes
                  </span>
                  <span className="font-semibold tabular-nums">{cycleSummary.readingCount}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[22px] border border-border/60 bg-background/55 p-4">
              <p className="text-sm font-medium text-foreground">Ritmo de manutencao da documentacao</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Centralize releases, guias atualizados e historico de leitura em um mesmo fluxo de consulta.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="animate-docs-fade-up grid gap-4 opacity-0 lg:grid-cols-2"
        style={staggerStyle(2)}
      >
        <div className="rounded-[28px] border border-border/60 bg-[linear-gradient(180deg,hsl(var(--card)/0.42),hsl(var(--background)/0.32))] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <DocsSectionHeader icon={Clock} label="Ultimas 5 atualizacoes" />
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/60 text-muted-foreground">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            {derived.latestUpdates.length === 0 ? (
              <DocsEmptyState message="As proximas atualizacoes da base aparecerao aqui." />
            ) : (
              derived.latestUpdates.slice(0, 5).map((item) => (
                <InsightLink
                  key={item.href}
                  href={item.href}
                  title={item.title}
                  meta={
                    formatDateMedium(item.lastUpdated) ? (
                      <span className="text-xs text-muted-foreground">
                        {formatDateMedium(item.lastUpdated)}
                      </span>
                    ) : undefined
                  }
                />
              ))
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-border/60 bg-[linear-gradient(180deg,hsl(var(--card)/0.42),hsl(var(--background)/0.32))] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <DocsSectionHeader icon={History} label="Ultimos 5 continuar leitura" />
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/60 text-muted-foreground">
              <Wrench className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            {derived.recent.length === 0 ? (
              <DocsEmptyState message="Seu historico de leitura aparecera aqui em breve." />
            ) : (
              derived.recent.slice(0, 5).map((item) => (
                <InsightLink
                  key={`${item.href}-${item.visitedAt}`}
                  href={item.href}
                  title={item.title}
                  meta={
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(item.visitedAt)}
                    </span>
                  }
                />
              ))
            )}
          </div>
        </div>
      </section>

      <style jsx global>{`
        .docs-home-page a {
          text-decoration: none;
        }

        @media (prefers-reduced-motion: no-preference) {
          .animate-docs-fade-up {
            animation: docsFadeUp 280ms cubic-bezier(0.2, 0.65, 0.2, 1) forwards;
          }
          @keyframes docsFadeUp {
            0% { opacity: 0; transform: translateY(8px); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
        }
      `}</style>
    </div>
  );
}
