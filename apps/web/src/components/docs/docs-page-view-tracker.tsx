'use client';

import { useEffect } from 'react';
import {
  DOCS_STORAGE_KEYS,
  readStorage,
  writeStorage,
  type RecentDocItem,
  type PopularMap,
  type VisitedMap,
} from '@/lib/docs-storage';
import { trpc } from '@/lib/api/trpc-client';
const MAX_RECENT_ITEMS = 8;

export function DocsPageViewTracker({ href, title }: { href: string; title: string }) {
  useEffect(() => {
    const visitedAt = Date.now();

    // -----------------------------------------------------------------------
    // Atualiza recent
    // -----------------------------------------------------------------------
    const recent = readStorage<RecentDocItem[]>(DOCS_STORAGE_KEYS.recent, []);
    const deduped = Array.isArray(recent) ? recent.filter((item) => item.href !== href) : [];
    writeStorage(DOCS_STORAGE_KEYS.recent, [{ href, title, visitedAt }, ...deduped].slice(0, MAX_RECENT_ITEMS));

    // -----------------------------------------------------------------------
    // Atualiza popular
    // -----------------------------------------------------------------------
    const popular = readStorage<PopularMap>(DOCS_STORAGE_KEYS.popular, {});
    const current = popular[href];
    writeStorage(DOCS_STORAGE_KEYS.popular, {
      ...popular,
      [href]: {
        title,
        count: (current?.count ?? 0) + 1,
        lastVisited: visitedAt,
      },
    });

    // -----------------------------------------------------------------------
    // Atualiza visited
    // -----------------------------------------------------------------------
    const visited = readStorage<VisitedMap>(DOCS_STORAGE_KEYS.visited, {});
    writeStorage(DOCS_STORAGE_KEYS.visited, { ...visited, [href]: visitedAt });

    // -----------------------------------------------------------------------
    // Reporta visita para a API via tRPC.
    // -----------------------------------------------------------------------
    void trpc.docs.registerView.mutate({ href, title, visitedAt }).catch(() => undefined);
  }, [href, title]);

  return null;
}
