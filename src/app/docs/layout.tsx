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
      <div className="hidden md:block">
        <SiteHeader />
      </div>
      <main className="flex-1 min-h-0 [--fd-banner-height:0px] md:[--fd-banner-height:64px]">
        <DocsLayout tree={source.pageTree} {...baseOptions}>
          {children}
        </DocsLayout>
      </main>
    </div>
  );
}
