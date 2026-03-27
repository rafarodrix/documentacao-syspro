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
        'rounded-md border border-transparent bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 hover:bg-accent/45',
        isVisited && !isActive && 'text-muted-foreground/80',
        isActive && 'border-primary/20 bg-primary/10 text-foreground font-semibold',
      )}
    >
      <span className="flex items-center gap-2.5">
        {isVisited && !isActive ? <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" aria-hidden /> : null}
        <span>{item.name}</span>
      </span>
    </SidebarItem>
  );
}
