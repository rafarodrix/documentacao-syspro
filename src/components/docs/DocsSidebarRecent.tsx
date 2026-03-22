'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

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

  const [open, setOpen] = useState(true);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [hasSavedPreference, setHasSavedPreference] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-height: 860px)');
    const update = () => setIsCompactViewport(media.matches);
    update();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

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

    try {
      const savedOpen = localStorage.getItem('docs:quick-nav:open');
      if (savedOpen === '0') {
        setOpen(false);
        setHasSavedPreference(true);
        return;
      }
      if (savedOpen === '1') {
        setOpen(true);
        setHasSavedPreference(true);
        return;
      }

      const initialOpen = !isCompactViewport;
      setOpen(initialOpen);
      localStorage.setItem('docs:quick-nav:open', initialOpen ? '1' : '0');
      setHasSavedPreference(false);
    } catch {
      setOpen(!isCompactViewport);
      setHasSavedPreference(false);
    }
  }, [isCompactViewport]);

  useEffect(() => {
    if (hasSavedPreference) return;
    setOpen(!isCompactViewport);
  }, [isCompactViewport, hasSavedPreference]);

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

  const recentItems = useMemo(
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

  if (recentItems.length === 0 && popularItems.length === 0) return null;

  function toggleOpen() {
    setOpen((prev) => {
      const next = !prev;
      localStorage.setItem('docs:quick-nav:open', next ? '1' : '0');
      setHasSavedPreference(true);
      return next;
    });
  }

  function clearHistory() {
    setItems([]);
    setPopularMap({});
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(POPULAR_STORAGE_KEY);
  }

  return (
    <div className="mt-3 rounded-lg border border-border/60 bg-card/40 p-2">
      <button
        type="button"
        onClick={toggleOpen}
        className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-accent"
      >
        <span>Navegação rápida</span>
        <span className="ml-auto mr-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
          R {recentItems.length}
        </span>
        <span className="mr-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
          P {popularItems.length}
        </span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', !open && '-rotate-90')} />
      </button>

      {open ? (
        <Tabs defaultValue="recentes" className="mt-2">
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={clearHistory}
              className="rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Limpar histórico
            </button>
          </div>
          <TabsList className="grid h-8 w-full grid-cols-2">
            <TabsTrigger value="recentes" className="text-xs">Recentes</TabsTrigger>
            <TabsTrigger value="populares" className="text-xs">Populares</TabsTrigger>
          </TabsList>

          <TabsContent value="recentes">
            <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
              {recentItems.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">Sem histórico recente ainda.</p>
              ) : (
                recentItems.map((item) => (
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
          </TabsContent>

          <TabsContent value="populares">
            <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
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
          </TabsContent>
        </Tabs>
      ) : (
        <p className="px-2 pb-1 pt-1 text-xs text-muted-foreground">Abra para acessar recentes e populares.</p>
      )}
    </div>
  );
}
