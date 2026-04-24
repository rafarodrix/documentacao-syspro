'use client';

import Link from 'next/link';
import { BookOpenText, ChevronDown, CircleHelp, LifeBuoy, ReceiptText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Role } from '@prisma/client';
import { useEffect, useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { DOCS_STORAGE_KEYS, readStorage, writeStorage } from '@/lib/docs-storage';

type QuickLink = { href: string; label: string; icon: typeof BookOpenText };

const BASE_LINKS: QuickLink[] = [
  { href: '/portal/docs', label: 'Central da Doc', icon: BookOpenText },
  { href: '/portal/docs/manual/cadastro', label: 'Cadastro', icon: BookOpenText },
  { href: '/portal/docs/manual/financeiro', label: 'Financeiro', icon: ReceiptText },
  { href: '/portal/docs/duvidas/rejeicoes/nfe-nfce', label: 'RejeiÃ§Ãµes NFe', icon: CircleHelp },
  { href: '/portal/docs/suporte', label: 'Suporte', icon: LifeBuoy },
];

const SYSTEM_LINKS: QuickLink[] = [
  { href: '/portal/docs/manuais-tecnicos', label: 'Manuais TÃ©cnicos', icon: BookOpenText },
];

export function DocsSidebarQuickLinks({ role }: { role: Role }) {
  const isSystemRole = role === 'ADMIN' || role === 'DEVELOPER' || role === 'SUPORTE';
  const quickLinks = isSystemRole ? [...BASE_LINKS, ...SYSTEM_LINKS] : BASE_LINKS;

  const [open, setOpen] = useState(true);

  // Inicializa a preferÃªncia de open/close do localStorage
  useEffect(() => {
    const isCompact = window.matchMedia('(max-height: 860px)').matches;
    const saved = readStorage<string>(DOCS_STORAGE_KEYS.quickLinksOpen, '');

    if (saved === '0') { setOpen(false); return; }
    if (saved === '1') { setOpen(true); return; }

    // Sem preferÃªncia salva: usar viewport como fallback
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

