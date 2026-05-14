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

type FolderProps = {
  item: PageTreeFolder;
  level: number;
  children: ReactNode;
};

type ItemProps = {
  item: PageTreeItem;
};

export function DocsSidebarFolder({ item, level, children }: FolderProps) {
  const path = useTreePath();
  const isTopLevel = level === 1;
  const isPriorityTopLevel = isTopLevel && (item.name === 'Primeiros Passos' || item.name === 'Documentação');
  const defaultOpen = Boolean(item.defaultOpen) || path.includes(item);

  if (item.index) {
    return (
      <SidebarFolder
        defaultOpen={defaultOpen}
        className={isTopLevel ? `docs-tree-folder docs-tree-folder-top${isPriorityTopLevel ? ' docs-tree-folder-top-priority' : ''}` : 'docs-tree-folder'}
      >
        <SidebarFolderLink
          href={item.index.url}
          external={item.index.external}
          className={
            isTopLevel
              ? `docs-tree-trigger docs-tree-trigger-top${isPriorityTopLevel ? ' docs-tree-trigger-top-priority' : ' docs-tree-trigger-top-secondary'}`
              : 'docs-tree-trigger'
          }
        >
          {item.icon}
          {item.name}
        </SidebarFolderLink>
        <SidebarFolderContent className={isTopLevel ? 'docs-tree-content docs-tree-content-top' : 'docs-tree-content'}>
          {children}
        </SidebarFolderContent>
      </SidebarFolder>
    );
  }

  return (
    <SidebarFolder
      defaultOpen={defaultOpen}
      className={isTopLevel ? `docs-tree-folder docs-tree-folder-top${isPriorityTopLevel ? ' docs-tree-folder-top-priority' : ''}` : 'docs-tree-folder'}
    >
      <SidebarFolderTrigger
        className={
          isTopLevel
            ? `docs-tree-trigger docs-tree-trigger-top${isPriorityTopLevel ? ' docs-tree-trigger-top-priority' : ' docs-tree-trigger-top-secondary'}`
            : 'docs-tree-trigger'
        }
      >
        {item.icon}
        {item.name}
      </SidebarFolderTrigger>
      <SidebarFolderContent className={isTopLevel ? 'docs-tree-content docs-tree-content-top' : 'docs-tree-content'}>
        {children}
      </SidebarFolderContent>
    </SidebarFolder>
  );
}

export function DocsSidebarItem({ item }: ItemProps) {
  const label = item.url === '/portal/docs/cliente' ? 'Visão Geral' : item.name;
  const isOverview = item.url === '/portal/docs/cliente';

  return (
    <SidebarItem
      href={item.url}
      external={item.external}
      icon={item.icon}
      className={isOverview ? 'docs-tree-item docs-tree-item-overview docs-tree-item-overview-priority' : 'docs-tree-item'}
    >
      {label}
    </SidebarItem>
  );
}
