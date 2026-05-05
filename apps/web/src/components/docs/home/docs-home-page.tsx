'use client';

import { useMemo, type CSSProperties } from 'react';
import Link from 'next/link';
import type { Role } from '@prisma/client';
import { BookOpen, ChevronRight, Clock, History, Search } from 'lucide-react';
import { LargeSearchToggle } from 'fumadocs-ui/components/layout/search-toggle';
import { DocsSectionHeader } from '@/components/docs/docs-section-header';
import { DocsEmptyState } from '@/components/docs/docs-empty-state';
import { DocsSurface } from '@/components/docs/docs-surface';
import { ReleaseCycleCard } from '@/components/releases/release-cycle-card';
import { formatDateMedium, formatDateTime } from '@/lib/docs-utils';
import { useDocsDashboard, type DocsHomeEntry } from './use-docs-dashboard';
import { InsightLink, PremiumLinkCard } from './docs-home-components';
import {
  BASE_QUICK_LINKS,
  TECHNICAL_QUICK_LINK,
} from './docs-home-config';
import type { ReleaseMonthSummary } from '@/features/releases/domain/release-grouping';

const staggerStyle = (index: number): CSSProperties => ({
  animationDelay: `${Math.min(index * 60, 600)}ms`,
});

type DocsHomePageProps = {
  pages: DocsHomeEntry[];
  canViewTechnical: boolean;
  role: Role;
  releaseSummaries: ReleaseMonthSummary[];
};

export function DocsHomePage({ pages, canViewTechnical, role, releaseSummaries }: DocsHomePageProps) {
  const { derived } = useDocsDashboard(pages, role, canViewTechnical);

  const quickLinks = useMemo(() => {
    return canViewTechnical
      ? [...BASE_QUICK_LINKS, TECHNICAL_QUICK_LINK]
      : BASE_QUICK_LINKS;
  }, [canViewTechnical]);

  return (
    <div className="docs-home-page space-y-6 pb-12">
      <section className="animate-docs-fade-up opacity-0" style={staggerStyle(0)}>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-muted-foreground/90">
          <Link
            href="/portal"
            className="inline-flex items-center rounded-full border border-border/60 bg-background/60 px-2.5 py-1 no-underline transition-colors hover:border-border hover:bg-accent/50 hover:text-foreground"
          >
            Portal
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/55" />
          <Link
            href="/portal/docs"
            className="inline-flex items-center rounded-full border border-border/60 bg-background/60 px-2.5 py-1 no-underline transition-colors hover:border-border hover:bg-accent/50 hover:text-foreground"
          >
            Documentacao
          </Link>
        </div>
      </section>

      <section
        className="animate-docs-fade-up rounded-[28px] border border-border/60 bg-card/35 p-4 opacity-0 shadow-sm md:p-5"
        style={staggerStyle(1)}
      >
        <div className="rounded-[22px] border border-border/60 bg-background/65 p-3 backdrop-blur-xl">
          <LargeSearchToggle className="h-12 w-full justify-start rounded-[18px] border-0 bg-background/70 px-4 text-left text-sm shadow-none" />
        </div>
      </section>

      <section className="animate-docs-fade-up space-y-4 opacity-0" style={staggerStyle(2)}>
        <DocsSurface className="rounded-[28px] bg-card/35 p-4 shadow-sm">
          <DocsSectionHeader icon={Search} label="Acessos rapidos" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {quickLinks.map((item, index) => (
              <PremiumLinkCard
                key={item.href}
                item={item}
                style={staggerStyle(index + 2)}
                featured={index === 0}
                className={index === 0 ? 'md:col-span-2 xl:col-span-2' : undefined}
              />
            ))}
          </div>
        </DocsSurface>

        <ReleaseCycleCard
          summaries={releaseSummaries}
          releaseLink="/portal/releases"
          title="Ciclo de Atualizacoes"
          description="Mesmo modulo de releases da home principal, agora integrado a documentacao"
          ctaLabel="Abrir releases"
          className="rounded-[28px] border-border/55 bg-[linear-gradient(180deg,hsl(var(--background)/0.82),hsl(var(--card)/0.96))] shadow-sm"
        />
      </section>

      <section
        className="animate-docs-fade-up grid gap-4 opacity-0 lg:grid-cols-2"
        style={staggerStyle(3)}
      >
        <DocsSurface className="rounded-[28px] bg-[linear-gradient(180deg,hsl(var(--card)/0.42),hsl(var(--background)/0.32))] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <DocsSectionHeader icon={Clock} label="Ultimas 5 atualizacoes" />
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/60 text-muted-foreground">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-0.5">
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
        </DocsSurface>

        <DocsSurface className="rounded-[28px] bg-[linear-gradient(180deg,hsl(var(--card)/0.42),hsl(var(--background)/0.32))] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <DocsSectionHeader icon={History} label="Ultimos 5 continuar leitura" />
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/60 text-muted-foreground">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-0.5">
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
        </DocsSurface>
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
