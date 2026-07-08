import { cn } from "@/lib/utils";
import { DashboardMetricCard, type DashboardMetricCardProps } from "./dashboard-metric-card";

export function DashboardMetricGrid({
  metrics,
  className,
}: {
  metrics: DashboardMetricCardProps[];
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4", className)}>
      {metrics.map((metric) => (
        <DashboardMetricCard key={metric.title} {...metric} />
      ))}
    </div>
  );
}
