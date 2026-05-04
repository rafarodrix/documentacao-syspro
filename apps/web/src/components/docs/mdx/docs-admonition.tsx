import type { ReactNode } from 'react';
import { Callout } from 'fumadocs-ui/components/callout';

type AdmonitionType = 'info' | 'warning' | 'error';

function DocsAdmonition({
  type,
  title,
  children,
}: {
  type: AdmonitionType;
  title: string;
  children: ReactNode;
}) {
  const calloutType = type === 'warning' ? 'warning' : type === 'error' ? 'error' : 'info';
  return (
    <Callout type={calloutType} title={title} className="my-4">
      {children}
    </Callout>
  );
}

export function Tip({ children }: { children: ReactNode }) {
  return (
    <DocsAdmonition type="info" title="Dica">
      {children}
    </docs-admonition>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <DocsAdmonition type="info" title="Nota">
      {children}
    </docs-admonition>
  );
}

export function Warning({ children }: { children: ReactNode }) {
  return (
    <DocsAdmonition type="warning" title="Atencao">
      {children}
    </docs-admonition>
  );
}

export function Danger({ children }: { children: ReactNode }) {
  return (
    <DocsAdmonition type="error" title="Critico">
      {children}
    </docs-admonition>
  );
}
