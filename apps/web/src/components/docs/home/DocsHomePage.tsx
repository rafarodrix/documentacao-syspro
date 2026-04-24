'use client';

import { useMemo, type CSSProperties } from 'react';
import Link from 'next/link';
import type { Role } from '@prisma/client';
import {
  ArrowRight,
  Clock,
  Compass,
  History,
  Search,
} from 'lucide-react';
import { LargeSearchToggle } from 'fumadocs-ui/components/layout/search-toggle';
import { DocsSectionHeader } from '@/components/docs/DocsSectionHeader';
import { DocsEmptyState } from '@/components/docs/DocsEmptyState';
import { formatDateMedium, formatDateTime } from '@/lib/docs-utils';
import { useDocsDashboard, type DocsHomeEntry } from './use-docs-dashboard';
import { InsightLink, PremiumLinkCard } from './DocsHomeComponents';
import {
  BASE_QUICK_LINKS,
  TECHNICAL_QUICK_LINK,
  ROLE_START_TASKS,
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

  const startTasks = useMemo(() => {
    const tasks = ROLE_START_TASKS[role] ?? ROLE_START_TASKS.CLIENTE_USER;
    return canViewTechnical
      ? tasks
      : tasks.filter((t) => !t.href.startsWith('/portal/docs/manuais-tecnicos'));
  }, [role, canViewTechnical]);

  return (
    <div className="docs-home-page space-y-6 pb-12">
      <section
        className="animate-docs-fade-up rounded-[28px] border border-border/60 bg-card/35 p-4 opacity-0 shadow-sm md:p-5"
        style={staggerStyle(0)}
      >
        <div className="rounded-[22px] border border-border/60 bg-background/65 p-3 backdrop-blur-xl">
          <LargeSearchToggle className="h-12 w-full justify-start rounded-[18px] border-0 bg-background/70 px-4 text-left text-sm shadow-none" />
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-border/60 bg-background/60 px-3 py-1 text-[11px] font-medium text-muted-foreground">
              Busca unificada da documentacao
            </span>
            <span className="inline-flex items-center rounded-full border border-border/60 bg-background/60 px-3 py-1 text-[11px] font-medium text-muted-foreground">
              Paginas, modulos e atalhos
            </span>
          </div>
        </div>
      </section>

      <section
        className="animate-docs-fade-up space-y-3 opacity-0"
        style={staggerStyle(1)}
      >
        <DocsSectionHeader icon={Compass} label="Trilhas sugeridas" />
        <div className="grid gap-3 md:grid-cols-3">
          {startTasks.map((task, index) => (
            <Link
              key={task.href}
              href={task.href}
              className="group animate-docs-fade-up rounded-[24px] border border-border/60 bg-background/50 p-5 no-underline opacity-0 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:bg-background/70"
              style={staggerStyle(index + 2)}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Trilha sugerida
              </p>
              <p className="mt-4 text-lg font-semibold tracking-tight text-foreground">{task.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{task.description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-foreground/90">
                Ver secao
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section
        className="animate-docs-fade-up space-y-3 opacity-0"
        style={staggerStyle(2)}
      >
        <DocsSectionHeader icon={Search} label="Acessos rapidos" />
        <div className="grid gap-3 lg:grid-cols-2">
          {quickLinks.map((item, index) => (
            <PremiumLinkCard key={item.href} item={item} style={staggerStyle(index + 5)} />
          ))}
        </div>
      </section>

      <section
        className="animate-docs-fade-up grid gap-4 opacity-0 lg:grid-cols-2"
        style={staggerStyle(3)}
      >
        <div className="rounded-[26px] border border-border/60 bg-card/35 p-4 shadow-sm">
          <DocsSectionHeader icon={Clock} label="Ultimas 5 atualizacoes" />
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

        <div className="rounded-[26px] border border-border/60 bg-card/35 p-4 shadow-sm">
          <DocsSectionHeader icon={History} label="Ultimos 5 continuar leitura" />
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
