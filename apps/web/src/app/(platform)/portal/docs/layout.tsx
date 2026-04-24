import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider';
import { source } from '@/lib/source';
import { requireSession } from "@/lib/auth-helpers";
import { isAdminOnlyDocUrl, DOCS_TECHNICAL_PATH_PREFIX } from '@/lib/docs-access';
import { filterDocTree } from '@/lib/docs-tree-utils';
import { DocsLayoutClient } from '@/components/docs/DocsLayoutClient';
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
      <div className="portal-docs-shell overflow-hidden rounded-[28px] border border-border/60 bg-background shadow-sm">
        <main className="min-h-0 [--fd-banner-height:0px] [--portal-docs-top-offset:0px]">
          <DocsLayoutClient docsTree={docsTree} role={session.role}>
            {children}
          </DocsLayoutClient>
        </main>
      </div>
    </RootProvider>
  );
}
