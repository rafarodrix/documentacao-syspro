'use client';

import { useMemo, type CSSProperties } from 'react';
import Link from 'next/link';
import type { Role } from '@prisma/client';
import {
  ArrowRight,
  BookOpen,
  Clock,
  Compass,
  Flame,
  History,
  Orbit,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DocsSectionHeader } from '@/components/docs/DocsSectionHeader';
import { DocsEmptyState } from '@/components/docs/DocsEmptyState';
import { formatDateMedium, formatDateTime } from '@/lib/docs-utils';
import { useDocsDashboard, type DocsHomeEntry } from './use-docs-dashboard';
import {
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
  const { status, derived } = useDocsDashboard(pages, role, canViewTechnical);

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

  const featuredUpdates = derived.latestUpdates.slice(0, 3);

  return (
    <div className="docs-home-page space-y-6 pb-12">
      <section
        className="relative animate-docs-fade-up overflow-hidden rounded-[34px] border border-border/60 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.16),transparent_30%),linear-gradient(180deg,hsl(var(--background)/0.98),hsl(var(--card)/0.96))] p-6 opacity-0 shadow-[0_28px_80px_-48px_hsl(var(--foreground)/0.65)] md:p-8"
        style={staggerStyle(0)}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.12)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.12)_1px,transparent_1px)] bg-size-[22px_22px] mask-[radial-gradient(ellipse_80%_70%_at_50%_0%,#000_65%,transparent_100%)] opacity-60" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-[34rem] -translate-x-1/2 rounded-full bg-primary/12 blur-[120px]" />

        <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="rounded-full border-primary/20 bg-background/80 px-3 py-1 text-primary">
                <Sparkles className="mr-1.5 h-3 w-3" />
                Central de ajuda no portal
              </Badge>
              <Badge variant="outline" className="rounded-full border-border/60 bg-background/70 px-3 py-1 text-muted-foreground">
                Publico: {ROLE_LABELS[status.roleSegment]}
              </Badge>
            </div>

            <div className="max-w-4xl">
              <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl md:leading-[1.05]">
                A central oficial da documentacao Syspro ERP, com navegacao mais limpa e direta.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                Consulte manuais, duvidas frequentes, treinamentos e conteudos tecnicos sem ruido visual, com atalhos mais claros e um fluxo mais proximo da home principal do portal.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/portal/docs/manual" className="no-underline">
                <Button size="lg" className="h-12 px-6 text-sm font-semibold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5">
                  Explorar documentacao
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/portal/docs/duvidas" className="no-underline">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 border-border/60 bg-background/55 px-6 text-sm font-medium backdrop-blur-md transition-all hover:bg-accent/50"
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Ir para duvidas frequentes
                </Button>
              </Link>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {startTasks.map((task, index) => (
                <Link
                  key={task.href}
                  href={task.href}
                  className="group animate-docs-fade-up rounded-[28px] border border-border/60 bg-background/55 p-5 no-underline opacity-0 shadow-[0_20px_50px_-40px_hsl(var(--foreground)/0.8)] transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:bg-background/72"
                  style={staggerStyle(index + 1)}
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

            <div className="grid gap-3 lg:grid-cols-2">
              {quickLinks.map((item, index) => (
                <PremiumLinkCard key={item.href} item={item} style={staggerStyle(index + 4)} />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[30px] border border-border/60 bg-background/58 p-5 shadow-[0_22px_60px_-42px_hsl(var(--foreground)/0.8)] backdrop-blur-xl">
              <DocsSectionHeader icon={Compass} label="Em destaque" />
              <div className="rounded-[24px] border border-border/60 bg-background/75 p-4">
                <p className="text-sm font-semibold text-foreground">{ROLE_LABELS[status.roleSegment]}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Conteudo filtrado para o perfil atual, com prioridade para paginas operacionais e fluxos de consulta mais frequentes.
                </p>
              </div>

              <div className="mt-5">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Atualizacoes recentes
                </p>
                <div className="space-y-2">
                  {featuredUpdates.length === 0 ? (
                    <DocsEmptyState message="As proximas atualizacoes da base aparecerao aqui." />
                  ) : (
                    featuredUpdates.map((item) => (
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
            </div>

            {derived.continueReading ? (
              <Link
                href={derived.continueReading.href}
                className="group flex items-center justify-between gap-4 rounded-[28px] border border-border/60 bg-card/45 p-4 no-underline shadow-sm transition-all hover:border-primary/20 hover:bg-accent/35"
              >
                <div className="min-w-0">
                  <DocsSectionHeader icon={History} label="Continuar leitura" />
                  <p className="line-clamp-1 text-sm font-semibold text-foreground">
                    {derived.continueReading.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ultimo acesso em {formatDateTime(derived.continueReading.visitedAt)}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section id="insights" className="scroll-mt-24 animate-docs-fade-up space-y-3 rounded-[32px] border border-border/60 bg-card/35 p-5 opacity-0 shadow-sm sm:p-6" style={staggerStyle(5)}>
        <DocsSectionHeader icon={TrendingUp} label="Radar de uso" />
        <div className="rounded-[28px] border border-border/60 bg-background/70 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Painel de inteligencia
            </p>
            <Badge
              variant="outline"
              className="border-primary/15 bg-primary/5 text-[11px] text-primary"
            >
              Atualizacao continua
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="w-full shrink-0">
              <InsightCard icon={Clock} label="Ultimas atualizacoes">
                {derived.latestUpdates.length === 0 ? (
                  <DocsEmptyState message="Explore os manuais basicos para comecar." />
                ) : (
                  <div className="space-y-1">
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
            </div>

            <div className="w-full shrink-0">
              <InsightCard icon={Flame} label="Mais acessados por voce">
                {derived.mostAccessed.length === 0 ? (
                  <DocsEmptyState message="Seu historico aparecera aqui em breve." />
                ) : (
                  <div className="space-y-1">
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
            </div>

            <div className="w-full shrink-0">
              <InsightCard
                icon={Users}
                label={ROLE_LABELS[status.roleSegment]}
                loading={status.loadingInsights}
              >
                {derived.rolePopular.length === 0 ? (
                  <DocsEmptyState message="Nenhum ranking disponivel no momento." />
                ) : (
                  <div className="space-y-1">
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
            </div>

            <div className="w-full shrink-0">
              <InsightCard
                icon={Orbit}
                label="Populares na base"
                loading={status.loadingInsights}
              >
                {derived.globalPopular.length === 0 ? (
                  <DocsEmptyState message="Nenhum ranking disponivel no momento." />
                ) : (
                  <div className="space-y-1">
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
        </div>
      </section>

      <style jsx global>{`
        .docs-home-page a {
          text-decoration: none;
        }

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
