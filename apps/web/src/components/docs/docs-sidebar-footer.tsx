'use client';

import { PanelsTopLeft } from 'lucide-react';
import { SidebarItem } from 'fumadocs-ui/components/layout/sidebar';

export function DocsSidebarFooter() {
  return (
    <div className="docs-sidebar-footer hidden md:block">
      <SidebarItem href="/portal" icon={<PanelsTopLeft className="size-4" />}>
        Voltar ao portal
      </SidebarItem>
    </div>
  );
}
