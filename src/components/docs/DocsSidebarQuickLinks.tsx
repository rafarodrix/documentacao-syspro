'use client';

import Link from 'next/link';
import { BookOpenText, CircleHelp, LifeBuoy, ReceiptText } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_LINKS = [
  { href: '/docs/manual/cadastro', label: 'Cadastro', icon: BookOpenText },
  { href: '/docs/manual/financeiro', label: 'Financeiro', icon: ReceiptText },
  { href: '/docs/duvidas/rejeicoes/nfe-nfce', label: 'Rejeições NFe', icon: CircleHelp },
  { href: '/docs/suporte', label: 'Suporte', icon: LifeBuoy },
];

export function DocsSidebarQuickLinks() {
  return (
    <div className="mb-3 rounded-lg border border-border/60 bg-card/40 p-2">
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Atalhos
      </p>
      <div className="space-y-1">
        {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
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
    </div>
  );
}

