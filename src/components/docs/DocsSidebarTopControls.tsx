'use client';

import { PanelLeft } from 'lucide-react';
import { LargeSearchToggle } from 'fumadocs-ui/components/layout/search-toggle';
import { SidebarCollapseTrigger } from 'fumadocs-ui/components/layout/sidebar';
import { useSidebar } from 'fumadocs-ui/contexts/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function DocsSidebarTopControls() {
  const { collapsed } = useSidebar();
  const actionLabel = collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral';

  return (
    <div className="hidden md:flex w-full items-center gap-2">
      <LargeSearchToggle hideIfDisabled className="flex-1" />
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarCollapseTrigger
              aria-label={actionLabel}
              title={actionLabel}
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/60',
                'text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                collapsed && 'bg-primary/15 text-primary border-primary/40',
              )}
            >
              <PanelLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
            </SidebarCollapseTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">{actionLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
