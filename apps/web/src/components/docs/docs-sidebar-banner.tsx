'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpenText, ChevronRight, LifeBuoy, PanelLeft, Shield, type LucideIcon } from 'lucide-react';
import { SidebarCollapseTrigger } from 'fumadocs-ui/components/layout/sidebar';
import { useSidebar } from 'fumadocs-ui/contexts/sidebar';
import { cn } from '@/lib/utils';
import { DOCS_SCOPE_ROUTES } from '@/lib/docs-scope';

type ScopeLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

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

  const scopeLinks: ScopeLink[] = [
    { href: DOCS_SCOPE_ROUTES.cliente, label: 'Cliente', icon: BookOpenText },
    ...(canViewSupport ? [{ href: DOCS_SCOPE_ROUTES.suporte, label: 'Suporte', icon: LifeBuoy }] : []),
    ...(canViewAdmin ? [{ href: DOCS_SCOPE_ROUTES.admin, label: 'Admin', icon: Shield }] : []),
  ];

  return (
    <div className="docs-sidebar-banner hidden md:block">
      <div className="mb-3 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/90">
        <Link
          href="/portal"
          className="inline-flex items-center rounded-full border border-border/60 bg-background/65 px-2.5 py-1 no-underline transition-colors hover:border-border hover:bg-accent/50 hover:text-foreground"
        >
          Portal
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/55" />
        <span className="inline-flex items-center rounded-full border border-border/60 bg-background/65 px-2.5 py-1 text-foreground">
          Documentacao
        </span>
      </div>

      <div className="rounded-[1.15rem] border border-border/60 bg-background/78 p-3 shadow-[0_16px_38px_-30px_hsl(var(--foreground)/0.85)] backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
              Areas
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              Navegue por perfil
            </p>
          </div>

          <SidebarCollapseTrigger
            aria-label={actionLabel}
            title={actionLabel}
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-border/60 bg-background/92',
              'text-muted-foreground/85 shadow-[0_18px_44px_-28px_hsl(var(--foreground)/0.7)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:bg-accent/60 hover:text-foreground',
              collapsed && 'text-primary/90',
            )}
          >
            <PanelLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </SidebarCollapseTrigger>
        </div>

        <div className="grid gap-2">
          {scopeLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-sm no-underline transition-all',
                  'border-border/55 bg-background/72 text-muted-foreground hover:border-primary/20 hover:bg-accent/55 hover:text-foreground',
                  isActive && 'border-primary/20 bg-primary/8 font-medium text-foreground shadow-[0_16px_34px_-28px_hsl(var(--primary)/0.85)]',
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border/55 bg-background/90 text-muted-foreground',
                    isActive && 'border-primary/20 bg-primary/10 text-primary',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
