'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clock3, Flame, Sparkles } from 'lucide-react';
import { LargeSearchToggle } from 'fumadocs-ui/components/layout/search-toggle';
import { Cards, Card } from 'fumadocs-ui/components/card';
import { Callout } from 'fumadocs-ui/components/callout';
import { Skeleton } from '@/components/ui/skeleton';

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
type RoleSegment = 'cliente' | 'suporte' | 'admin';

const RECENT_STORAGE_KEY = 'docs:recent';
const POPULAR_STORAGE_KEY = 'docs:popular';

const QUICK_LINKS = [
  { href: '/docs/manual', title: 'Documentação', description: 'Guias e módulos de uso diário.' },
  { href: '/docs/duvidas', title: 'Dúvidas Frequentes', description: 'Respostas rápidas para incidentes comuns.' },
  { href: '/docs/treinamento', title: 'Treinamentos', description: 'Trilhas para capacitação da equipe.' },
  { href: '/docs/suporte', title: 'Suporte', description: 'Processos, integrações e operação.' },
];

function parseDate(date?: string) {
  if (!date) return 0;
  const ms = Date.parse(date);
  return Number.isNaN(ms) ? 0 : ms;
}

function formatDate(date?: string) {
  if (!date) return null;
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(value);
}

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(timestamp));
}

