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
        'group relative overflow-hidden rounded-xl border border-border/60 bg-background/50 shadow-md backdrop-blur-xl',
        hoverable && 'transition-all hover:border-primary/20 hover:shadow-lg',
        className,
      )}
    >
      <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-linear-to-r from-transparent via-primary/50 to-transparent opacity-70" />
      {children}
    </div>
  );
}
