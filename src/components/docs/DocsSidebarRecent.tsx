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

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as RecentDocItem[];
      if (Array.isArray(parsed)) setItems(parsed);
    } catch {
      setItems([]);
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
  }, [pathname]);

  const visibleItems = useMemo(
    () => items.filter((item) => item.href !== pathname).slice(0, 4),
    [items, pathname],
  );

  if (visibleItems.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-border/60 bg-card/40 p-2">
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Recentes
      </p>
      <div className="space-y-1">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            title={item.title}
          >
            <span className="line-clamp-2">{item.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

