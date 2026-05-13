'use client';

import { useEffect } from 'react';
import type { DocsRegisterViewInput } from '@dosc-syspro/contracts/docs';
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
    const payload: DocsRegisterViewInput = { href, title, visitedAt };

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
    // Reporta visita para a API via tRPC e usa sendBeacon como fallback em saida rapida.
    // -----------------------------------------------------------------------
    let settled = false;
    const request = trpc.docs.registerView
      .mutate(payload)
      .catch(() => undefined)
      .finally(() => {
        settled = true;
      });

    const flushWithBeacon = () => {
      if (settled || typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
        return;
      }

      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon('/api/trpc/docs.registerView', blob);
      settled = true;
    };

    window.addEventListener('pagehide', flushWithBeacon);

    void request;

    return () => {
      window.removeEventListener('pagehide', flushWithBeacon);
    };
  }, [href, title]);

  return null;
}
