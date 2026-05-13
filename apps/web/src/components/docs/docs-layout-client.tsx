'use client';

import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { Root as PageTreeRoot } from 'fumadocs-core/page-tree';
import { DocsSidebarItem } from '@/components/docs/docs-sidebar-item';
import { DocsSidebarBanner } from '@/components/docs/docs-sidebar-banner';
import { DocsSidebarFooter } from '@/components/docs/docs-sidebar-footer';

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
    tabs: false,
    banner: <DocsSidebarBanner />,
    footer: <DocsSidebarFooter />,
    components: { Item: DocsSidebarItem },
  } as const;

  return (
    <DocsLayout
      tree={docsTree}
      nav={{ title: <span className="sr-only">Documentacao</span>, transparentMode: 'top' }}
      themeSwitch={{ enabled: false }}
      searchToggle={{ enabled: true }}
      sidebar={sharedSidebarProps}
    >
      {children}
    </DocsLayout>
  );
}
