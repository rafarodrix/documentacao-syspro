'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

export function DocsKeyboardShortcuts({
  previousHref,
  nextHref,
}: {
  previousHref?: string;
  nextHref?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;

      if (event.key === '?') {
        event.preventDefault();
        setOpen(true);
        return;
      }

      if (event.key === '[' && previousHref) {
        event.preventDefault();
        router.push(previousHref);
        return;
      }

      if (event.key === ']' && nextHref) {
        event.preventDefault();
        router.push(nextHref);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [nextHref, previousHref, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atalhos de teclado</DialogTitle>
          <DialogDescription>Navegue mais rapido pela documentacao.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded border border-border/70 px-3 py-2">
            <span>Abrir este painel</span>
            <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">?</kbd>
          </div>
          <div className="flex items-center justify-between rounded border border-border/70 px-3 py-2">
            <span>Busca global</span>
            <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">Ctrl/Cmd + K</kbd>
          </div>
          <div className="flex items-center justify-between rounded border border-border/70 px-3 py-2">
            <span>Pagina anterior</span>
            <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">[</kbd>
          </div>
          <div className="flex items-center justify-between rounded border border-border/70 px-3 py-2">
            <span>Proxima pagina</span>
            <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">]</kbd>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