export function DocsHomePage({ pages, canViewTechnical }: { pages: DocsHomeEntry[]; canViewTechnical: boolean }) {
  const [recentItems, setRecentItems] = useState<DocsRecentItem[]>([]);
  const [popularItems, setPopularItems] = useState<PopularMap>({});
  const [globalPopular, setGlobalPopular] = useState<PopularItem[]>([]);
  const [rolePopular, setRolePopular] = useState<PopularItem[]>([]);
  const [roleSegment, setRoleSegment] = useState<RoleSegment>('cliente');
  const [lastReadFromApi, setLastReadFromApi] = useState<DocsRecentItem | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(true);

  useEffect(() => {
    try {
      const recent = JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) ?? '[]') as DocsRecentItem[];
      if (Array.isArray(recent)) setRecentItems(recent);
    } catch {
      setRecentItems([]);
    }

    try {
      const popular = JSON.parse(localStorage.getItem(POPULAR_STORAGE_KEY) ?? '{}') as PopularMap;
      if (popular && typeof popular === 'object') setPopularItems(popular);
    } catch {
      setPopularItems({});
    }

    void fetch('/api/docs/views', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{
          ok?: boolean;
          roleSegment?: RoleSegment;
          globalPopular?: PopularItem[];
          rolePopular?: PopularItem[];
          lastRead?: { href: string; title: string; visitedAt: number } | null;
        }>;
      })
      .then((payload) => {
        if (!payload?.ok) return;
        if (payload.roleSegment) setRoleSegment(payload.roleSegment);
        if (Array.isArray(payload.globalPopular)) setGlobalPopular(payload.globalPopular);
        if (Array.isArray(payload.rolePopular)) setRolePopular(payload.rolePopular);
        if (
          payload.lastRead &&
          typeof payload.lastRead.href === 'string' &&
          typeof payload.lastRead.title === 'string' &&
          typeof payload.lastRead.visitedAt === 'number'
        ) {
          setLastReadFromApi(payload.lastRead);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoadingInsights(false));
  }, []);

  const latestUpdates = useMemo(
    () => [...pages].sort((a, b) => parseDate(b.lastUpdated) - parseDate(a.lastUpdated)).slice(0, 6),
    [pages],
  );

  const mostAccessed = useMemo(() => {
    const pageByHref = new Map(pages.map((page) => [page.href, page]));
    return Object.entries(popularItems)
      .sort(([, a], [, b]) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.lastVisited - a.lastVisited;
      })
      .map(([href, stats]) => {
        const page = pageByHref.get(href);
        return {
          href,
          title: page?.title ?? stats.title,
          count: stats.count,
        };
      })
      .slice(0, 6);
  }, [pages, popularItems]);

  const recent = useMemo(() => {
    const pageByHref = new Map(pages.map((page) => [page.href, page]));
    return recentItems
      .map((entry) => ({
        href: entry.href,
        title: pageByHref.get(entry.href)?.title ?? entry.title,
        visitedAt: entry.visitedAt,
      }))
      .slice(0, 6);
  }, [pages, recentItems]);

  const continueReading = useMemo(() => {
    if (lastReadFromApi) {
      const fromPages = pages.find((page) => page.href === lastReadFromApi.href);
      return {
        href: lastReadFromApi.href,
        title: fromPages?.title ?? lastReadFromApi.title,
        visitedAt: lastReadFromApi.visitedAt,
      };
    }

    const firstRecent = recentItems[0];
    if (!firstRecent) return null;
    const fromPages = pages.find((page) => page.href === firstRecent.href);
    return {
      href: firstRecent.href,
      title: fromPages?.title ?? firstRecent.title,
      visitedAt: firstRecent.visitedAt,
    };
  }, [lastReadFromApi, pages, recentItems]);

  const rolePopularTitle = useMemo(() => {
    if (roleSegment === 'admin') return 'Populares para administração';
    if (roleSegment === 'suporte') return 'Populares para suporte';
    return 'Populares para clientes';
  }, [roleSegment]);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/10 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Experiência guiada
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Central de Documentação</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Encontre respostas mais rápido com a busca nativa da docs, acesse atalhos por contexto e retome de onde parou.
            </p>
          </div>
          <span className="rounded-full border border-border/70 bg-background/70 px-2 py-1 text-xs text-muted-foreground">
            {pages.length} páginas disponíveis
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <LargeSearchToggle className="h-11 min-w-[280px] flex-1 justify-start rounded-xl border-border/70 bg-background/85 text-sm" />
          <Link
            href="/docs/manual"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-4 text-sm font-medium hover:bg-accent"
          >
            Começar pelo Manual
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <Callout title="Dica de produtividade">
        Use `Ctrl + K` para abrir a busca de qualquer página e ir direto para o conteúdo desejado.
      </Callout>

      {continueReading ? (
        <section className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="text-sm font-semibold">Continuar leitura</p>
          <p className="mt-1 text-xs text-muted-foreground">Último acesso em {formatDateTime(continueReading.visitedAt)}</p>
          <Link
            href={continueReading.href}
            className="mt-3 flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2 text-sm hover:bg-accent"
          >
            <span className="line-clamp-2">{continueReading.title}</span>
            <ArrowRight className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        </section>
      ) : loadingInsights ? (
        <section className="rounded-xl border border-border/60 bg-card/40 p-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-2 h-3 w-48" />
          <Skeleton className="mt-3 h-12 w-full" />
        </section>
      ) : null}

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Links diretos</h3>
        <Cards>
          {QUICK_LINKS.map((item) => (
            <Card key={item.href} href={item.href} title={item.title}>
              {item.description}
            </Card>
          ))}
          {canViewTechnical ? (
            <Card href="/docs/manuais-tecnicos" title="Manuais Técnicos">
              Arquitetura, backlog e padrões de engenharia.
            </Card>
          ) : null}
        </Cards>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Clock3 className="h-4 w-4 text-muted-foreground" />
            Últimas atualizações
          </p>
          <div className="space-y-2">
            {latestUpdates.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md border border-border/60 bg-background px-3 py-2 text-sm hover:bg-accent"
              >
                <p className="line-clamp-2">{item.title}</p>
                {formatDate(item.lastUpdated) ? (
                  <p className="mt-1 text-xs text-muted-foreground">Atualizado em {formatDate(item.lastUpdated)}</p>
                ) : null}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Flame className="h-4 w-4 text-muted-foreground" />
            Mais acessados por você
          </p>
          <div className="space-y-2">
            {mostAccessed.length === 0 ? (
              <p className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-muted-foreground">
                Ainda sem dados de acesso.
              </p>
            ) : (
              mostAccessed.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2 text-sm hover:bg-accent"
                >
                  <span className="line-clamp-2">{item.title}</span>
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{item.count}</span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Flame className="h-4 w-4 text-muted-foreground" />
            {rolePopularTitle}
          </p>
          <div className="space-y-2">
            {loadingInsights ? (
              <>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </>
            ) : rolePopular.length === 0 ? (
              <p className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-muted-foreground">
                Ainda sem ranking por perfil disponível.
              </p>
            ) : (
              rolePopular.slice(0, 6).map((item) => (
                <Link
                  key={`role-${item.href}`}
                  href={item.href}
                  className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2 text-sm hover:bg-accent"
                >
                  <span className="line-clamp-2">{item.title}</span>
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{item.count}</span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Flame className="h-4 w-4 text-muted-foreground" />
            Populares na base (global)
          </p>
          <div className="space-y-2">
            {loadingInsights ? (
              <>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </>
            ) : globalPopular.length === 0 ? (
              <p className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-muted-foreground">
                Ainda sem ranking global disponível.
              </p>
            ) : (
              globalPopular.slice(0, 6).map((item) => (
                <Link
                  key={`global-${item.href}`}
                  href={item.href}
                  className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2 text-sm hover:bg-accent"
                >
                  <span className="line-clamp-2">{item.title}</span>
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{item.count}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card/40 p-4">
        <p className="mb-3 text-sm font-semibold">Recentes</p>
        <div className="space-y-2">
          {recent.length === 0 ? (
            <p className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-muted-foreground">
              Você ainda não abriu nenhuma página.
            </p>
          ) : (
            recent.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md border border-border/60 bg-background px-3 py-2 text-sm hover:bg-accent"
              >
                <span className="line-clamp-2">{item.title}</span>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.visitedAt)}</p>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
