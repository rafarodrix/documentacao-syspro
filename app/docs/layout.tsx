// Em: app/docs/layout.tsx

import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';

export default function DocsPageLayout({ children }: { children: ReactNode }) {
  return <DocsLayout>{children}</DocsLayout>;
}