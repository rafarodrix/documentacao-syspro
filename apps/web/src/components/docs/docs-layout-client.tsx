'use client';

import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { Root as PageTreeRoot } from 'fumadocs-core/page-tree';
import type { Option as SidebarTabOption } from 'fumadocs-ui/components/layout/root-toggle';
import { BookOpenText, LifeBuoy, Shield } from 'lucide-react';
import { DocsSidebarBanner } from '@/components/docs/docs-sidebar-banner';
import { DocsSidebarFooter } from '@/components/docs/docs-sidebar-footer';
import { DOCS_SCOPE_ROUTES } from '@/lib/docs-scope';

export function DocsLayoutClient({
  docsTree,
  canViewSupport,
  canViewAdmin,
  children,
}: {
  docsTree: PageTreeRoot;
  canViewSupport: boolean;
  canViewAdmin: boolean;
  children: ReactNode;
}) {
  const sharedSidebarProps = {
    className: 'docs-sidebar-shell portal-docs-sidebar',
    defaultOpenLevel: 1,
    collapsible: true,
    prefetch: false,
    tabs: getProfileTabs(canViewSupport, canViewAdmin),
    banner: <DocsSidebarBanner docsTree={docsTree} />,
    footer: <DocsSidebarFooter />,
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

function getProfileTabs(canViewSupport: boolean, canViewAdmin: boolean): SidebarTabOption[] {
  return [
    {
      url: DOCS_SCOPE_ROUTES.cliente,
      title: 'Cliente',
      icon: <BookOpenText className="size-full" />,
    },
    ...(canViewSupport
      ? [{
          url: DOCS_SCOPE_ROUTES.suporte,
          title: 'Suporte',
          icon: <LifeBuoy className="size-full" />,
        } satisfies SidebarTabOption]
      : []),
    ...(canViewAdmin
      ? [{
          url: DOCS_SCOPE_ROUTES.admin,
          title: 'Admin',
          icon: <Shield className="size-full" />,
        } satisfies SidebarTabOption]
      : []),
  ];
}
