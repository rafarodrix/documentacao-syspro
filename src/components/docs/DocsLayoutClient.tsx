'use client';

import type { ReactNode } from 'react';
import type { Role } from '@prisma/client';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { Root as PageTreeRoot } from 'fumadocs-core/page-tree';
import { DocsSidebarItem } from '@/components/docs/DocsSidebarItem';
import { DocsSidebarQuickLinks } from '@/components/docs/DocsSidebarQuickLinks';
import { DocsSidebarTopControls } from '@/components/docs/DocsSidebarTopControls';

export function DocsLayoutClient({
  docsTree,
  role,
  children,
}: {
  docsTree: PageTreeRoot;
  role: Role;
  children: ReactNode;
}) {
  return (
    <DocsLayout
      tree={docsTree}
      nav={{
        title: null,
        children: <DocsSidebarTopControls />,
      }}
      themeSwitch={{
        enabled: false,
      }}
      searchToggle={{
        components: {
          lg: false,
        },
      }}
      sidebar={{
        defaultOpenLevel: 2,
        collapsible: false,
        components: {
          Item: DocsSidebarItem,
        },
        banner: (
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <DocsSidebarQuickLinks role={role} />
          </div>
        ),
      }}
    >
      {children}
    </DocsLayout>
  );
}
