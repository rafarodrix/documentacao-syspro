'use client';

import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { Root as PageTreeRoot } from 'fumadocs-core/page-tree';
import { DocsSidebarItem } from '@/components/docs/docs-sidebar-item';
import { DocsSidebarInlineCollapse } from '@/components/docs/docs-sidebar-inline-collapse';

export function DocsLayoutClient({
  docsTree,
  children,
}: {
  docsTree: PageTreeRoot;
  children: ReactNode;
}) {
  const sharedSidebarProps = {
    className: 'docs-sidebar-shell portal-docs-sidebar',
    defaultOpenLevel: 0,
    collapsible: false,
    banner: <DocsSidebarInlineCollapse />,
    components: { Item: DocsSidebarItem },
  } as const;

  return (
    <DocsLayout
      tree={docsTree}
      nav={{ title: <span className="font-semibold text-sm">Central Trilink</span> }}
      themeSwitch={{ enabled: false }}
      searchToggle={{ enabled: true }}
      sidebar={sharedSidebarProps}
    >
      {children}
    </DocsLayout>
  );
}
