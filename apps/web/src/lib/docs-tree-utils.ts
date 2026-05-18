import type { Root as PageTreeRoot, Node as PageTreeNode, Item as PageTreeItem } from 'fumadocs-core/page-tree';

export function filterDocTree(
  tree: PageTreeRoot,
  allow: (url: string) => boolean,
): PageTreeRoot {
  function filterItem(item: PageTreeItem): PageTreeItem | null {
    return allow(item.url) ? item : null;
  }

  function filterNode(node: PageTreeNode): PageTreeNode | null {
    if (node.type === 'page') {
      return filterItem(node);
    }

    if (node.type === 'folder') {
      const children = node.children
        .map(filterNode)
        .filter((n): n is PageTreeNode => n !== null);

      const index = node.index ? filterItem(node.index) : undefined;

      if (children.length === 0 && !index) return null;

      return {
        ...node,
        children,
        ...(index != null ? { index } : {}),
      };
    }

    return node;
  }

  const children = tree.children
    .map(filterNode)
    .filter((n): n is PageTreeNode => n !== null);

  return {
    ...tree,
    children,
    ...(tree.fallback ? { fallback: filterDocTree(tree.fallback, allow) } : {}),
  };
}
