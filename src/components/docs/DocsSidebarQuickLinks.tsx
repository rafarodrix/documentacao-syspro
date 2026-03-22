'use client';

import Link from 'next/link';
import { BookOpenText, ChevronDown, CircleHelp, LifeBuoy, ReceiptText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Role } from '@prisma/client';
import { useEffect, useState } from 'react';

type QuickLink = { href: string; label: string; icon: typeof BookOpenText };

const BASE_LINKS: QuickLink[] = [
  { href: '/docs/manual/cadastro', label: 'Cadastro', icon: BookOpenText },
  { href: '/docs/manual/financeiro', label: 'Financeiro', icon: ReceiptText },
  { href: '/docs/duvidas/rejeicoes/nfe-nfce', label: 'Rejeições NFe', icon: CircleHelp },
  { href: '/docs/suporte', label: 'Suporte', icon: LifeBuoy },
];

const SYSTEM_LINKS: QuickLink[] = [
  { href: '/docs/manuais-tecnicos', label: 'Manuais Técnicos', icon: BookOpenText },
];

export function DocsSidebarQuickLinks({ role }: { role: Role }) {
  const isSystemRole = role === 'ADMIN' || role === 'DEVELOPER' || role === 'SUPORTE';
  const quickLinks = isSystemRole ? [...BASE_LINKS, ...SYSTEM_LINKS] : BASE_LINKS;
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('docs:quick-links:open');
      if (saved === '0') {
        setOpen(false);
      } else {
        // Primeiro acesso ou preferencia aberta
        setOpen(true);
        if (saved === null) localStorage.setItem('docs:quick-links:open', '1');
      }
    } catch {
      // ignore storage issues
    }
  }, []);

  function toggleOpen() {
    setOpen((prev) => {
      const next = !prev;
      localStorage.setItem('docs:quick-links:open', next ? '1' : '0');
      return next;
    });
  }

  return (
    <div className="mb-3 rounded-lg border border-border/60 bg-card/40 p-2">
      <button
        type="button"
        onClick={toggleOpen}
        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-accent"
      >
        <span>Atalhos</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', !open && '-rotate-90')} />
      </button>
      {open ? (
        <div className="mt-1 space-y-1">
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
      ) : null}
    </div>
  );
}
