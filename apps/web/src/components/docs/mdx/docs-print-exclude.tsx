import type { ReactNode } from 'react';

export function DocsPrintExclude({ children }: { children: ReactNode }) {
  return <div data-docs-print-exclude="true">{children}</div>;
}
