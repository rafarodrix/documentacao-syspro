'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Root as PageTreeRoot, Node as PageTreeNode } from 'fumadocs-core/page-tree';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DocsSidebarSectionNav({ tree }: { tree: PageTreeRoot }) {
  const pathname = usePathname();

  return (
    <div className="docs-sidebar-section-nav mt-4 space-y-1">
      {tree.children.map((node, index) => (
        <SidebarNode key={getNodeKey(node, index)} node={node} pathname={pathname} depth={0} />
      ))}
    </div>
  );
}

function SidebarNode({
  node,
  pathname,
  depth,
}: {
  node: PageTreeNode;
  pathname: string;
  depth: number;
}) {
  if (node.type === 'page') {
    const isActive = pathname === node.url;

    return (
      <Link
        href={node.url}
        className={cn(
          'flex items-center rounded-lg px-2.5 py-1.5 text-sm no-underline transition-colors',
          'text-muted-foreground hover:bg-accent/30 hover:text-foreground',
          isActive && 'bg-accent font-medium text-foreground',
          depth > 0 && 'ml-3 text-[13px]',
        )}
      >
        <span className="truncate">{node.name}</span>
      </Link>
    );
  }

  if (node.type === 'folder') {
    const folderHref = node.index?.url;
    const isDirectActive = folderHref ? pathname === folderHref : false;
    const isNestedActive = folderHref ? pathname.startsWith(`${folderHref}/`) : false;
    const isActive = isDirectActive || isNestedActive;

    return (
      <div className={cn('space-y-1', depth > 0 && 'ml-2')}>
        {folderHref ? (
          <Link
            href={folderHref}
            className={cn(
              depth === 0
                ? 'flex items-center gap-2 px-0.5 py-2 text-sm font-semibold text-foreground no-underline'
                : 'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm no-underline transition-colors text-foreground/92 hover:bg-accent/30',
              isActive && depth > 0 && 'bg-accent font-medium text-foreground',
            )}
          >
            <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground/70', isActive && 'text-foreground/80')} />
            <span className="truncate">{node.name}</span>
          </Link>
        ) : (
          <div className={cn(
            depth === 0
              ? 'flex items-center gap-2 px-0.5 py-2 text-sm font-semibold text-foreground'
              : 'flex items-center gap-2 px-2.5 py-1.5 text-sm font-medium text-foreground/92',
          )}>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
            <span className="truncate">{node.name}</span>
          </div>
        )}

        <div className={cn('space-y-1', depth === 0 && 'pb-2')}>
          {node.children.map((child, index) => (
            <SidebarNode key={getNodeKey(child, index)} node={child} pathname={pathname} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function getNodeKey(node: PageTreeNode, index: number) {
  if (node.type === 'page') return node.url;
  if (node.type === 'folder') return node.index?.url ?? `${node.name}-${index}`;
  return `${node.type}-${index}`;
}
