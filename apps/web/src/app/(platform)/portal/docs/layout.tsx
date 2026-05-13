import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider';
import { createDocsTreeForUser } from '@/lib/source';
import { requireSession } from "@/lib/auth-helpers";
import { DocsLayoutClient } from '@/components/docs/docs-layout-client';
import { PortalShellModeController } from '@/components/platform/app/layout/portal-shell-mode-context';
import { canRoleAccessDocsScope } from '@/lib/docs-scope';

export default async function PortalDocsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireSession();
  const docsTree = await createDocsTreeForUser(session.userId, session.role);
  const searchLinks: Array<[string, string]> = [
    ['Portal', '/portal'],
    ['Documentacao do Cliente', '/portal/docs/cliente'],
  ];

  if (canRoleAccessDocsScope(session.role, 'suporte')) {
    searchLinks.push(['Documentacao de Suporte', '/portal/docs/suporte']);
  }

  if (canRoleAccessDocsScope(session.role, 'admin')) {
    searchLinks.push(['Documentacao Admin', '/portal/docs/admin']);
  }

  searchLinks.push(['Abrir Chamado', '/portal/tickets']);

  return (
    <RootProvider
      search={{
        links: searchLinks,
      }}
    >
      <PortalShellModeController showSidebar={false} />
      <main className="portal-docs-shell min-h-0 [--fd-banner-height:0px] [--portal-docs-top-offset:3.5rem]">
        <DocsLayoutClient docsTree={docsTree}>
          {children}
        </DocsLayoutClient>
      </main>
    </RootProvider>
  );
}
