'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Item } from 'fumadocs-core/page-tree';
import { SidebarItem } from 'fumadocs-ui/components/layout/sidebar';
import { cn } from '@/lib/utils';
import { DOCS_STORAGE_KEYS, readStorage, type VisitedMap } from '@/lib/docs-storage';

export function DocsSidebarItem({ item }: { item: Item }) {
  const pathname = usePathname();
  const isActive = pathname === item.url;
  const [isVisited, setIsVisited] = useState(false);

  useEffect(() => {
    if (!item.url) return;
    const visited = readStorage<VisitedMap>(DOCS_STORAGE_KEYS.visited, {});
    setIsVisited(Boolean(visited[item.url]));
  }, [item.url, pathname]);

  return (
    <SidebarItem
      href={item.url}
      external={item.external}
      icon={item.icon}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'rounded-xl border border-transparent bg-transparent text-[0.95rem] leading-5 transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        'hover:border-border/50 hover:bg-accent/45 hover:shadow-[0_14px_30px_-28px_hsl(var(--foreground)/0.9)]',
        isVisited && !isActive && 'text-muted-foreground/80',
        isActive && 'border-primary/15 bg-primary/8 text-foreground font-medium no-underline shadow-[0_18px_40px_-30px_hsl(var(--primary)/0.7)]',
      )}
    >
      <span className="flex items-center gap-2.5">
        {/* Indicador de novo: ponto visível para páginas nunca visitadas */}
        {!isVisited && !isActive ? (
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40"
          />
        ) : null}
        <span>{item.name}</span>
      </span>
    </SidebarItem>
  );
}
