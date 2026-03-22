'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type RecentDocItem = {
  href: string;
  title: string;
  visitedAt: number;
};

const STORAGE_KEY = 'docs:recent';
const POPULAR_STORAGE_KEY = 'docs:popular';
const MAX_RECENT_ITEMS = 5;

function normalizeTitle(pathname: string) {
  const lastSegment = pathname.split('/').filter(Boolean).pop() ?? 'Documento';
  return decodeURIComponent(lastSegment)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getCurrentDocTitle(pathname: string) {
  const fromHeading = document.querySelector('main h1')?.textContent?.trim();
  if (fromHeading) return fromHeading;
  return normalizeTitle(pathname);
}

export function DocsSidebarRecent() {
  const pathname = usePathname();
  const [items, setItems] = useState<RecentDocItem[]>([]);
  const [popularMap, setPopularMap] = useState<Record<string, { title: string; count: number; lastVisited: number }>>({});

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as RecentDocItem[];
      if (Array.isArray(parsed)) setItems(parsed);
    } catch {
      setItems([]);
    }

    try {
      const parsedPopular = JSON.parse(localStorage.getItem(POPULAR_STORAGE_KEY) ?? '{}') as Record<
        string,
        { title: string; count: number; lastVisited: number }
      >;
      if (parsedPopular && typeof parsedPopular === 'object') setPopularMap(parsedPopular);
    } catch {
      setPopularMap({});
    }
  }, []);

  useEffect(() => {
    if (!pathname?.startsWith('/docs')) return;

    const title = getCurrentDocTitle(pathname);
    const nextItem: RecentDocItem = {
      href: pathname,
      title,
      visitedAt: Date.now(),
    };

    setItems((prev) => {
      const deduped = prev.filter((item) => item.href !== pathname);
      const next = [nextItem, ...deduped].slice(0, MAX_RECENT_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });

    setPopularMap((prev) => {
      const current = prev[pathname];
      const next = {
        ...prev,
        [pathname]: {
          title,
          count: (current?.count ?? 0) + 1,
          lastVisited: Date.now(),
        },
      };
      localStorage.setItem(POPULAR_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [pathname]);

  const visibleItems = useMemo(
    () => items.filter((item) => item.href !== pathname).slice(0, 4),
    [items, pathname],
  );

  const popularItems = useMemo(
    () =>
      Object.entries(popularMap)
        .filter(([href]) => href !== pathname)
        .sort(([, a], [, b]) => {
          if (b.count !== a.count) return b.count - a.count;
          return b.lastVisited - a.lastVisited;
        })
        .slice(0, 4),
    [popularMap, pathname],
  );

  if (visibleItems.length === 0 && popularItems.length === 0) return null;

  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-lg border border-border/60 bg-card/40 p-2">
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recentes
        </p>
        <div className="space-y-1">
          {visibleItems.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">Sem histórico recente ainda.</p>
          ) : (
            visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                title={item.title}
              >
                <span className="line-clamp-2">{item.title}</span>
              </Link>
            ))
          )}
        </div>
      </div>
      <div className="rounded-lg border border-border/60 bg-card/40 p-2">
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Populares
        </p>
        <div className="space-y-1">
          {popularItems.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">Sem dados de popularidade ainda.</p>
          ) : (
            popularItems.map(([href, info]) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                title={info.title}
              >
                <span className="line-clamp-2">{info.title}</span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">{info.count}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
