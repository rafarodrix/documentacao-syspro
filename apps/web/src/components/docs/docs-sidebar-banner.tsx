'use client';

import type { Root as PageTreeRoot } from 'fumadocs-core/page-tree';
import type { Option as SidebarTabOption } from 'fumadocs-ui/components/layout/root-toggle';
import { RootToggle } from 'fumadocs-ui/components/layout/root-toggle';
import { DocsSidebarSectionNav } from '@/components/docs/docs-sidebar-section-nav';

export function DocsSidebarBanner({
  docsTree,
  profileTabs,
}: {
  docsTree: PageTreeRoot;
  profileTabs: SidebarTabOption[];
}) {
  return (
    <div className="docs-sidebar-banner hidden md:block">
      {profileTabs.length > 1 ? (
        <RootToggle options={profileTabs} className="mb-3 w-full" />
      ) : null}
      <DocsSidebarSectionNav tree={docsTree} />
    </div>
  );
}
