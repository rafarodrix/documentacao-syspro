'use client';

import { useEffect, useMemo, useState } from 'react';
import { DOCS_STORAGE_KEYS, readStorage } from '@/lib/docs-storage';
import type { RecentDocItem, PopularMap } from '@/lib/docs-storage';
import { parseDate } from '@/lib/docs-utils';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type DocsHomeEntry = {
  href: string;
  title: string;
  description?: string;
  lastUpdated?: string;
};

export type PopularItem = {
  href: string;
  title: string;
  count: number;
  lastViewed: number;
};

export type ContinueReadingItem = {
  href: string;
  title: string;
  visitedAt: number;
};

export type RoleSegment = 'admin' | 'developer' | 'suporte' | 'cliente_admin' | 'cliente_user';

type InsightsApiResponse = {
  roleSegment?: RoleSegment;
  globalPopular?: PopularItem[];
  rolePopular?: PopularItem[];
  lastRead?: { href: string; title: string; visitedAt: number };
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDocsDashboard(pages: DocsHomeEntry[], canViewTechnical: boolean) {
  const [recentItems, setRecentItems] = useState<RecentDocItem[]>([]);
  const [popularItems, setPopularItems] = useState<PopularMap>({});
  const [globalPopular, setGlobalPopular] = useState<PopularItem[]>([]);
  const [rolePopular, setRolePopular] = useState<PopularItem[]>([]);
  const [roleSegment, setRoleSegment] = useState<RoleSegment>('cliente_user');
  const [lastReadApi, setLastReadApi] = useState<ContinueReadingItem | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(true);

  // Lê localStorage usando os helpers centralizados
  useEffect(() => {
    setRecentItems(readStorage<RecentDocItem[]>(DOCS_STORAGE_KEYS.recent, []));
    setPopularItems(readStorage<PopularMap>(DOCS_STORAGE_KEYS.popular, {}));
  }, []);

  // Fetch com AbortController para evitar setState em componente desmontado
  useEffect(() => {
    const controller = new AbortController();

    const fetchInsights = async () => {
      try {
        const res = await fetch('/api/docs/views', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) return;

        const data = await res.json() as InsightsApiResponse;

        if (data.roleSegment) setRoleSegment(data.roleSegment);
        if (Array.isArray(data.globalPopular)) setGlobalPopular(data.globalPopular);
        if (Array.isArray(data.rolePopular)) setRolePopular(data.rolePopular);
        if (data.lastRead?.href && typeof data.lastRead.visitedAt === 'number') {
          setLastReadApi(data.lastRead);
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Failed to fetch docs insights:', error);
        }
      } finally {
        if (!controller.signal.aborted) setLoadingInsights(false);
      }
    };

    void fetchInsights();
    return () => controller.abort();
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
    return source
      ? {
          href: source.href,
          title: pageByHref.get(source.href)?.title ?? source.title,
          visitedAt: source.visitedAt,
        }
      : null;
  }, [lastReadApi, pageByHref, recentItems]);

  return {
    status: { roleSegment, loadingInsights },
    derived: { latestUpdates, mostAccessed, recent, continueReading, globalPopular, rolePopular },
    metrics: {
      totalPages: pages.length,
      insightCount: rolePopular.length + globalPopular.length + mostAccessed.length + (canViewTechnical ? 1 : 0),
    },
  };
}
