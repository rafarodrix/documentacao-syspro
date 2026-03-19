import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

export interface ActivityPoint {
  label: string;
  value: number;
}

interface ActivityChartProps {
  title: string;
  description: string;
  points: ActivityPoint[];
  badgeLabel?: string;
  emptyLabel?: string;
}

function formatValue(value: number) {
  return value.toLocaleString("pt-BR");
}

export function ActivityChart({
  title,
  description,
  points,
  badgeLabel = "Ultimos 7 dias",
  emptyLabel = "Sem atividade no periodo",
}: ActivityChartProps) {
  const max = Math.max(...points.map((p) => p.value), 0);
  const hasData = max > 0;

  return (
    <Card className="w-full xl:col-span-4 border-border/60 shadow-md bg-background/40 backdrop-blur-xl flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1 pr-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            {badgeLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pl-2 flex-1">
        <div className="h-[280px] w-full rounded-xl border border-border/50 bg-muted/5 relative overflow-hidden mx-2 p-4">
          {!hasData ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-center">
              <Activity className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">{emptyLabel}</p>
            </div>
          ) : (
            <div className="h-full flex items-end gap-2">
              {points.map((point) => {
                const height =
                  max > 0 ? Math.max((point.value / max) * 100, point.value > 0 ? 8 : 0) : 0;

                return (
                  <div key={point.label} className="flex-1 flex flex-col items-center justify-end gap-2 min-w-0">
                    <span className="text-[11px] text-muted-foreground font-mono">{formatValue(point.value)}</span>
                    <div
                      className="w-full rounded-t-md bg-primary/80 hover:bg-primary transition-colors"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[11px] text-muted-foreground truncate max-w-full">{point.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
