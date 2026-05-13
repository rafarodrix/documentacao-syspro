import type { ReactNode } from 'react';
import { createDocsTreeForUser } from '@/lib/source';
import { requireSession } from '@/lib/auth-helpers';
import { DocsLayoutClient } from '@/components/docs/docs-layout-client';
import { canRoleAccessDocsScope, getDocScopeFromSlug } from '@/lib/docs-scope';
import type { Root as PageTreeRoot } from 'fumadocs-core/page-tree';

export default async function PortalDocsSlugLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug?: string[] }>;
}) {
  const session = await requireSession();
  const docsTree = await createDocsTreeForUser(session.userId, session.role);
  const canViewSupport = canRoleAccessDocsScope(session.role, 'suporte');
  const canViewAdmin = canRoleAccessDocsScope(session.role, 'admin');

  return (
    <DocsLayoutClient docsTree={docsTree} canViewSupport={canViewSupport} canViewAdmin={canViewAdmin}>
      {children}
    </DocsLayoutClient>
  );
}
