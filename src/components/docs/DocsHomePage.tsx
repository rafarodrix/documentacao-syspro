'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';
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
  Search,
} from 'lucide-react';
import { LargeSearchToggle } from 'fumadocs-ui/components/layout/search-toggle';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DocsSectionHeader } from '@/components/docs/DocsSectionHeader';
import { DocsEmptyState } from '@/components/docs/DocsEmptyState';
import { MagicCard } from '@/components/magicui/magic-card';
import { ShineBorder } from '@/components/magicui/shine-border';

type DocsHomeEntry = { href: string; title: string; description?: string; lastUpdated?: string; };
type DocsRecentItem = { href: string; title: string; visitedAt: number; };
type PopularMap = Record<string, { title: string; count: number; lastVisited: number }>;
type PopularItem = { href: string; title: string; count: number; lastViewed: number };
type RoleSegment = 'admin' | 'developer' | 'suporte' | 'cliente_admin' | 'cliente_user';
type ContinueReadingItem = { href: string; title: string; visitedAt: number; };
type QuickLinkTone = 'docs' | 'faq' | 'training' | 'support' | 'technical';

type QuickLink = {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
  tone: QuickLinkTone;
};

const RECENT_KEY = 'docs:recent';
const POPULAR_KEY = 'docs:popular';

const BASE_QUICK_LINKS: QuickLink[] = [
  { href: '/docs/manual', title: 'Documentação', description: 'Guias e módulos para o dia a dia.', icon: BookOpen, tone: 'docs' },
  { href: '/docs/duvidas', title: 'Dúvidas frequentes', description: 'Respostas para incidentes comuns.', icon: HelpCircle, tone: 'faq' },
  { href: '/docs/treinamento', title: 'Treinamentos', description: 'Trilhas de capacitação da equipe.', icon: Users, tone: 'training' },
  { href: '/docs/suporte', title: 'Suporte', description: 'Processos, integrações e operação.', icon: Wrench, tone: 'support' },
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

const TONE_STYLES: Record<QuickLinkTone, { shineColor: string[]; pillClass: string; glowClass: string; }> = {
  docs: { shineColor: ['#94a3b822', '#64748b18'], pillClass: 'border-slate-400/20 bg-slate-500/5 text-slate-200', glowClass: 'from-slate-400/8' },
  faq: { shineColor: ['#94a3b822', '#47556918'], pillClass: 'border-slate-400/20 bg-slate-500/5 text-slate-200', glowClass: 'from-slate-400/8' },
  training: { shineColor: ['#94a3b822', '#64748b18'], pillClass: 'border-slate-400/20 bg-slate-500/5 text-slate-200', glowClass: 'from-slate-400/8' },
  support: { shineColor: ['#94a3b822', '#47556918'], pillClass: 'border-slate-400/20 bg-slate-500/5 text-slate-200', glowClass: 'from-slate-400/8' },
  technical: { shineColor: ['#cbd5e122', '#64748b18'], pillClass: 'border-slate-300/20 bg-slate-400/5 text-slate-100', glowClass: 'from-slate-300/8' },
};

const staggerStyle = (index: number): CSSProperties => ({ animationDelay: `${Math.min(index * 70, 700)}ms` });
const parseDate = (date?: string): number => date ? (Number.isNaN(Date.parse(date)) ? 0 : Date.parse(date)) : 0;
const formatDate = (date?: string): string | null => {
  if (!date) return null;
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? null : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(value);
};
const formatDateTime = (timestamp: number): string => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(timestamp));
const readLocalStorage = <T,>(key: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return fallback; }
};

