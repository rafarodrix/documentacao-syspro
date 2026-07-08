"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BookOpen,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  DollarSign,
  FileText,
  Headset,
  Inbox,
  Loader2,
  MessageSquareText,
  Minus,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";

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

const iconMap = {
  alertTriangle: AlertTriangle,
  bookOpen: BookOpen,
  building: Building2,
  checkCircle: CheckCircle2,
  clipboardList: ClipboardList,
  clock: Clock,
  dollar: DollarSign,
  fileText: FileText,
  headset: Headset,
  inbox: Inbox,
  loader: Loader2,
  messageSquareText: MessageSquareText,
  shieldAlert: ShieldAlert,
  sparkles: Sparkles,
  target: Target,
  trendingDown: TrendingDown,
  trendingUp: TrendingUp,
  user: UserRound,
  users: Users,
} as const;

export type DashboardMetricIconKey = keyof typeof iconMap;

export type DashboardMetricCardProps = {
  title: string;
  value: number | string;
  helper?: string;
  icon: DashboardMetricIconKey;
  tone: keyof typeof toneClasses;
  trend?: Trend;
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
      {isPositive ? "+" : ""}
      {delta} {label}
    </p>
  );
}

export function DashboardMetricCard({
  title,
  value,
  helper,
  icon,
  tone,
  trend,
}: DashboardMetricCardProps) {
  const Icon = iconMap[icon];

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 pb-1 pt-4">
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", toneClasses[tone])}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5 px-4 pb-4">
        <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">{value}</div>
        {trend ? (
          <TrendIndicator {...trend} />
        ) : helper ? (
          <p className="text-xs leading-relaxed text-muted-foreground/80">{helper}</p>
        ) : null}
        {trend && helper ? <p className="text-xs leading-relaxed text-muted-foreground/80">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}
