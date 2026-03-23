import type { ElementType } from 'react';
import { FileText } from 'lucide-react';

export function DocsEmptyState({
  message,
  icon: Icon = FileText,
}: {
  message: string;
  icon?: ElementType;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 px-4 py-6 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/40" />
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
