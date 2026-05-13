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
      <div className="rounded-[1.15rem] border border-border/60 bg-background/76 p-3 backdrop-blur-xl">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
          Atalhos
        </p>

        <div className="grid gap-2">
          {BASE_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-2xl border border-border/55 bg-background/72 px-3 py-2.5 text-sm text-muted-foreground no-underline transition-all',
                'hover:border-primary/20 hover:bg-accent/55 hover:text-foreground',
              )}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border/55 bg-background/90 text-muted-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1">{label}</span>
              <ArrowUpRight className="h-4 w-4 opacity-55" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
