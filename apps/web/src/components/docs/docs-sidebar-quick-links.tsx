'use client';

import Link from 'next/link';
import { BookOpenText, ChevronDown, CircleHelp, LifeBuoy, ReceiptText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@dosc-syspro/ui";
import { DOCS_STORAGE_KEYS, readStorage, writeStorage } from '@/lib/docs-storage';
import { DOCS_SCOPE_ROUTES } from '@/lib/docs-scope';

type QuickLink = { href: string; label: string; icon: typeof BookOpenText };

const BASE_LINKS: QuickLink[] = [
  { href: DOCS_SCOPE_ROUTES.cliente, label: 'Central da Doc', icon: BookOpenText },
  { href: `${DOCS_SCOPE_ROUTES.cliente}/manual/cadastro`, label: 'Cadastro', icon: BookOpenText },
  { href: `${DOCS_SCOPE_ROUTES.cliente}/manual/financeiro`, label: 'Financeiro', icon: ReceiptText },
  { href: `${DOCS_SCOPE_ROUTES.cliente}/duvidas/rejeicoes/nfe-nfce`, label: 'Rejeicoes NFe', icon: CircleHelp },
  { href: `${DOCS_SCOPE_ROUTES.cliente}/suporte`, label: 'Suporte ao cliente', icon: LifeBuoy },
];

const ADMIN_LINKS: QuickLink[] = [
  { href: DOCS_SCOPE_ROUTES.admin, label: 'Admin', icon: BookOpenText },
];

export function DocsSidebarQuickLinks({ canViewTechnical }: { canViewTechnical: boolean }) {
  const quickLinks = canViewTechnical ? [...BASE_LINKS, ...ADMIN_LINKS] : BASE_LINKS;
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const isCompact = window.matchMedia('(max-height: 860px)').matches;
    const saved = readStorage<string>(DOCS_STORAGE_KEYS.quickLinksOpen, '');

    if (saved === '0') { setOpen(false); return; }
    if (saved === '1') { setOpen(true); return; }

    setOpen(!isCompact);
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    writeStorage(DOCS_STORAGE_KEYS.quickLinksOpen, next ? '1' : '0');
  }

  return (
    <div className="mb-3 rounded-lg border border-border/60 bg-card/40 p-2">
      <Collapsible open={open} onOpenChange={handleOpenChange}>
        <CollapsibleTrigger className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-accent">
          <span>Atalhos</span>
          <span className="ml-auto mr-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
            {quickLinks.length}
          </span>
          <ChevronDown
            className={cn('h-4 w-4 transition-transform duration-200', !open && '-rotate-90')}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-1">
          <div className="space-y-1">
            {quickLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                  'text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
