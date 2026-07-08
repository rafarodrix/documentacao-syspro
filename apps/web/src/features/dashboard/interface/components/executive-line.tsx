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
    <div className="rounded-xl border border-border/40 bg-background/55 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span className={cn("mt-1 block text-base font-bold leading-tight tabular-nums", emphasis)}>
        {value}
      </span>
    </div>
  );
}
