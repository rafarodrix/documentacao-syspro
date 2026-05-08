'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsLayout as NotebookLayout } from 'fumadocs-ui/layouts/notebook';
import type { Root as PageTreeRoot } from 'fumadocs-core/page-tree';
import { DocsSidebarItem } from '@/components/docs/docs-sidebar-item';
import { DocsSidebarInlineCollapse } from '@/components/docs/docs-sidebar-inline-collapse';
import { DOCS_STORAGE_KEYS, readStorage } from '@/lib/docs-storage';

export function DocsLayoutClient({
  docsTree,
  children,
}: {
  docsTree: PageTreeRoot;
  children: ReactNode;
}) {
  const [layoutPreference, setLayoutPreference] = useState<'docs' | 'notebook' | null>(null);

  useEffect(() => {
    const saved = readStorage<string>(DOCS_STORAGE_KEYS.adminLayout, '');
    if (saved === 'docs' || saved === 'notebook') {
      setLayoutPreference(saved);
    } else {
      setLayoutPreference('docs');
    }
  }, []);

  const layoutMode = useMemo(() => layoutPreference ?? 'docs', [layoutPreference]);

  const sharedSidebarProps = {
    className: 'docs-sidebar-shell portal-docs-sidebar',
    defaultOpenLevel: 0,
    collapsible: false,
    banner: <DocsSidebarInlineCollapse />,
    components: { Item: DocsSidebarItem },
  } as const;

  if (layoutMode === 'notebook') {
    return (
      <NotebookLayout
        tree={docsTree}
        nav={{ title: <span className="font-semibold text-sm">Central Trilink</span>, mode: 'top' }}
        themeSwitch={{ enabled: false }}
        searchToggle={{ enabled: true }}
        sidebar={sharedSidebarProps}
      >
        {children}
      </NotebookLayout>
    );
  }

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
