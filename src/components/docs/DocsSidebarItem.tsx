'use client';

import { usePathname } from 'next/navigation';
import type { Item } from 'fumadocs-core/page-tree';
import { SidebarItem } from 'fumadocs-ui/components/layout/sidebar';
import { cn } from '@/lib/utils';
import { useDocsSidebarTreeQuery } from '@/components/docs/DocsSidebarTreeQueryContext';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightLabel(label: string, query: string) {
  const term = query.trim();
  if (!term) return label;

  const matcher = new RegExp(`(${escapeRegExp(term)})`, 'ig');
  const parts = label.split(matcher);

  return parts.map((part, index) => {
    if (part.toLowerCase() !== term.toLowerCase()) return <span key={`${part}-${index}`}>{part}</span>;
    return (
      <mark key={`${part}-${index}`} className="rounded-sm bg-primary/25 px-0.5 text-foreground">
        {part}
      </mark>
    );
  });
}

export function DocsSidebarItem({ item }: { item: Item }) {
  const pathname = usePathname();
  const { query } = useDocsSidebarTreeQuery();
  const isActive = pathname === item.url;
  const rawLabel = typeof item.name === 'string' ? item.name : String(item.name ?? '');

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
      {typeof item.name === 'string' ? highlightLabel(rawLabel, query) : item.name}
    </SidebarItem>
  );
}
