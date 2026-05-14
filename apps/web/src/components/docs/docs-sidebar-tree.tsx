'use client';

import type { ReactNode } from 'react';
import type { Folder as PageTreeFolder, Item as PageTreeItem } from 'fumadocs-core/page-tree';
import {
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarItem,
} from 'fumadocs-ui/components/layout/sidebar';
import { useTreePath } from 'fumadocs-ui/contexts/tree';
import { BookOpen, CircleHelp, GraduationCap, LayoutDashboard, LifeBuoy, Rocket } from 'lucide-react';

type FolderProps = {
  item: PageTreeFolder;
  level: number;
  children: ReactNode;
};

type ItemProps = {
  item: PageTreeItem;
};

function getNodeLabel(value: ReactNode): string {
  return typeof value === 'string' ? value : '';
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
  const itemLabel = getNodeLabel(item.name);
  const defaultOpen = Boolean(item.defaultOpen) || path.includes(item);
  const isTopLevel = level === 1;
  const icon = isTopLevel ? getTopLevelIcon(itemLabel) : item.icon;
  const triggerClassName = isTopLevel
    ? 'docs-tree-trigger docs-tree-trigger-top'
    : 'docs-tree-trigger';
  const contentClassName = isTopLevel
    ? 'docs-tree-content docs-tree-content-top'
    : 'docs-tree-content';

  return (
    <SidebarFolder defaultOpen={defaultOpen} className={isTopLevel ? 'docs-tree-folder docs-tree-folder-top' : 'docs-tree-folder'}>
      {item.index ? (
        <SidebarFolderLink href={item.index.url} external={item.index.external} className={triggerClassName}>
          {icon}
          {item.name}
        </SidebarFolderLink>
      ) : (
        <SidebarFolderTrigger className={triggerClassName}>
          {icon}
          {item.name}
        </SidebarFolderTrigger>
      )}
      <SidebarFolderContent className={contentClassName}>
        {children}
      </SidebarFolderContent>
    </SidebarFolder>
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
