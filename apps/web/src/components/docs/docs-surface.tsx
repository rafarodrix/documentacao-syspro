import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function DocsSurface({
  children,
  className,
  hoverable = false,
}: {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
}) {
  return (
    <div
      className={cn(
        'group overflow-hidden rounded-xl border border-border/50 bg-card/40',
        hoverable && 'transition-colors hover:border-border hover:bg-card/55',
        className,
      )}
    >
      {children}
    </div>
  );
}
