'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Item } from 'fumadocs-core/page-tree';
import { SidebarItem } from 'fumadocs-ui/components/layout/sidebar';
import { CheckCircle2 } from 'lucide-react';
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
        'transition-colors',
        isVisited && !isActive && 'text-muted-foreground/80',
        isActive && 'bg-primary/15 text-foreground border border-primary/30 font-semibold',
      )}
    >
      <span className="flex items-center gap-2">
        {isVisited && !isActive ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/80" /> : null}
        <span>{item.name}</span>
      </span>
    </SidebarItem>
  );
}
