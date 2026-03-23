import { Clock3 } from 'lucide-react';

export function DocsReadingTime({ minutes }: { minutes: number }) {
  if (!Number.isFinite(minutes) || minutes <= 0) return null;

  return (
    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border/70 px-2 py-1 text-xs text-muted-foreground">
      <Clock3 className="h-3.5 w-3.5" />
      <span>{minutes} min de leitura</span>
    </div>
  );
}
