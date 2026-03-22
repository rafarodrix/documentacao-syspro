import type { ElementType } from 'react';

export function DocsSectionHeader({
  icon: Icon,
  label,
}: {
  icon?: ElementType;
  label: string;
}) {
  return (
    <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {label}
    </p>
  );
}
