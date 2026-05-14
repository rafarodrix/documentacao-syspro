'use client';

import { useEffect } from 'react';
import type { DocsRegisterViewInput } from '@dosc-syspro/contracts/docs';
import { trpc } from '@/lib/api/trpc-client';

export function DocsPageViewTracker({ href, title }: { href: string; title: string }) {
  useEffect(() => {
    const visitedAt = Date.now();
    const payload: DocsRegisterViewInput = { href, title, visitedAt };

    // Reporta visita para a API via tRPC e usa sendBeacon como fallback em saida rapida.
    let settled = false;
    const request = trpc.docs.registerView
      .mutate(payload)
      .catch(() => undefined)
      .finally(() => {
        settled = true;
      });

    const flushWithBeacon = () => {
      if (settled || typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
        return;
      }

      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon('/api/trpc/docs.registerView', blob);
      settled = true;
    };

    window.addEventListener('pagehide', flushWithBeacon);

    void request;

    return () => {
      window.removeEventListener('pagehide', flushWithBeacon);
    };
  }, [href, title]);

  return null;
}
