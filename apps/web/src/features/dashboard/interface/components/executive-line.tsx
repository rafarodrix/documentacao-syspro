import { cn } from "@/lib/utils";

export function ExecutiveLine({
  label,
  value,
  emphasis = "text-foreground",
}: {
  label: string;
  value: string;
  emphasis?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/40 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums", emphasis)}>{value}</span>
    </div>
  );
}
