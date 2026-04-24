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
import { LargeSearchToggle } from 'fumadocs-ui/components/layout/search-toggle';
import { Badge } from '@/components/ui/badge';
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
    <div className="space-y-6 pb-12">
      <section
        className="relative animate-docs-fade-up overflow-hidden rounded-[32px] border border-border/60 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_28%),radial-gradient(circle_at_85%_20%,hsl(var(--accent)/0.12),transparent_24%),linear-gradient(145deg,hsl(var(--card)/0.96),hsl(var(--background)/0.94))] p-6 opacity-0 shadow-[0_28px_80px_-46px_hsl(var(--foreground)/0.5)] md:p-8"
        style={staggerStyle(0)}
      >
        <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-white/6 blur-[90px]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_320px]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="w-fit rounded-full border-primary/20 bg-primary/8 px-3 text-primary">
                <Sparkles className="mr-1.5 h-3 w-3" />
                Curadoria da central de ajuda
              </Badge>
              <Badge variant="outline" className="w-fit rounded-full border-border/60 bg-background/50 px-3 text-muted-foreground">
                Publico: {ROLE_LABELS[status.roleSegment]}
              </Badge>
            </div>

            <div>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
                Documentacao premium, pensada para consulta rapida.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                Centralize manuais, duvidas frequentes, treinamentos e materiais tecnicos em uma entrada unica, com visual mais limpo e foco real no que precisa ser encontrado.
              </p>
            </div>

            <div className="rounded-[28px] border border-border/60 bg-background/45 p-3 shadow-[inset_0_1px_0_hsl(var(--background)/0.45)] backdrop-blur-xl">
              <LargeSearchToggle className="h-14 w-full justify-start rounded-[22px] border-0 bg-background/70 px-4 text-left text-sm shadow-none" />
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  'Manuais por modulo',
                  'FAQ operacional',
                  canViewTechnical ? 'Guias tecnicos liberados' : 'Treinamentos da equipe',
                ].map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center rounded-full border border-border/60 bg-background/55 px-3 py-1 text-[11px] font-medium text-muted-foreground"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {startTasks.map((task, index) => (
                <Link
                  key={task.href}
                  href={task.href}
                  className="group animate-docs-fade-up rounded-[26px] border border-border/60 bg-background/40 p-4 opacity-0 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:bg-background/60"
                  style={staggerStyle(index + 1)}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Trilha sugerida
                  </p>
                  <p className="mt-3 text-base font-semibold tracking-tight text-foreground">{task.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{task.description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                    Abrir secao
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[30px] border border-border/60 bg-background/50 p-5 shadow-[0_22px_60px_-42px_hsl(var(--foreground)/0.7)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Em destaque
            </p>
            <div className="mt-4 rounded-[24px] border border-border/60 bg-background/70 p-4">
              <p className="text-sm font-semibold text-foreground">{ROLE_LABELS[status.roleSegment]}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Conteudo filtrado para o perfil atual, priorizando paginas com maior aderencia operacional.
              </p>
            </div>

            <div className="mt-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
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
        </div>
      </section>

      <section
        id="acesso-rapido"
        className="scroll-mt-24 animate-docs-fade-up space-y-4 rounded-[32px] border border-border/60 bg-card/35 p-5 opacity-0 shadow-sm sm:p-6"
        style={staggerStyle(1)}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <DocsSectionHeader icon={Compass} label="Acesso rapido" />
            <p className="max-w-2xl text-sm text-muted-foreground">
              Entradas organizadas para quem quer navegar por tema, operacao ou time sem depender de contadores redundantes.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full border-border/60 bg-background/45 px-3 py-1 text-xs text-muted-foreground">
            Base viva dentro do portal
          </Badge>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {quickLinks.map((item, index) => (
            <PremiumLinkCard key={item.href} item={item} style={staggerStyle(index + 3)} />
          ))}
        </div>
      </section>

      {derived.continueReading ? (
        <section id="continuar-leitura" className="scroll-mt-24 animate-docs-fade-up rounded-[32px] border border-border/60 bg-card/40 p-5 opacity-0 shadow-sm sm:p-6" style={staggerStyle(3)}>
          <DocsSectionHeader icon={History} label="Continuar leitura" />
          <Link
            href={derived.continueReading.href}
            className="group flex items-center justify-between gap-4 rounded-[24px] border border-border/60 bg-background/80 p-4 transition-all hover:border-primary/20 hover:bg-accent"
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
                  Ultimo acesso em {formatDateTime(derived.continueReading.visitedAt)}
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        </section>
      ) : null}

      <section id="insights" className="scroll-mt-24 animate-docs-fade-up space-y-3 rounded-[32px] border border-border/60 bg-card/40 p-5 opacity-0 shadow-sm sm:p-6" style={staggerStyle(4)}>
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
