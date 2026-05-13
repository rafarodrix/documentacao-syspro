'use client';

import type { Root as PageTreeRoot } from 'fumadocs-core/page-tree';
import { DocsSidebarSectionNav } from '@/components/docs/docs-sidebar-section-nav';

export function DocsSidebarBanner({
  docsTree,
}: {
  docsTree: PageTreeRoot;
}) {
  return (
    <div className="docs-sidebar-banner hidden md:block">
      <DocsSidebarSectionNav tree={docsTree} />
    </div>
  );
}
