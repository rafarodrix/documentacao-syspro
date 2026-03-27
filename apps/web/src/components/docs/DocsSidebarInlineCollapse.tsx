'use client';

import { PanelLeft } from 'lucide-react';
import { SidebarCollapseTrigger } from 'fumadocs-ui/components/layout/sidebar';
import { useSidebar } from 'fumadocs-ui/contexts/sidebar';
import { cn } from '@/lib/utils';

export function DocsSidebarInlineCollapse() {
  const { collapsed } = useSidebar();
  const actionLabel = collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral';

  return (
    <div className="docs-inline-collapse-anchor relative hidden h-0 md:block">
      <SidebarCollapseTrigger
        aria-label={actionLabel}
        title={actionLabel}
        className={cn(
          'absolute right-2 top-[-2.35rem] inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/45 bg-background/65',
          'text-muted-foreground/85 shadow-sm backdrop-blur-md transition-colors hover:border-primary/20 hover:bg-accent/45 hover:text-foreground',
          collapsed && 'text-primary/90',
        )}
      >
        <PanelLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
      </SidebarCollapseTrigger>
    </div>
  );
}
