'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Role } from '@prisma/client';
import { usePathname } from 'next/navigation';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsLayout as NotebookLayout } from 'fumadocs-ui/layouts/notebook';
import type { Root as PageTreeRoot } from 'fumadocs-core/page-tree';
import { DocsSidebarItem } from '@/components/docs/DocsSidebarItem';
import { DocsSidebarInlineCollapse } from '@/components/docs/DocsSidebarInlineCollapse';

const ADMIN_LAYOUT_STORAGE_KEY = 'docs:admin:layout-mode';

function getDefaultLayoutForRole(role: Role): 'docs' | 'notebook' {
  if (role === 'SUPORTE' || role === 'DEVELOPER') return 'notebook';
  return 'docs';
}

export function DocsLayoutClient({
  docsTree,
  role,
  children,
}: {
  docsTree: PageTreeRoot;
  role: Role;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = role === 'ADMIN';
  const isDocsHome = pathname === '/docs';
  const [adminLayoutMode, setAdminLayoutMode] = useState<'docs' | 'notebook'>('docs');

  useEffect(() => {
    if (!isAdmin) return;
    const saved = localStorage.getItem(ADMIN_LAYOUT_STORAGE_KEY);
    if (saved === 'docs' || saved === 'notebook') {
      setAdminLayoutMode(saved);
    }
  }, [isAdmin]);

  const layoutMode = useMemo(() => {
    if (isDocsHome) return 'docs';
    if (isAdmin) return adminLayoutMode;
    return getDefaultLayoutForRole(role);
  }, [isAdmin, adminLayoutMode, role, isDocsHome]);

  if (layoutMode === 'notebook') {
    return (
      <NotebookLayout
        tree={docsTree}
        nav={{
          title: null,
          children: null,
          mode: 'top',
        }}
        themeSwitch={{
          enabled: false,
        }}
        searchToggle={{
          enabled: false,
        }}
        sidebar={{
          defaultOpenLevel: 0,
          collapsible: false,
          banner: <DocsSidebarInlineCollapse />,
          components: {
            Item: DocsSidebarItem,
          },
        }}
      >
        {children}
      </NotebookLayout>
    );
  }

  return (
    <DocsLayout
      tree={docsTree}
      nav={{
        title: null,
        children: null,
      }}
      themeSwitch={{
        enabled: false,
      }}
      searchToggle={{
        enabled: false,
      }}
      sidebar={{
        enabled: !isDocsHome,
        defaultOpenLevel: 0,
        collapsible: false,
        banner: <DocsSidebarInlineCollapse />,
        components: {
          Item: DocsSidebarItem,
        },
      }}
    >
      {children}
    </DocsLayout>
  );
}
