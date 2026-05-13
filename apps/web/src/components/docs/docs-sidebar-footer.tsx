'use client';

import Link from 'next/link';
import { ArrowUpRight, PanelsTopLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DocsSidebarFooter() {
  return (
    <div className="docs-sidebar-footer hidden md:block">
      <div className="border-t border-border/35 pt-2.5">
        <Link
          href="/portal"
          className={cn(
            'flex items-center gap-2 rounded-xl px-1.5 py-2 text-[12.5px] text-muted-foreground no-underline transition-colors',
            'hover:bg-accent/30 hover:text-foreground',
          )}
        >
          <span className="inline-flex h-6.5 w-6.5 items-center justify-center rounded-lg border border-border/35 bg-background/54 text-muted-foreground">
            <PanelsTopLeft className="h-3.5 w-3.5" />
          </span>
          <span className="flex-1">Voltar ao portal</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-45" />
        </Link>
      </div>
    </div>
  );
}
