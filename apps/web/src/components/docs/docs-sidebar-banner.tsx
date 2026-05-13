'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Root as PageTreeRoot } from 'fumadocs-core/page-tree';
import { BookOpenText, LifeBuoy, PanelLeft, Shield } from 'lucide-react';
import { SidebarCollapseTrigger } from 'fumadocs-ui/components/layout/sidebar';
import { useSidebar } from 'fumadocs-ui/contexts/sidebar';
import { cn } from '@/lib/utils';
import { DOCS_SCOPE_ROUTES } from '@/lib/docs-scope';
import { DocsSidebarSectionNav } from '@/components/docs/docs-sidebar-section-nav';

export function DocsSidebarBanner({
  docsTree,
  canViewSupport,
  canViewAdmin,
}: {
  docsTree: PageTreeRoot;
  canViewSupport: boolean;
  canViewAdmin: boolean;
}) {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const actionLabel = collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral';
  const currentScope = getCurrentScope(pathname);
  const ScopeIcon = currentScope.icon;
  const scopeLinks = [
    { href: DOCS_SCOPE_ROUTES.cliente, label: 'Cliente' },
    ...(canViewSupport ? [{ href: DOCS_SCOPE_ROUTES.suporte, label: 'Suporte' }] : []),
    ...(canViewAdmin ? [{ href: DOCS_SCOPE_ROUTES.admin, label: 'Admin' }] : []),
  ];

  return (
    <div className="docs-sidebar-banner hidden md:block">
      <div className="flex items-center justify-between gap-3 pb-1.5">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="inline-flex h-6.5 w-6.5 items-center justify-center rounded-lg border border-border/40 bg-background/64 text-muted-foreground">
            <ScopeIcon className="h-3.5 w-3.5" />
          </span>
          <span>{currentScope.label}</span>
        </div>

        <SidebarCollapseTrigger
          aria-label={actionLabel}
          title={actionLabel}
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border/45 bg-background/72',
            'text-muted-foreground/82 transition-colors hover:border-border/70 hover:bg-accent/45 hover:text-foreground',
            collapsed && 'text-primary/90',
          )}
        >
          <PanelLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </SidebarCollapseTrigger>
      </div>

      <div className="rounded-xl border border-border/40 bg-background/34 p-1">
        <div className="flex flex-wrap gap-1">
          {scopeLinks.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-[12px] font-medium no-underline transition-colors',
                  'text-muted-foreground hover:bg-accent/35 hover:text-foreground',
                  isActive && 'bg-accent text-foreground',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <DocsSidebarSectionNav tree={docsTree} />
    </div>
  );
}

function getCurrentScope(pathname: string) {
  if (pathname === DOCS_SCOPE_ROUTES.admin || pathname.startsWith(`${DOCS_SCOPE_ROUTES.admin}/`)) {
    return { label: 'Admin', icon: Shield };
  }

  if (pathname === DOCS_SCOPE_ROUTES.suporte || pathname.startsWith(`${DOCS_SCOPE_ROUTES.suporte}/`)) {
    return { label: 'Suporte', icon: LifeBuoy };
  }

  return { label: 'Cliente', icon: BookOpenText };
}
