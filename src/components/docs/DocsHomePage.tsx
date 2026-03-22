'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Role } from '@prisma/client';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock,
  Compass,
  Flame,
  HelpCircle,
  History,
  LayoutDashboard,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react';
import { LargeSearchToggle } from 'fumadocs-ui/components/layout/search-toggle';
import { Callout } from 'fumadocs-ui/components/callout';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DocsSectionHeader } from '@/components/docs/DocsSectionHeader';
import { DocsEmptyState } from '@/components/docs/DocsEmptyState';
import { MagicCard } from '@/components/magicui/magic-card';
import { ShineBorder } from '@/components/magicui/shine-border';

type DocsHomeEntry = {
  href: string;
  title: string;
  description?: string;
  lastUpdated?: string;
};

type DocsRecentItem = {
  href: string;
  title: string;
  visitedAt: number;
};

type PopularMap = Record<string, { title: string; count: number; lastVisited: number }>;
type PopularItem = { href: string; title: string; count: number; lastViewed: number };
type RoleSegment = 'admin' | 'developer' | 'suporte' | 'cliente_admin' | 'cliente_user';
type ContinueReadingItem = {
  href: string;
  title: string;
  visitedAt: number;
};
type QuickLink = {
  href: string;
  title: string;
  description: string;
  icon: typeof BookOpen | typeof HelpCircle | typeof Users | typeof Wrench | typeof Compass;
};

const RECENT_KEY = 'docs:recent';
const POPULAR_KEY = 'docs:popular';

const BASE_QUICK_LINKS: QuickLink[] = [
  {
    href: '/docs/manual',
    title: 'Documentação',
    description: 'Guias e módulos para o dia a dia.',
    icon: BookOpen,
  },
  {
    href: '/docs/duvidas',
    title: 'Dúvidas frequentes',
    description: 'Respostas para incidentes comuns.',
    icon: HelpCircle,
  },
  {
    href: '/docs/treinamento',
    title: 'Treinamentos',
    description: 'Trilhas de capacitação da equipe.',
    icon: Users,
  },
  {
    href: '/docs/suporte',
    title: 'Suporte',
    description: 'Processos, integrações e operação.',
    icon: Wrench,
  },
];

const ROLE_START_TASKS: Record<Role, Array<{ href: string; title: string; description: string }>> = {
  ADMIN: [
    { href: '/docs/manuais-tecnicos', title: 'Arquitetura e backlog', description: 'Governança técnica e padrões.' },
    { href: '/docs/suporte', title: 'Operação de suporte', description: 'Fluxos de atendimento e escalonamento.' },
    { href: '/docs/manual', title: 'Visão funcional do produto', description: 'Conteúdo orientado ao cliente final.' },
  ],
  DEVELOPER: [
    { href: '/docs/manuais-tecnicos', title: 'Manuais técnicos', description: 'Infra, stack e decisões de arquitetura.' },
    { href: '/docs/suporte', title: 'Processos de suporte', description: 'Contexto de operação e troubleshooting.' },
    { href: '/docs/duvidas', title: 'Erros recorrentes', description: 'Base para correções rápidas.' },
  ],
  SUPORTE: [
    { href: '/docs/suporte', title: 'Procedimentos de suporte', description: 'Playbooks e processos operacionais.' },
    { href: '/docs/duvidas', title: 'Dúvidas e erros comuns', description: 'Resolução rápida de incidentes.' },
    { href: '/docs/treinamento', title: 'Treinamentos', description: 'Capacitação contínua do time.' },
  ],
  CLIENTE_ADMIN: [
    { href: '/docs/manual', title: 'Operação do sistema', description: 'Rotinas principais do dia a dia.' },
    { href: '/docs/treinamento', title: 'Treinar equipe', description: 'Materiais para onboarding interno.' },
    { href: '/docs/duvidas', title: 'Resolver problemas comuns', description: 'Perguntas e respostas rápidas.' },
  ],
  CLIENTE_USER: [
    { href: '/docs/manual', title: 'Primeiros passos', description: 'Fluxo básico para começar a operar.' },
    { href: '/docs/duvidas', title: 'Erros mais comuns', description: 'Como resolver os principais bloqueios.' },
    { href: '/docs/treinamento', title: 'Aprender mais rápido', description: 'Guias práticos por módulo.' },
  ],
};

const ROLE_LABELS: Record<RoleSegment, string> = {
  admin: 'Populares para admins',
  developer: 'Populares para developers',
  suporte: 'Populares no suporte',
  cliente_admin: 'Populares para cliente admin',
  cliente_user: 'Populares para clientes',
};


function parseDate(date?: string): number {
  if (!date) return 0;
  const ms = Date.parse(date);
  return Number.isNaN(ms) ? 0 : ms;
}

function formatDate(date?: string): string | null {
  if (!date) return null;
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(value);
}

function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(timestamp));
}

function readLocalStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function InsightCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-xl border border-border/60 bg-card/40 p-4', className)}>{children}</div>;
}

