'use client';

import { useEffect } from 'react';

type RecentDocItem = {
  href: string;
  title: string;
  visitedAt: number;
};

type PopularMap = Record<string, { title: string; count: number; lastVisited: number }>;

const RECENT_STORAGE_KEY = 'docs:recent';
const POPULAR_STORAGE_KEY = 'docs:popular';
const MAX_RECENT_ITEMS = 8;

export function DocsPageViewTracker({ href, title }: { href: string; title: string }) {
  useEffect(() => {
    const visitedAt = Date.now();

    try {
      const parsedRecent = JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) ?? '[]') as RecentDocItem[];
      const recent = Array.isArray(parsedRecent) ? parsedRecent : [];
      const deduped = recent.filter((item) => item.href !== href);
      const nextRecent = [{ href, title, visitedAt }, ...deduped].slice(0, MAX_RECENT_ITEMS);
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(nextRecent));
    } catch {
      // no-op
    }

    try {
      const parsedPopular = JSON.parse(localStorage.getItem(POPULAR_STORAGE_KEY) ?? '{}') as PopularMap;
      const popular = parsedPopular && typeof parsedPopular === 'object' ? parsedPopular : {};
      const current = popular[href];
      const nextPopular: PopularMap = {
        ...popular,
        [href]: {
          title,
          count: (current?.count ?? 0) + 1,
          lastVisited: visitedAt,
        },
      };
      localStorage.setItem(POPULAR_STORAGE_KEY, JSON.stringify(nextPopular));
    } catch {
      // no-op
    }

    void fetch('/api/docs/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ href, title, visitedAt }),
      keepalive: true,
    }).catch(() => undefined);
  }, [href, title]);

  return null;
}
