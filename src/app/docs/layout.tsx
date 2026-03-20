import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { baseOptions } from '@/app/docs/layout.config';
import { source } from '@/lib/source';
import { SiteHeader } from "@/components/site/Header";
import { requireSession } from "@/lib/auth-helpers";

export default async function Layout({ children }: { children: ReactNode }) {
  await requireSession();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 min-h-0 overflow-y-auto">
        <DocsLayout tree={source.pageTree} {...baseOptions}>
          {children}
        </DocsLayout>
      </main>
    </div>
  );
}
