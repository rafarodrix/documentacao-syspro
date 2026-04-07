import type { ReactNode } from 'react';
import { Role } from '@prisma/client';
import { RootProvider } from 'fumadocs-ui/provider';
import { source } from '@/lib/source';
import { SiteHeader } from "@/components/site/Header";
import { requireSession } from "@/lib/auth-helpers";
import { SYSTEM_ROLES } from '@dosc-syspro/core';
import { isAdminOnlyDocUrl, DOCS_TECHNICAL_PATH_PREFIX } from '@/app/docs/docs-access';
import { filterDocTree } from '@/lib/docs-tree-utils';
import { DocsLayoutClient } from '@/components/docs/DocsLayoutClient';

export default async function Layout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  const canViewTechnicalDocs = SYSTEM_ROLES.includes(session.role);

  // Filtragens compostas: cada chamada a filterDocTree aplica um predicado.
  // Antes: ~60 linhas com 4 funções espelhadas (stripTechnicalDocs* + stripAdminOnly*).
  const docsTree = filterDocTree(
    filterDocTree(
      source.pageTree,
      (url) => canViewTechnicalDocs || !url.startsWith(DOCS_TECHNICAL_PATH_PREFIX),
    ),
    (url) => session.role === Role.ADMIN || !isAdminOnlyDocUrl(url),
  );

  return (
    <RootProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <div className="hidden md:block">
          <SiteHeader />
        </div>
        <main className="flex-1 min-h-0 [--fd-banner-height:0px] md:[--fd-banner-height:64px]">
          <DocsLayoutClient docsTree={docsTree} role={session.role}>
            {children}
          </DocsLayoutClient>
        </main>
      </div>
    </RootProvider>
  );
}
