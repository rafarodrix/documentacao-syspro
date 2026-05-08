import type { ElementType } from "react";
import { Card, CardContent } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: ElementType;
  tone?: "info" | "success" | "neutral" | "warning" | "danger";
  className?: string;
}

const TONE_STYLES: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  neutral: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  danger: "bg-red-500/10 text-red-600 dark:text-red-300",
};

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "neutral",
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("border-border/60 bg-card shadow-sm", className)}>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
            TONE_STYLES[tone],
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
