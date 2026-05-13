'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpenText, LifeBuoy, PanelLeft, Shield } from 'lucide-react';
import { SidebarCollapseTrigger } from 'fumadocs-ui/components/layout/sidebar';
import { useSidebar } from 'fumadocs-ui/contexts/sidebar';
import { cn } from '@/lib/utils';
import { DOCS_SCOPE_ROUTES } from '@/lib/docs-scope';

export function DocsSidebarBanner({
  canViewSupport,
  canViewAdmin,
}: {
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
      <div className="rounded-2xl border border-border/45 bg-background/42 p-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/72">
              Secao Atual
            </p>
            <div className="mt-1.5 inline-flex items-center gap-2 rounded-xl px-0.5 py-0.5 text-sm text-foreground">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border/45 bg-background/72 text-muted-foreground">
                <ScopeIcon className="h-3.5 w-3.5" />
              </span>
              <span className="font-medium text-[0.95rem]">{currentScope.label}</span>
            </div>
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

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {scopeLinks.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-[11px] font-medium no-underline transition-colors',
                  'border-border/40 text-muted-foreground hover:border-border/70 hover:bg-accent/35 hover:text-foreground',
                  isActive && 'border-primary/18 bg-primary/8 text-foreground',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
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
