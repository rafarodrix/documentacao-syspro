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
    defaultOpenLevel: 1,
    collapsible: true,
    prefetch: false,
    banner: <DocsSidebarInlineCollapse />,
    components: { Item: DocsSidebarItem },
  } as const;

  return (
    <DocsLayout
      tree={docsTree}
      tabMode="top"
      nav={{ title: <span className="font-semibold text-sm">Central de Documentacao</span> }}
      themeSwitch={{ enabled: false }}
      searchToggle={{ enabled: true }}
      sidebar={sharedSidebarProps}
    >
      {children}
    </DocsLayout>
  );
}
