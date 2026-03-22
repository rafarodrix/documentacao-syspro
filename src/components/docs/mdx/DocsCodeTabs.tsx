'use client';

import type { ReactNode } from 'react';
import { Tab, Tabs, type TabsProps } from 'fumadocs-ui/components/tabs';

const DEFAULT_GROUP_ID = 'docs-code-language';

export function CodeTabs({
  items,
  defaultValue,
  groupId = DEFAULT_GROUP_ID,
  children,
  ...props
}: {
  items: string[];
  defaultValue?: string;
  groupId?: string;
  children: ReactNode;
} & Omit<TabsProps, 'items' | 'defaultValue' | 'children'>) {
  return (
    <Tabs
      items={items}
      defaultValue={defaultValue ?? items[0]}
      groupId={groupId}
      persist
      updateAnchor={false}
      {...props}
    >
      {children}
    </Tabs>
  );
}

export function CodeTab({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  return <Tab value={value}>{children}</Tab>;
}
