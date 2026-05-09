import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider';
import { createDocsSourceForRole } from '@/lib/source';
import { requireSession } from "@/lib/auth-helpers";
import { DocsLayoutClient } from '@/components/docs/docs-layout-client';
import { PortalShellModeController } from '@/components/platform/app/layout/portal-shell-mode-context';
import { getDocScopeFromSlug } from '@/lib/docs-scope';

export default async function PortalDocsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug?: string[] }>;
}) {
  const session = await requireSession();
  const resolvedParams = await params;
  const scope = getDocScopeFromSlug(resolvedParams.slug);
  const docsTree = createDocsSourceForRole(session.role, scope).pageTree;

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
