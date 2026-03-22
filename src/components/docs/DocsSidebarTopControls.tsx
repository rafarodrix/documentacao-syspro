'use client';

import { PanelLeft } from 'lucide-react';
import { LargeSearchToggle } from 'fumadocs-ui/components/layout/search-toggle';
import { SidebarCollapseTrigger } from 'fumadocs-ui/components/layout/sidebar';

export function DocsSidebarTopControls() {
  return (
    <div className="hidden md:flex w-full items-center gap-2">
      <LargeSearchToggle hideIfDisabled className="flex-1" />
      <SidebarCollapseTrigger
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <PanelLeft className="h-4 w-4" />
      </SidebarCollapseTrigger>
    </div>
  );
}

