'use client';

import { useMemo, type CSSProperties } from 'react';
import Link from 'next/link';
import type { Role } from '@prisma/client';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock,
  Compass,
  Flame,
  History,
  LayoutDashboard,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { LargeSearchToggle } from 'fumadocs-ui/components/layout/search-toggle';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DocsSectionHeader } from '@/components/docs/DocsSectionHeader';
import { DocsEmptyState } from '@/components/docs/DocsEmptyState';
import { formatDateMedium, formatDateTime } from '@/lib/docs-utils';
import { useDocsDashboard, type DocsHomeEntry } from './use-docs-dashboard';
import {
  HeroMetric,
  CountBadge,
  InsightLink,
  InsightCard,
  PremiumLinkCard,
} from './DocsHomeComponents';
import {
  BASE_QUICK_LINKS,
  TECHNICAL_QUICK_LINK,
  ROLE_START_TASKS,
  ROLE_LABELS,
} from './docs-home-config';

const staggerStyle = (index: number): CSSProperties => ({
  animationDelay: `${Math.min(index * 70, 700)}ms`,
});

type DocsHomePageProps = {
  pages: DocsHomeEntry[];
  canViewTechnical: boolean;
  role: Role;
};

export function DocsHomePage({ pages, canViewTechnical, role }: DocsHomePageProps) {
  const { status, derived, metrics } = useDocsDashboard(pages, role, canViewTechnical);

  const quickLinks = useMemo(() => {
    return canViewTechnical
      ? [...BASE_QUICK_LINKS, TECHNICAL_QUICK_LINK]
      : BASE_QUICK_LINKS;
  }, [canViewTechnical]);

  const startTasks = useMemo(() => {
    const tasks = ROLE_START_TASKS[role] ?? ROLE_START_TASKS.CLIENTE_USER;
    return canViewTechnical
      ? tasks
      : tasks.filter((t) => !t.href.startsWith('/docs/manuais-tecnicos'));
  }, [role, canViewTechnical]);

  return (
    <div className="space-y-10 pb-12">
      {/* Hero */}
      <section
        className="relative animate-docs-fade-up overflow-hidden rounded-2xl border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] bg-card p-5 opacity-0 md:p-6"
        style={staggerStyle(0)}
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-slate-400/3 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-60 w-60 rounded-full bg-slate-300/3 blur-3xl" />

        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <h1 className="max-w-3xl text-2xl font-semibold tracking-tight md:text-4xl">
            Como podemos ajudar?
          </h1>
          <Badge
            variant="outline"
            className="shrink-0 border-slate-400/15 bg-muted/30 text-muted-foreground"
          >
            {metrics.totalPages} páginas disponíveis
          </Badge>
        </div>

        <LargeSearchToggle className="h-11 min-w-65 w-full flex-1 justify-start rounded-xl border-border/70 bg-background/85 text-sm" />

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <HeroMetric icon={Compass} label="Trilhas iniciais" value={startTasks.length} />
          <HeroMetric icon={History} label="Recentes" value={derived.recent.length} />
          <HeroMetric icon={BarChart3} label="Insights ativos" value={metrics.insightCount} />
        </div>
      </section>

      {/* Acesso rápido */}
      <section className="animate-docs-fade-up space-y-3 opacity-0" style={staggerStyle(1)}>
        <DocsSectionHeader icon={LayoutDashboard} label="Acesso rápido" />
        <div className="grid gap-3 sm:grid-cols-2">
          {quickLinks.map((item, index) => (
            <PremiumLinkCard key={item.href} item={item} style={staggerStyle(index + 2)} />
          ))}
        </div>
      </section>

      {/* Continuar leitura */}
      {derived.continueReading ? (
        <section className="animate-docs-fade-up opacity-0" style={staggerStyle(3)}>
          <DocsSectionHeader icon={History} label="Continuar leitura" />
          <Link
            href={derived.continueReading.href}
            className="group flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:bg-accent"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-medium">
                  {derived.continueReading.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  Último acesso em {formatDateTime(derived.continueReading.visitedAt)}
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        </section>
      ) : null}

      {/* Insights de uso */}
      <section className="animate-docs-fade-up space-y-3 opacity-0" style={staggerStyle(4)}>
        <DocsSectionHeader icon={TrendingUp} label="Insights de uso" />
        <div className="rounded-2xl border border-border/60 bg-card/40 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Painel de inteligência
            </p>
            <Badge
              variant="outline"
              className="border-slate-400/15 bg-muted/20 text-[11px] text-muted-foreground"
            >
              Atualização contínua
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Últimas atualizações */}
            <InsightCard icon={Clock} label="Últimas atualizações">
              {derived.latestUpdates.length === 0 ? (
                <DocsEmptyState message="Nenhuma atualização." />
              ) : (
                <div className="space-y-1.5">
                  {derived.latestUpdates.map((item) => (
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
                  ))}
                </div>
              )}
            </InsightCard>

            {/* Mais acessados por você */}
            <InsightCard icon={Flame} label="Mais acessados por você">
              {derived.mostAccessed.length === 0 ? (
                <DocsEmptyState message="Nenhum dado." />
              ) : (
                <div className="space-y-1.5">
                  {derived.mostAccessed.map((item) => (
                    <InsightLink
                      key={item.href}
                      href={item.href}
                      title={item.title}
                      meta={<CountBadge count={item.count} />}
                    />
                  ))}
                </div>
              )}
            </InsightCard>

            {/* Populares por perfil — com Skeleton durante loading */}
            <InsightCard
              icon={Users}
              label={ROLE_LABELS[status.roleSegment]}
              loading={status.loadingInsights}
            >
              {derived.rolePopular.length === 0 ? (
                <DocsEmptyState message="Ainda sem ranking por perfil." />
              ) : (
                <div className="space-y-1.5">
                  {derived.rolePopular.map((item) => (
                    <InsightLink
                      key={`role-${item.href}`}
                      href={item.href}
                      title={item.title}
                      meta={<CountBadge count={item.count} />}
                    />
                  ))}
                </div>
              )}
            </InsightCard>

            {/* Populares na base — com Skeleton durante loading */}
            <InsightCard
              icon={TrendingUp}
              label="Populares na base"
              loading={status.loadingInsights}
            >
              {derived.globalPopular.length === 0 ? (
                <DocsEmptyState message="Ainda sem ranking global." />
              ) : (
                <div className="space-y-1.5">
                  {derived.globalPopular.map((item) => (
                    <InsightLink
                      key={`global-${item.href}`}
                      href={item.href}
                      title={item.title}
                      meta={<CountBadge count={item.count} />}
                    />
                  ))}
                </div>
              )}
            </InsightCard>
          </div>
        </div>
      </section>

      <style jsx global>{`
        @media (prefers-reduced-motion: no-preference) {
          .animate-docs-fade-up {
            animation: docsFadeUp 320ms cubic-bezier(0.2, 0.65, 0.2, 1) forwards;
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
