'use client';

import { PanelLeft, Search, X } from 'lucide-react';
import { LargeSearchToggle } from 'fumadocs-ui/components/layout/search-toggle';
import { SidebarCollapseTrigger } from 'fumadocs-ui/components/layout/sidebar';
import { useSidebar } from 'fumadocs-ui/contexts/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useDocsSidebarTreeQuery } from '@/components/docs/DocsSidebarTreeQueryContext';

export function DocsSidebarTopControls() {
  const { collapsed } = useSidebar();
  const { query, setQuery } = useDocsSidebarTreeQuery();
  const actionLabel = collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral';

  return (
    <div className="hidden w-full flex-col gap-2 md:flex">
      <div className="flex items-center gap-2">
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

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filtrar árvore da documentação"
          className="h-9 w-full rounded-md border border-border/60 bg-background pl-9 pr-8 text-sm outline-none transition-colors focus:border-primary/60"
        />
        {query ? (
          <button
            type="button"
            aria-label="Limpar filtro da árvore"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
