import type { ReactNode } from 'react';
import { createDocsTreeForUserScope } from '@/lib/source';
import { requireSession } from '@/lib/auth-helpers';
import { DocsLayoutClient } from '@/components/docs/docs-layout-client';
import { canRoleAccessDocsScope, getDocScopeFromSlug, type DocsScope } from '@/lib/docs-scope';

export default async function PortalDocsSlugLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug?: string[] }>;
}) {
  const session = await requireSession();
  const routeParams = await params;
  const slug = routeParams.slug ?? [];
  const scope = resolveSidebarScope(slug);
  const branch = resolveSidebarBranch(slug, scope);
  const docsTree = await createDocsTreeForUserScope(session.userId, session.role, scope, branch);
  const canViewSupport = canRoleAccessDocsScope(session.role, 'suporte');
  const canViewAdmin = canRoleAccessDocsScope(session.role, 'admin');

  return (
    <DocsLayoutClient docsTree={docsTree} canViewSupport={canViewSupport} canViewAdmin={canViewAdmin}>
      {children}
    </DocsLayoutClient>
  );
}

function resolveSidebarScope(slug: string[]): DocsScope {
  const explicitScope = getDocScopeFromSlug(slug);
  if (explicitScope) return explicitScope;

  if (slug[0] === 'manuais-tecnicos') return 'admin';
  if (slug[0] === 'manual' || slug[0] === 'duvidas' || slug[0] === 'treinamento' || slug[0] === 'treinamentos') {
    return 'cliente';
  }

  return 'cliente';
}

function resolveSidebarBranch(slug: string[], scope: DocsScope): string | null {
  const normalized = normalizeLegacySlug(slug, scope);
  return normalized[1] ?? null;
}

function normalizeLegacySlug(slug: string[], scope: DocsScope): string[] {
  if (getDocScopeFromSlug(slug)) {
    return slug;
  }

  if (scope === 'admin' && slug[0] === 'manuais-tecnicos') {
    return ['admin'];
  }

  if (scope === 'cliente' && slug.length > 0) {
    return ['cliente', ...slug];
  }

  return slug;
}
