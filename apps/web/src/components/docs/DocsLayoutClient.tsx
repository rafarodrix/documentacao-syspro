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
import { DOCS_STORAGE_KEYS, readStorage, writeStorage } from '@/lib/docs-storage';

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

  // `null` enquanto hidratando → evita flash de layout errado no SSR
  const [adminLayoutMode, setAdminLayoutMode] = useState<'docs' | 'notebook' | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const saved = readStorage<string>(DOCS_STORAGE_KEYS.adminLayout, '');
    if (saved === 'docs' || saved === 'notebook') {
      setAdminLayoutMode(saved);
    } else {
      setAdminLayoutMode('docs');
    }
  }, [isAdmin]);

  const layoutMode = useMemo(() => {
    if (isDocsHome) return 'docs';
    if (isAdmin) return adminLayoutMode ?? 'docs';
    return getDefaultLayoutForRole(role);
  }, [isAdmin, adminLayoutMode, role, isDocsHome]);

  const sharedSidebarProps = {
    className: 'docs-sidebar-shell',
    defaultOpenLevel: 0,
    collapsible: false,
    banner: <DocsSidebarInlineCollapse />,
    components: { Item: DocsSidebarItem },
  } as const;

  if (layoutMode === 'notebook') {
    return (
      <NotebookLayout
        tree={docsTree}
        nav={{ title: null, children: null, mode: 'top' }}
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
      nav={{ title: null, children: null }}
      themeSwitch={{ enabled: false }}
      searchToggle={{ enabled: true }}
      sidebar={{ ...sharedSidebarProps, enabled: !isDocsHome }}
    >
      {children}
    </DocsLayout>
  );
}
