'use client';

import { usePathname } from 'next/navigation';
import type { Item } from 'fumadocs-core/page-tree';
import { SidebarItem } from 'fumadocs-ui/components/layout/sidebar';
import { cn } from '@/lib/utils';

export function DocsSidebarItem({ item }: { item: Item }) {
  const pathname = usePathname();
  const isActive = pathname === item.url;

  return (
    <SidebarItem
      href={item.url}
      external={item.external}
      icon={item.icon}
      className={cn(
        'transition-colors',
        isActive && 'bg-primary/15 text-foreground border border-primary/30 font-semibold',
      )}
    >
      {item.name}
    </SidebarItem>
  );
}
