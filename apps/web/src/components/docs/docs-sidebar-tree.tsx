'use client';

import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'fumadocs-core/link';
import { usePathname } from 'fumadocs-core/framework';
import type { Folder as PageTreeFolder, Item as PageTreeItem } from 'fumadocs-core/page-tree';
import {
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarItem,
} from 'fumadocs-ui/components/layout/sidebar';
import { BookOpen, CircleHelp, GraduationCap, LayoutDashboard, LifeBuoy, Rocket } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@radix-ui/react-collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTreePath } from 'fumadocs-ui/contexts/tree';

type FolderProps = {
  item: PageTreeFolder;
  level: number;
  children: ReactNode;
};

type ItemProps = {
  item: PageTreeItem;
};

type TopLevelOpenListener = () => void;

let topLevelOpenName: string | null = null;
const topLevelListeners = new Set<TopLevelOpenListener>();

function getNodeLabel(value: ReactNode): string {
  return typeof value === 'string' ? value : '';
}

function subscribeTopLevel(listener: TopLevelOpenListener) {
  topLevelListeners.add(listener);
  return () => {
    topLevelListeners.delete(listener);
  };
}

function emitTopLevel() {
  topLevelListeners.forEach((listener) => listener());
}

function setTopLevelOpenName(value: string | null) {
  topLevelOpenName = value;
  emitTopLevel();
}

function useTopLevelOpenName() {
  return useSyncExternalStore(subscribeTopLevel, () => topLevelOpenName, () => topLevelOpenName);
}

function getTopLevelIcon(name: string) {
  switch (name) {
    case 'Visão Geral':
      return <LayoutDashboard className="h-4 w-4" />;
    case 'Primeiros Passos':
      return <Rocket className="h-4 w-4" />;
    case 'Documentação':
      return <BookOpen className="h-4 w-4" />;
    case 'Treinamentos':
      return <GraduationCap className="h-4 w-4" />;
    case 'Dúvidas':
      return <CircleHelp className="h-4 w-4" />;
    case 'Suporte':
      return <LifeBuoy className="h-4 w-4" />;
    default:
      return null;
  }
}

export function DocsSidebarFolder({ item, level, children }: FolderProps) {
  const path = useTreePath();
  const pathname = usePathname();
  const isTopLevel = level === 1;
  const itemLabel = getNodeLabel(item.name);
  const defaultOpen = Boolean(item.defaultOpen) || path.includes(item);

  useEffect(() => {
    if (!isTopLevel) return;
    if (!topLevelOpenName && path.includes(item)) {
      setTopLevelOpenName(itemLabel);
    }
  }, [isTopLevel, itemLabel, item, path]);

  if (!isTopLevel) {
    if (item.index) {
      return (
        <SidebarFolder
          defaultOpen={defaultOpen}
          className="docs-tree-folder"
        >
          <SidebarFolderLink href={item.index.url} external={item.index.external} className="docs-tree-trigger">
            {item.icon}
            {item.name}
          </SidebarFolderLink>
          <SidebarFolderContent className="docs-tree-content">
            {children}
          </SidebarFolderContent>
        </SidebarFolder>
      );
    }

    return (
      <SidebarFolder defaultOpen={defaultOpen} className="docs-tree-folder">
        <SidebarFolderTrigger className="docs-tree-trigger">
          {item.icon}
          {item.name}
        </SidebarFolderTrigger>
        <SidebarFolderContent className="docs-tree-content">
          {children}
        </SidebarFolderContent>
      </SidebarFolder>
    );
  }

  return (
    <DocsTopLevelFolder
      item={item}
      itemLabel={itemLabel}
      pathname={pathname}
    >
      {children}
    </DocsTopLevelFolder>
  );
}

function DocsTopLevelFolder({
  item,
  itemLabel,
  pathname,
  children,
}: {
  item: PageTreeFolder;
  itemLabel: string;
  pathname: string;
  children: ReactNode;
}) {
  const openName = useTopLevelOpenName();
  const href = item.index?.url;
  const isRouteActive = Boolean(href && (pathname === href || pathname.startsWith(`${href}/`)));
  const isOpen = openName === itemLabel || isRouteActive;
  const labelIcon = useMemo(() => getTopLevelIcon(itemLabel), [itemLabel]);

  useEffect(() => {
    if (isRouteActive && openName !== itemLabel) {
      setTopLevelOpenName(itemLabel);
    }
  }, [isRouteActive, itemLabel, openName]);

  const triggerClassName = 'docs-tree-trigger docs-tree-trigger-top flex min-w-0 items-center gap-2.5';

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={(nextOpen) => {
        setTopLevelOpenName(nextOpen ? itemLabel : null);
      }}
      className="docs-tree-folder docs-tree-folder-top"
    >
      <div className={triggerClassName} data-active={isRouteActive} data-state={isOpen ? 'open' : 'closed'}>
        {href ? (
          <Link
            href={href}
            className="docs-tree-link-top flex min-w-0 flex-1 items-center gap-2.5 text-inherit no-underline"
          >
            {labelIcon}
            <span className="truncate">{itemLabel}</span>
          </Link>
        ) : (
          <div className="docs-tree-link-top flex min-w-0 flex-1 items-center gap-2.5">
            {labelIcon}
            <span className="truncate">{itemLabel}</span>
          </div>
        )}
        <CollapsibleTrigger
          className="docs-tree-toggle ms-auto inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
          aria-label={isOpen ? `Recolher ${itemLabel}` : `Expandir ${itemLabel}`}
        >
          <ChevronDown className={cn('h-3 w-3 transition-transform', !isOpen && '-rotate-90')} />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="docs-tree-content docs-tree-content-top">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function DocsSidebarItem({ item }: ItemProps) {
  const label = item.url === '/portal/docs/cliente' ? 'Visão Geral' : getNodeLabel(item.name);
  const isOverview = item.url === '/portal/docs/cliente';
  const overviewIcon = isOverview ? getTopLevelIcon(label) : item.icon;

  return (
    <SidebarItem
      href={item.url}
      external={item.external}
      icon={overviewIcon}
      className={isOverview ? 'docs-tree-item docs-tree-item-overview' : 'docs-tree-item'}
    >
      {label}
    </SidebarItem>
  );
}
