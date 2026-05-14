import type { ReactNode } from 'react';
import { createDocsTreeForUser } from '@/lib/source';
import { requireSession } from '@/lib/auth-helpers';
import { DocsLayoutClient } from '@/components/docs/docs-layout-client';
import { canRoleAccessDocsScope } from '@/lib/docs-scope';

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

  return (
    <DocsLayoutClient docsTree={docsTree} canViewSupport={canViewSupport} canViewAdmin={canViewAdmin}>
      {children}
    </DocsLayoutClient>
  );
}