function PremiumLinkCard({ item }: { item: QuickLink }) {
  const Icon = item.icon;

  return (
    <Link href={item.href} className="group block">
      <MagicCard className="h-full rounded-2xl">
        <div className="relative h-full rounded-2xl p-4 sm:p-5">
          <ShineBorder shineColor={['#6aa9ff55', '#a78bfa66', '#22d3ee55']} duration={11} className="opacity-70" />
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {item.title}
              </span>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-foreground" />
          </div>
        </div>
      </MagicCard>
    </Link>
  );
}

function InsightLink({ href, title, meta }: { href: string; title: string; meta?: ReactNode }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm transition-colors hover:bg-accent"
    >
      <span className="line-clamp-2 leading-snug">{title}</span>
      {meta ?? (
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </Link>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <Badge variant="secondary" className="ml-2 shrink-0 tabular-nums">
      {count}
    </Badge>
  );
}

function InsightSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="mt-1.5 h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function DocsHomePage({
  pages,
  canViewTechnical,
  role,
}: {
  pages: DocsHomeEntry[];
  canViewTechnical: boolean;
  role: Role;
}) {
  const [recentItems, setRecentItems] = useState<DocsRecentItem[]>([]);
  const [popularItems, setPopularItems] = useState<PopularMap>({});
  const [globalPopular, setGlobalPopular] = useState<PopularItem[]>([]);
  const [rolePopular, setRolePopular] = useState<PopularItem[]>([]);
  const [roleSegment, setRoleSegment] = useState<RoleSegment>('cliente_user');
  const [lastReadApi, setLastReadApi] = useState<ContinueReadingItem | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(true);

  useEffect(() => {
    setRecentItems(readLocalStorage<DocsRecentItem[]>(RECENT_KEY, []));
    setPopularItems(readLocalStorage<PopularMap>(POPULAR_KEY, {}));

    void fetch('/api/docs/views', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{
          ok?: boolean;
          roleSegment?: RoleSegment;
          globalPopular?: PopularItem[];
          rolePopular?: PopularItem[];
          lastRead?: ContinueReadingItem | null;
        }>;
      })
      .then((data) => {
        if (!data?.ok) return;
        if (data.roleSegment) setRoleSegment(data.roleSegment);
        if (Array.isArray(data.globalPopular)) setGlobalPopular(data.globalPopular);
        if (Array.isArray(data.rolePopular)) setRolePopular(data.rolePopular);
        if (data.lastRead?.href && typeof data.lastRead.visitedAt === 'number') {
          setLastReadApi(data.lastRead);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoadingInsights(false));
  }, []);

  const pageByHref = useMemo(() => new Map(pages.map((p) => [p.href, p])), [pages]);

  const latestUpdates = useMemo(
    () => [...pages].sort((a, b) => parseDate(b.lastUpdated) - parseDate(a.lastUpdated)).slice(0, 5),
    [pages],
  );

  const mostAccessed = useMemo(
    () =>
      Object.entries(popularItems)
        .sort(([, a], [, b]) => (b.count !== a.count ? b.count - a.count : b.lastVisited - a.lastVisited))
        .map(([href, stats]) => ({
          href,
          title: pageByHref.get(href)?.title ?? stats.title,
          count: stats.count,
        }))
        .slice(0, 5),
    [pageByHref, popularItems],
  );

  const recent = useMemo(
    () =>
      recentItems
        .map((entry) => ({
          href: entry.href,
          title: pageByHref.get(entry.href)?.title ?? entry.title,
          visitedAt: entry.visitedAt,
        }))
        .slice(0, 5),
    [pageByHref, recentItems],
  );

  const continueReading = useMemo<ContinueReadingItem | null>(() => {
    const source = lastReadApi ?? recentItems[0] ?? null;
    if (!source) return null;
    return {
      href: source.href,
      title: pageByHref.get(source.href)?.title ?? source.title,
      visitedAt: source.visitedAt,
    };
  }, [lastReadApi, pageByHref, recentItems]);

  const quickLinks = useMemo(() => {
    const links = [...BASE_QUICK_LINKS];
    if (canViewTechnical) {
      links.push({
        href: '/docs/manuais-tecnicos',
        title: 'Manuais técnicos',
        description: 'Arquitetura, backlog e padrões de engenharia.',
        icon: Wrench,
      });
    }
    return links;
  }, [canViewTechnical]);

  const startTasks = useMemo(() => {
    const tasks = ROLE_START_TASKS[role] ?? ROLE_START_TASKS.CLIENTE_USER;
    if (!canViewTechnical) return tasks.filter((task) => !task.href.startsWith('/docs/manuais-tecnicos'));
    return tasks;
  }, [role, canViewTechnical]);

  const insightCount = useMemo(
    () => rolePopular.length + globalPopular.length + mostAccessed.length,
    [globalPopular.length, mostAccessed.length, rolePopular.length],
  );

  return (
    <div className="space-y-8 pb-10">
      <section className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-6 md:p-8">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              Central de documentação
            </div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Como podemos ajudar?</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Busque por guias, módulos, dúvidas frequentes e processos operacionais. Use{' '}
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">Ctrl K</kbd> em
              qualquer página para acesso rápido.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className="shrink-0 text-muted-foreground">
              {pages.length} páginas disponíveis
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <LargeSearchToggle className="h-11 min-w-[260px] flex-1 justify-start rounded-xl border-border/70 bg-background/85 text-sm" />
          <Link
            href="/docs/manual"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-5 text-sm font-medium transition-colors hover:bg-accent"
          >
            <BookOpen className="h-4 w-4" />
            Ver manual
          </Link>
          <Link
            href="/docs/duvidas"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-5 text-sm font-medium transition-colors hover:bg-accent"
          >
            <HelpCircle className="h-4 w-4" />
            Dúvidas
          </Link>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-background/60 p-3">
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Compass className="h-3.5 w-3.5" />
              Trilhas iniciais
            </p>
            <p className="mt-1 text-lg font-semibold">{startTasks.length}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/60 p-3">
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <History className="h-3.5 w-3.5" />
              Recentes
            </p>
            <p className="mt-1 text-lg font-semibold">{recent.length}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/60 p-3">
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              Insights ativos
            </p>
            <p className="mt-1 text-lg font-semibold">{insightCount}</p>
          </div>
        </div>
      </section>

      <section>
        <DocsSectionHeader icon={LayoutDashboard} label="Acesso rápido" />
        <div className="grid gap-3 sm:grid-cols-2">
          {quickLinks.map((item) => (
            <PremiumLinkCard key={item.href} item={item} />
          ))}
        </div>
      </section>

      <section>
        <DocsSectionHeader icon={LayoutDashboard} label="Comece por aqui" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {startTasks.map((item) => (
            <Link key={item.href} href={item.href} className="group block">
              <MagicCard className="h-full rounded-2xl">
                <div className="relative h-full rounded-2xl p-4">
                  <ShineBorder shineColor={['#22d3ee40', '#38bdf855']} duration={13} className="opacity-60" />
                  <div className="relative z-10">
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </MagicCard>
            </Link>
          ))}
        </div>
      </section>

      {continueReading ? (
        <section>
          <DocsSectionHeader icon={History} label="Continuar leitura" />
          <Link
            href={continueReading.href}
            className="group flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:bg-accent"
          >
            <div className="min-w-0 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-medium">{continueReading.title}</p>
                <p className="text-xs text-muted-foreground">Último acesso em {formatDateTime(continueReading.visitedAt)}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        </section>
      ) : loadingInsights ? (
        <section>
          <Skeleton className="mb-3 h-4 w-32" />
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-4">
            <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        </section>
      ) : null}

      <section>
        <DocsSectionHeader icon={TrendingUp} label="Insights de uso" />
        <div className="grid gap-4 sm:grid-cols-2">
          <InsightCard>
            <DocsSectionHeader icon={Clock} label="Últimas atualizações" />
            {latestUpdates.length === 0 ? (
              <DocsEmptyState message="Nenhuma atualização recente." />
            ) : (
              <div className="space-y-1.5">
                {latestUpdates.map((item) => (
                  <InsightLink
                    key={item.href}
                    href={item.href}
                    title={item.title}
                    meta={
                      formatDate(item.lastUpdated) ? (
                        <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{formatDate(item.lastUpdated)}</span>
                      ) : undefined
                    }
                  />
                ))}
              </div>
            )}
          </InsightCard>

          <InsightCard>
            <DocsSectionHeader icon={Flame} label="Mais acessados por você" />
            {mostAccessed.length === 0 ? (
              <DocsEmptyState message="Nenhum dado de acesso ainda. Explore a documentação." />
            ) : (
              <div className="space-y-1.5">
                {mostAccessed.map((item) => (
                  <InsightLink key={item.href} href={item.href} title={item.title} meta={<CountBadge count={item.count} />} />
                ))}
              </div>
            )}
          </InsightCard>

          <InsightCard>
            <DocsSectionHeader icon={Users} label={ROLE_LABELS[roleSegment]} />
            {loadingInsights ? (
              <InsightSkeleton />
            ) : rolePopular.length === 0 ? (
              <DocsEmptyState message="Ainda sem ranking por perfil disponível." />
            ) : (
              <div className="space-y-1.5">
                {rolePopular.slice(0, 5).map((item) => (
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

          <InsightCard>
            <DocsSectionHeader icon={TrendingUp} label="Populares na base" />
            {loadingInsights ? (
              <InsightSkeleton />
            ) : globalPopular.length === 0 ? (
              <DocsEmptyState message="Ainda sem ranking global disponível." />
            ) : (
              <div className="space-y-1.5">
                {globalPopular.slice(0, 5).map((item) => (
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
      </section>

      <section>
        <DocsSectionHeader icon={History} label="Páginas recentes" />
        {recent.length === 0 ? (
          <DocsEmptyState message="Você ainda não abriu nenhuma página." />
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {recent.map((item) => (
              <InsightLink
                key={item.href}
                href={item.href}
                title={item.title}
                meta={<span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(item.visitedAt)}</span>}
              />
            ))}
          </div>
        )}
      </section>

      <Callout type="info" title="Dica de produtividade">
        Use <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">Ctrl K</kbd> para
        abrir a busca em qualquer página e navegar instantaneamente pelo conteúdo.
      </Callout>
    </div>
  );
}
