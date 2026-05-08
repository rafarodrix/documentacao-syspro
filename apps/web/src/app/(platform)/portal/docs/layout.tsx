import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider';
import { source } from '@/lib/source';
import { requireSession } from "@/lib/auth-helpers";
import { isAdminOnlyDocUrl, DOCS_TECHNICAL_PATH_PREFIX } from '@/lib/docs-access';
import { filterDocTree } from '@/lib/docs-tree-utils';
import { DocsLayoutClient } from '@/components/docs/docs-layout-client';
import { PortalShellModeController } from '@/components/platform/app/layout/portal-shell-mode-context';
import { currentUserHasPermission } from '@/features/user-access/application/current-user-access';

export default async function PortalDocsLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  const canViewTechnicalDocs = await currentUserHasPermission("tools:all");
  const canViewAdminOnlyDocs = await currentUserHasPermission("settings:edit");

  const docsTree = filterDocTree(
    filterDocTree(
      source.pageTree,
      (url) => canViewTechnicalDocs || !url.startsWith(DOCS_TECHNICAL_PATH_PREFIX),
    ),
    (url) => canViewAdminOnlyDocs || !isAdminOnlyDocUrl(url),
  );

  return (
    <RootProvider>
      <PortalShellModeController showSidebar={false} />
      <main className="portal-docs-shell min-h-0 [--fd-banner-height:0px] [--portal-docs-top-offset:3.5rem]">
        <DocsLayoutClient docsTree={docsTree}>
          {children}
        </DocsLayoutClient>
      </main>
    </RootProvider>
  );
}
