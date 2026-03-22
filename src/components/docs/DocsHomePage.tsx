'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { ArrowRight, Clock3, Flame, Search } from 'lucide-react';

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

export function DocsHomePage({ pages, canViewTechnical }: { pages: DocsHomeEntry[]; canViewTechnical: boolean }) {
  const [query, setQuery] = useState('');
  const [recentItems, setRecentItems] = useState<DocsRecentItem[]>([]);
  const [popularItems, setPopularItems] = useState<PopularMap>({});

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
  }, []);

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return pages
      .filter((page) => {
        const haystack = `${page.title} ${page.description ?? ''} ${page.href}`.toLowerCase();
        return haystack.includes(normalized);
      })
      .slice(0, 8);
  }, [pages, query]);

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
      }))
      .slice(0, 6);
  }, [pages, recentItems]);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border/60 bg-card/40 p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">Central de Documentação</h2>
          <span className="rounded-full border border-border/70 px-2 py-0.5 text-xs text-muted-foreground">
            {pages.length} páginas
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Pesquise conteúdos, acesse guias principais e acompanhe atualizações recentes.
        </p>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar na documentação"
            className="h-10 w-full rounded-lg border border-border/60 bg-background pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary/60"
          />
        </div>

        {query.trim() ? (
          <div className="mt-3 space-y-1">
            {searchResults.length === 0 ? (
              <p className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-muted-foreground">
                Nenhum resultado encontrado.
              </p>
            ) : (
              searchResults.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2 text-sm hover:bg-accent"
                >
                  <span className="truncate">{item.title}</span>
                  <ArrowRight className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))
            )}
          </div>
        ) : null}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Links diretos</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:bg-accent"
            >
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </Link>
          ))}
          {canViewTechnical ? (
            <Link
              href="/docs/manuais-tecnicos"
              className="rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:bg-accent"
            >
              <p className="font-medium">Manuais Técnicos</p>
              <p className="mt-1 text-sm text-muted-foreground">Arquitetura, backlog e padrões de engenharia.</p>
            </Link>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
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
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
