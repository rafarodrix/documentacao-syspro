import { Clock3 } from 'lucide-react';

export function DocsReadingTime({ minutes }: { minutes: number }) {
  if (!Number.isFinite(minutes) || minutes <= 0) return null;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-xs text-muted-foreground shadow-sm">
      <Clock3 className="h-3.5 w-3.5" />
      <span>{minutes} min de leitura</span>
    </div>
  );
}
