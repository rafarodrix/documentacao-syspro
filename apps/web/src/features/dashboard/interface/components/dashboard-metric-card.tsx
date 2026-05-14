import { Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { Target } from "lucide-react";

export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const toneClasses = {
  blue: "bg-sky-500/10 text-sky-500",
  amber: "bg-amber-500/10 text-amber-500",
  emerald: "bg-emerald-500/10 text-emerald-500",
  red: "bg-red-500/10 text-red-500",
} as const;

type Trend = {
  delta: number;
  label: string;
  downIsGood?: boolean;
};

function TrendIndicator({ delta, label, downIsGood }: Trend) {
  if (delta === 0) {
    return (
      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Minus className="h-3 w-3" />
        Estavel {label}
      </p>
    );
  }

  const isPositive = delta > 0;
  const isGood = downIsGood ? !isPositive : isPositive;
  const colorClass = isGood ? "text-emerald-500" : "text-red-500";
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium", colorClass)}>
      <Icon className="h-3 w-3" />
      {isPositive ? "+" : ""}{delta} {label}
    </p>
  );
}

export function DashboardMetricCard({
  title,
  value,
  helper,
  icon: Icon,
  tone,
  trend,
}: {
  title: string;
  value: number | string;
  helper: string;
  icon: typeof Target;
  tone: keyof typeof toneClasses;
  trend?: Trend;
}) {
  return (
    <Card className="h-full min-h-[136px] border-border/50 bg-card/70 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 pb-2 pt-4">
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", toneClasses[tone])}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </CardHeader>
      <CardContent className="flex h-full flex-col justify-between px-4 pb-4">
        <div className="text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
        {trend ? (
          <TrendIndicator {...trend} />
        ) : (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{helper}</p>
        )}
        {trend ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}