function useDocsDashboard(pages: DocsHomeEntry[], role: Role, canViewTechnical: boolean) {
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

    const fetchInsights = async () => {
      try {
        const res = await fetch('/api/docs/views', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.roleSegment) setRoleSegment(data.roleSegment);
        if (Array.isArray(data.globalPopular)) setGlobalPopular(data.globalPopular);
        if (Array.isArray(data.rolePopular)) setRolePopular(data.rolePopular);
        if (data.lastRead?.href && typeof data.lastRead.visitedAt === 'number') {
          setLastReadApi(data.lastRead);
        }
      } catch (error) {
        console.error('Failed to fetch docs insights:', error);
      } finally {
        setLoadingInsights(false);
      }
    };

    void fetchInsights();
  }, []);

  const pageByHref = useMemo(() => new Map(pages.map((p) => [p.href, p])), [pages]);

  const latestUpdates = useMemo(() => 
    [...pages].sort((a, b) => parseDate(b.lastUpdated) - parseDate(a.lastUpdated)).slice(0, 5), 
  [pages]);

  const mostAccessed = useMemo(() => 
    Object.entries(popularItems)
      .sort(([, a], [, b]) => (b.count !== a.count ? b.count - a.count : b.lastVisited - a.lastVisited))
      .map(([href, stats]) => ({ href, title: pageByHref.get(href)?.title ?? stats.title, count: stats.count }))
      .slice(0, 5), 
  [pageByHref, popularItems]);

  const recent = useMemo(() => 
    recentItems.map((entry) => ({ href: entry.href, title: pageByHref.get(entry.href)?.title ?? entry.title, visitedAt: entry.visitedAt })).slice(0, 5), 
  [pageByHref, recentItems]);

  const continueReading = useMemo(() => {
    const source = lastReadApi ?? recentItems[0] ?? null;
    return source ? { href: source.href, title: pageByHref.get(source.href)?.title ?? source.title, visitedAt: source.visitedAt } : null;
  }, [lastReadApi, pageByHref, recentItems]);

  const quickLinks = useMemo(() => {
    const links = [...BASE_QUICK_LINKS];
    if (canViewTechnical) {
      links.push({ href: '/docs/manuais-tecnicos', title: 'Manuais técnicos', description: 'Arquitetura, backlog e padrões.', icon: Wrench, tone: 'technical' });
    }
    return links;
  }, [canViewTechnical]);

  const startTasks = useMemo(() => {
    const tasks = ROLE_START_TASKS[role] ?? ROLE_START_TASKS.CLIENTE_USER;
    return canViewTechnical ? tasks : tasks.filter((task) => !task.href.startsWith('/docs/manuais-tecnicos'));
  }, [role, canViewTechnical]);

  return {
    status: { roleSegment, loadingInsights },
    derived: { latestUpdates, mostAccessed, recent, continueReading, quickLinks, startTasks, globalPopular, rolePopular },
    metrics: { totalPages: pages.length, insightCount: rolePopular.length + globalPopular.length + mostAccessed.length }
  };
}

function HeroMetric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/70 bg-background/60 p-3 transition-colors hover:border-border hover:bg-background/75">
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <Badge variant="secondary" className="ml-2 shrink-0 rounded-md border border-border/60 bg-card tabular-nums">
      {count}
    </Badge>
  );
}

function InsightLink({ href, title, meta }: { href: string; title: string; meta?: ReactNode }) {
  return (
    <Link href={href} className="group relative flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/70 px-3 py-2.5 text-sm transition-all hover:border-primary/35 hover:bg-accent/60">
      <span className="absolute inset-y-1 left-1 w-[2px] rounded bg-primary/70 opacity-0 transition-opacity group-hover:opacity-100" />
      <span className="line-clamp-2 leading-snug">{title}</span>
      {meta ?? <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />}
    </Link>
  );
}

function PremiumLinkCard({ item, style }: { item: QuickLink; style?: CSSProperties }) {
  const Icon = item.icon;
  const tone = TONE_STYLES[item.tone];

  return (
    <Link href={item.href} className="group block animate-docs-fade-up opacity-0" style={style}>
      <MagicCard className="h-full rounded-2xl">
        <div className="relative h-full rounded-2xl border border-border/70 bg-card/70 p-4 transition-colors sm:p-5 group-hover:bg-card">
          <div className={cn('pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br to-transparent opacity-20', tone.glowClass)} />
          <ShineBorder shineColor={tone.shineColor} duration={11} className="opacity-15" />
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="space-y-2">
              <span className={cn('inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs', tone.pillClass)}>
                <Icon className="h-3.5 w-3.5" /> {item.title}
              </span>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          </div>
        </div>
      </MagicCard>
    </Link>
  );
}

function InsightCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-4 shadow-[0_10px_24px_-24px_rgba(15,23,42,0.55)]', className)}>
      <ShineBorder shineColor={['#cbd5e10d', '#64748b0a']} duration={15} className="opacity-15" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

type DocsHomePageProps = {
  pages: DocsHomeEntry[];
  canViewTechnical: boolean;
  role: Role;
};

