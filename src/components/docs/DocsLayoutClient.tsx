'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Role } from '@prisma/client';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsLayout as NotebookLayout } from 'fumadocs-ui/layouts/notebook';
import type { Root as PageTreeRoot } from 'fumadocs-core/page-tree';
import { DocsSidebarItem } from '@/components/docs/DocsSidebarItem';
import { DocsSidebarTopControls } from '@/components/docs/DocsSidebarTopControls';

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
  const isAdmin = role === 'ADMIN';
  const [adminLayoutMode, setAdminLayoutMode] = useState<'docs' | 'notebook'>('docs');

  useEffect(() => {
    if (!isAdmin) return;
    const saved = localStorage.getItem(ADMIN_LAYOUT_STORAGE_KEY);
    if (saved === 'docs' || saved === 'notebook') {
      setAdminLayoutMode(saved);
    }
  }, [isAdmin]);

  const layoutMode = useMemo(() => {
    if (isAdmin) return adminLayoutMode;
    return getDefaultLayoutForRole(role);
  }, [isAdmin, adminLayoutMode, role]);

  const LayoutComponent = layoutMode === 'notebook' ? NotebookLayout : DocsLayout;

  function toggleAdminLayoutMode() {
    if (!isAdmin) return;
    setAdminLayoutMode((prev) => {
      const next = prev === 'notebook' ? 'docs' : 'notebook';
      localStorage.setItem(ADMIN_LAYOUT_STORAGE_KEY, next);
      return next;
    });
  }

  return (
    <LayoutComponent
      tree={docsTree}
      nav={{
        title: null,
        children: (
          <DocsSidebarTopControls
            showAdminToggle={isAdmin}
            adminLayoutMode={adminLayoutMode}
            onToggleAdminLayout={toggleAdminLayoutMode}
          />
        ),
        ...(layoutMode === 'notebook' ? { mode: 'top' as const } : {}),
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
      }}
    >
      {children}
    </LayoutComponent>
  );
}
