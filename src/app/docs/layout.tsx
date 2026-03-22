import type { ReactNode } from 'react';
import { source } from '@/lib/source';
import { SiteHeader } from "@/components/site/Header";
import { requireSession } from "@/lib/auth-helpers";
import { SYSTEM_ROLES } from '@/core/config/route-access';
import type { Root as PageTreeRoot, Node as PageTreeNode, Item as PageTreeItem } from 'fumadocs-core/page-tree';
import { DocsLayoutClient } from '@/components/docs/DocsLayoutClient';

type DocsTree = typeof source.pageTree;

const TECHNICAL_DOCS_PREFIX = '/docs/manuais-tecnicos';

function stripTechnicalDocsPage(page: PageTreeItem): PageTreeItem | null {
  return page.url.startsWith(TECHNICAL_DOCS_PREFIX) ? null : page;
}

function stripTechnicalDocsNode(node: PageTreeNode): PageTreeNode | null {
  if (node.type === 'page') {
    return stripTechnicalDocsPage(node);
  }

  if (node.type === 'folder') {
    const children = node.children
      .map(stripTechnicalDocsNode)
      .filter((value): value is PageTreeNode => value !== null);
    const index = node.index ? stripTechnicalDocsPage(node.index) : undefined;

    if (children.length === 0 && !index) return null;

    return {
      ...node,
      children,
      ...(index ? { index } : {}),
    };
  }

  return node;
}

function stripTechnicalDocsTree(tree: PageTreeRoot): PageTreeRoot {
  return {
    ...tree,
    children: tree.children
      .map(stripTechnicalDocsNode)
      .filter((value): value is PageTreeNode => value !== null),
    ...(tree.fallback ? { fallback: stripTechnicalDocsTree(tree.fallback) } : {}),
  };
}

export default async function Layout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  const canViewTechnicalDocs = SYSTEM_ROLES.includes(session.role);
  const docsTree: DocsTree = canViewTechnicalDocs
    ? source.pageTree
    : stripTechnicalDocsTree(source.pageTree);

  return (
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
  );
}
