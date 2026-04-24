'use client';

import { PanelLeft } from 'lucide-react';
import { SidebarCollapseTrigger } from 'fumadocs-ui/components/layout/sidebar';
import { useSidebar } from 'fumadocs-ui/contexts/sidebar';
import { cn } from '@/lib/utils';

export function DocsSidebarInlineCollapse() {
  const { collapsed } = useSidebar();
  const actionLabel = collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral';

  return (
    <div className="docs-inline-collapse-anchor pointer-events-none absolute inset-x-0 top-0 hidden h-14 md:block">
      <SidebarCollapseTrigger
        aria-label={actionLabel}
        title={actionLabel}
        className={cn(
          'pointer-events-auto absolute right-4 top-3 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-border/60 bg-background/92',
          'text-muted-foreground/85 shadow-[0_18px_44px_-28px_hsl(var(--foreground)/0.7)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:bg-accent/60 hover:text-foreground',
          collapsed && 'text-primary/90',
        )}
      >
        <PanelLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
      </SidebarCollapseTrigger>
    </div>
  );
}
