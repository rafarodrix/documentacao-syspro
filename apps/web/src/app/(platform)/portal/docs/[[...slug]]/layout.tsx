import type { ReactNode } from 'react';
import { createDocsTreeForUser } from '@/lib/source';
import { requireSession } from '@/lib/auth-helpers';
import { DocsLayoutClient } from '@/components/docs/docs-layout-client';
import { canRoleAccessDocsScope, getDocScopeFromSlug } from '@/lib/docs-scope';
import type { Folder, Root as PageTreeRoot } from 'fumadocs-core/page-tree';

function normalizeUrl(url: string) {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function collectFolderUrls(folder: Folder, output = new Set<string>()) {
  if (folder.index?.url) {
    output.add(normalizeUrl(folder.index.url));
  }

  for (const child of folder.children) {
    if (child.type === 'page') {
      output.add(normalizeUrl(child.url));
      continue;
    }

    if (child.type === 'folder') {
      collectFolderUrls(child, output);
    }
  }

  return output;
}

function findScopeFolder(tree: PageTreeRoot, scopeUrl: string) {
  const expectedUrl = normalizeUrl(scopeUrl);

  return tree.children.find((node): node is Folder => {
    if (node.type !== 'folder') return false;
    return collectFolderUrls(node).has(expectedUrl);
  });
}

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
  const activeFolder = findScopeFolder(docsTree, `/portal/docs/${scope}`);

  const activeTree: PageTreeRoot = activeFolder && activeFolder.type === 'folder'
    ? {
        ...docsTree,
        name: activeFolder.name,
        children: activeFolder.children,
      }
    : docsTree;

  return (
    <DocsLayoutClient docsTree={activeTree} canViewSupport={canViewSupport} canViewAdmin={canViewAdmin}>
      {children}
    </DocsLayoutClient>
  );
}
