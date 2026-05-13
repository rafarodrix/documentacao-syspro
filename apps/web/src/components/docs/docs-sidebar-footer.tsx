'use client';

import Link from 'next/link';
import { ArrowUpRight, LifeBuoy, Newspaper, PanelsTopLeft, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type FooterLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const BASE_LINKS: FooterLink[] = [
  { href: '/portal', label: 'Voltar ao portal', icon: PanelsTopLeft },
  { href: '/portal/tickets', label: 'Abrir chamado', icon: LifeBuoy },
  { href: '/portal/releases', label: 'Releases', icon: Newspaper },
];

export function DocsSidebarFooter() {
  return (
    <div className="docs-sidebar-footer hidden md:block">
      <div className="border-t border-border/40 pt-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/68">
          Atalhos
        </p>

        <div className="grid gap-1">
          {BASE_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 rounded-xl px-1.5 py-2 text-sm text-muted-foreground no-underline transition-colors',
                'hover:bg-accent/35 hover:text-foreground',
              )}
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border/40 bg-background/58 text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="flex-1">{label}</span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-45" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
