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
  const resolvedParams = await params;
  const docsTree = await createDocsTreeForUser(session.userId, session.role);
  const canViewSupport = canRoleAccessDocsScope(session.role, 'suporte');
  const canViewAdmin = canRoleAccessDocsScope(session.role, 'admin');

  const scope = getDocScopeFromSlug(resolvedParams.slug) || 'cliente';
  const expectedUrl = `/portal/docs/${scope}`;

  const activeFolder = docsTree.children.find(
    (node) => node.type === 'folder' && node.index?.url === expectedUrl
  );

  const activeTree: PageTreeRoot = activeFolder && activeFolder.type === 'folder'
    ? { name: activeFolder.name, children: activeFolder.children }
    : docsTree;

  return (
    <DocsLayoutClient docsTree={activeTree} canViewSupport={canViewSupport} canViewAdmin={canViewAdmin}>
      {children}
    </DocsLayoutClient>
  );
}