export function DocsHomePage({ pages, canViewTechnical, role }: DocsHomePageProps) {
  const { status, derived, metrics } = useDocsDashboard(pages, role, canViewTechnical);

  const openSearch = () => {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: !isMac,
      metaKey: isMac,
      bubbles: true,
    }));
  };

  return (
    <div className="space-y-10 pb-28">
      <section className="relative animate-docs-fade-up overflow-hidden rounded-2xl border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] bg-card p-6 opacity-0 md:p-8" style={staggerStyle(0)}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-slate-400/3 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-60 w-60 rounded-full bg-slate-300/3 blur-3xl" />
        
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-slate-400/15 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Central de documentação
            </div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">Como podemos ajudar?</h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              Busque por guias, módulos, dúvidas frequentes e processos operacionais. Use{' '}
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">Ctrl K</kbd> em qualquer página para acesso rápido.
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 border-slate-400/15 bg-muted/30 text-muted-foreground">{metrics.totalPages} páginas disponíveis</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <LargeSearchToggle className="h-11 min-w-[260px] flex-1 justify-start rounded-xl border-border/70 bg-background/85 text-sm" />
          <Link href="/docs/manual" className="inline-flex h-11 items-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-5 text-sm font-medium transition-colors hover:bg-accent">
            <BookOpen className="h-4 w-4" /> Ver manual
          </Link>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <HeroMetric icon={Compass} label="Trilhas iniciais" value={derived.startTasks.length} />
          <HeroMetric icon={History} label="Recentes" value={derived.recent.length} />
          <HeroMetric icon={BarChart3} label="Insights ativos" value={metrics.insightCount} />
        </div>
      </section>

      <section className="animate-docs-fade-up space-y-3 opacity-0" style={staggerStyle(1)}>
        <DocsSectionHeader icon={LayoutDashboard} label="Acesso rápido" />
        <div className="grid gap-3 sm:grid-cols-2">
          {derived.quickLinks.map((item, index) => (
            <PremiumLinkCard key={item.href} item={item} style={staggerStyle(index + 2)} />
          ))}
        </div>
      </section>

      <section className="animate-docs-fade-up space-y-3 opacity-0" style={staggerStyle(3)}>
        <DocsSectionHeader icon={LayoutDashboard} label="Comece por aqui" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {derived.startTasks.map((item) => (
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

      {derived.continueReading && (
        <section className="animate-docs-fade-up opacity-0" style={staggerStyle(3.5)}>
          <DocsSectionHeader icon={History} label="Continuar leitura" />
          <Link href={derived.continueReading.href} className="group flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:bg-accent">
            <div className="min-w-0 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-medium">{derived.continueReading.title}</p>
                <p className="text-xs text-muted-foreground">Último acesso em {formatDateTime(derived.continueReading.visitedAt)}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        </section>
      )}

      <section className="animate-docs-fade-up space-y-3 opacity-0" style={staggerStyle(4)}>
        <DocsSectionHeader icon={TrendingUp} label="Insights de uso" />
        <div className="rounded-2xl border border-border/60 bg-card/40 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Painel de inteligência</p>
            <Badge variant="outline" className="border-slate-400/15 bg-muted/20 text-[11px] text-muted-foreground">Atualização contínua</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            
            <InsightCard>
              <DocsSectionHeader icon={Clock} label="Últimas atualizações" />
              {derived.latestUpdates.length === 0 ? <DocsEmptyState message="Nenhuma atualização." /> : (
                <div className="space-y-1.5">
                  {derived.latestUpdates.map(item => (
                    <InsightLink key={item.href} href={item.href} title={item.title} meta={formatDate(item.lastUpdated) && <span className="text-xs text-muted-foreground">{formatDate(item.lastUpdated)}</span>} />
                  ))}
                </div>
              )}
            </InsightCard>

            <InsightCard>
              <DocsSectionHeader icon={Flame} label="Mais acessados por você" />
              {derived.mostAccessed.length === 0 ? <DocsEmptyState message="Nenhum dado." /> : (
                <div className="space-y-1.5">
                  {derived.mostAccessed.map(item => (
                    <InsightLink key={item.href} href={item.href} title={item.title} meta={<CountBadge count={item.count} />} />
                  ))}
                </div>
              )}
            </InsightCard>

            <InsightCard>
              <DocsSectionHeader icon={Users} label={ROLE_LABELS[status.roleSegment]} />
              {status.loadingInsights ? <DocsEmptyState message="Carregando ranking por perfil..." /> : derived.rolePopular.length === 0 ? <DocsEmptyState message="Ainda sem ranking por perfil." /> : (
                <div className="space-y-1.5">
                  {derived.rolePopular.map(item => (
                    <InsightLink key={`role-${item.href}`} href={item.href} title={item.title} meta={<CountBadge count={item.count} />} />
                  ))}
                </div>
              )}
            </InsightCard>

            <InsightCard>
              <DocsSectionHeader icon={TrendingUp} label="Populares na base" />
              {status.loadingInsights ? <DocsEmptyState message="Carregando ranking global..." /> : derived.globalPopular.length === 0 ? <DocsEmptyState message="Ainda sem ranking global." /> : (
                <div className="space-y-1.5">
                  {derived.globalPopular.map(item => (
                    <InsightLink key={`global-${item.href}`} href={item.href} title={item.title} meta={<CountBadge count={item.count} />} />
                  ))}
                </div>
              )}
            </InsightCard>
          </div>
        </div>
      </section>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4">
        <div className="pointer-events-auto flex w-full max-w-3xl items-center justify-between gap-2 rounded-2xl border border-border/60 bg-background/95 p-2 backdrop-blur-md sm:gap-3 shadow-[0_8px_24px_-24px_rgba(15,23,42,0.65)]">
          <button onClick={openSearch} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 text-sm font-medium transition-colors hover:bg-accent">
            <Search className="h-4 w-4" /> Abrir busca
          </button>
          <Link href={derived.startTasks[0]?.href ?? '/docs/manual'} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300/15 bg-slate-200/5 px-3 text-sm font-medium text-foreground transition-colors hover:bg-slate-200/10">
            Ver trilha recomendada <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <style jsx global>{`
        @media (prefers-reduced-motion: no-preference) {
          .animate-docs-fade-up { animation: docsFadeUp 320ms cubic-bezier(0.2, 0.65, 0.2, 1) forwards; }
          @keyframes docsFadeUp {
            0% { opacity: 0; transform: translateY(8px); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
        }
      `}</style>
    </div>
  );
}
