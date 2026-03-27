'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Item } from 'fumadocs-core/page-tree';
import { SidebarItem } from 'fumadocs-ui/components/layout/sidebar';
import { cn } from '@/lib/utils';

type VisitedMap = Record<string, number>;
const VISITED_STORAGE_KEY = 'docs:visited';

export function DocsSidebarItem({ item }: { item: Item }) {
  const pathname = usePathname();
  const isActive = pathname === item.url;
  const [isVisited, setIsVisited] = useState(false);

  useEffect(() => {
    if (!item.url) return;
    try {
      const parsed = JSON.parse(localStorage.getItem(VISITED_STORAGE_KEY) ?? '{}') as VisitedMap;
      const visited = parsed && typeof parsed === 'object' ? parsed : {};
      setIsVisited(Boolean(visited[item.url]));
    } catch {
      setIsVisited(false);
    }
  }, [item.url, pathname]);

  return (
    <SidebarItem
      href={item.url}
      external={item.external}
      icon={item.icon}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'rounded-lg border border-transparent bg-transparent text-[0.95rem] leading-5 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        'hover:bg-accent/40',
        isVisited && !isActive && 'text-muted-foreground/80',
        isActive && 'border-primary/15 bg-primary/8 text-foreground font-medium',
      )}
    >
      <span className="flex items-center gap-2.5">
        <span>{item.name}</span>
      </span>
    </SidebarItem>
  );
}
