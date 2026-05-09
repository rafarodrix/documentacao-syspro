'use client';

import Link from 'next/link';
import { ChevronRight, PanelLeft } from 'lucide-react';
import { SidebarCollapseTrigger } from 'fumadocs-ui/components/layout/sidebar';
import { useSidebar } from 'fumadocs-ui/contexts/sidebar';
import { cn } from '@/lib/utils';
import { DOCS_SCOPE_ROUTES } from '@/lib/docs-scope';

export function DocsSidebarInlineCollapse() {
  const { collapsed } = useSidebar();
  const actionLabel = collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral';

  return (
    <div className="docs-inline-collapse-anchor relative hidden md:block">
      <div className="mb-3 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/90">
        <Link
          href="/portal"
          className="inline-flex items-center rounded-full border border-border/60 bg-background/65 px-2.5 py-1 no-underline transition-colors hover:border-border hover:bg-accent/50 hover:text-foreground"
        >
          Portal
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/55" />
        <Link
          href={DOCS_SCOPE_ROUTES.cliente}
          className="inline-flex items-center rounded-full border border-border/60 bg-background/65 px-2.5 py-1 no-underline transition-colors hover:border-border hover:bg-accent/50 hover:text-foreground"
        >
          Documentacao
        </Link>
      </div>

      <SidebarCollapseTrigger
        aria-label={actionLabel}
        title={actionLabel}
        className={cn(
          'pointer-events-auto absolute right-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-border/60 bg-background/92',
          'text-muted-foreground/85 shadow-[0_18px_44px_-28px_hsl(var(--foreground)/0.7)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:bg-accent/60 hover:text-foreground',
          collapsed && 'text-primary/90',
        )}
      >
        <PanelLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
      </SidebarCollapseTrigger>
    </div>
  );
}
