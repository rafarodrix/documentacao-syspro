'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Role } from '@prisma/client';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { Root as PageTreeRoot, Node as PageTreeNode, Item as PageTreeItem } from 'fumadocs-core/page-tree';
import { DocsSidebarItem } from '@/components/docs/DocsSidebarItem';
import { DocsSidebarQuickLinks } from '@/components/docs/DocsSidebarQuickLinks';
import { DocsSidebarRecent } from '@/components/docs/DocsSidebarRecent';
import { DocsSidebarTopControls } from '@/components/docs/DocsSidebarTopControls';
import { DocsSidebarTreeQueryProvider } from '@/components/docs/DocsSidebarTreeQueryContext';

function getNodeLabel(node: PageTreeNode | PageTreeItem): string {
  const name = node.name;
  if (typeof name === 'string') return name;
  return '';
}

function cleanSeparators(nodes: PageTreeNode[]): PageTreeNode[] {
  const filtered = nodes.filter((node, index) => {
    if (node.type !== 'separator') return true;
    const previous = nodes[index - 1];
    const next = nodes[index + 1];
    return Boolean(previous && previous.type !== 'separator' && next && next.type !== 'separator');
  });
  return filtered;
}

function filterTreeNode(node: PageTreeNode, query: string): PageTreeNode | null {
  const normalized = query.toLowerCase();

  if (node.type === 'separator') return node;

  if (node.type === 'page') {
    const label = getNodeLabel(node).toLowerCase();
    const url = node.url.toLowerCase();
    if (label.includes(normalized) || url.includes(normalized)) return node;
    return null;
  }

  const folderLabel = getNodeLabel(node).toLowerCase();
  const folderMatch = folderLabel.includes(normalized);

  if (folderMatch) return node;

  const filteredChildren = cleanSeparators(
    node.children
      .map((child) => filterTreeNode(child, query))
      .filter((child): child is PageTreeNode => child !== null),
  );

  const indexMatch =
    node.index &&
    (getNodeLabel(node.index).toLowerCase().includes(normalized) ||
      node.index.url.toLowerCase().includes(normalized))
      ? node.index
      : undefined;

  if (!indexMatch && filteredChildren.length === 0) return null;

  return {
    ...node,
    children: filteredChildren,
    ...(indexMatch ? { index: indexMatch } : {}),
  };
}

function filterTree(tree: PageTreeRoot, query: string): PageTreeRoot {
  const normalized = query.trim();
  if (!normalized) return tree;

  const children = cleanSeparators(
    tree.children
      .map((child) => filterTreeNode(child, normalized))
      .filter((child): child is PageTreeNode => child !== null),
  );

  return {
    ...tree,
    children,
    ...(tree.fallback ? { fallback: filterTree(tree.fallback, normalized) } : {}),
  };
}

export function DocsLayoutClient({
  docsTree,
  role,
  children,
}: {
  docsTree: PageTreeRoot;
  role: Role;
  children: ReactNode;
}) {
  const [treeQuery, setTreeQuery] = useState('');
  const filteredTree = useMemo(() => filterTree(docsTree, treeQuery), [docsTree, treeQuery]);

  return (
    <DocsSidebarTreeQueryProvider value={{ query: treeQuery, setQuery: setTreeQuery }}>
      <DocsLayout
        tree={filteredTree}
        nav={{
          title: null,
          children: <DocsSidebarTopControls />,
        }}
        themeSwitch={{
          enabled: false,
        }}
        searchToggle={{
          components: {
            lg: false,
          },
        }}
        sidebar={{
          defaultOpenLevel: treeQuery.trim() ? 99 : 2,
          collapsible: false,
          components: {
            Item: DocsSidebarItem,
          },
          banner: (
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
              <DocsSidebarQuickLinks role={role} />
            </div>
          ),
          footer: <DocsSidebarRecent />,
        }}
      >
        {children}
      </DocsLayout>
    </DocsSidebarTreeQueryProvider>
  );
}
