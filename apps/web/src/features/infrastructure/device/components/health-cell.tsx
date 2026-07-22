"use client";

import type { DeviceHealthInfo } from "@dosc-syspro/contracts";
import { cn } from "@/lib/utils";

type HealthCellProps = {
  health: DeviceHealthInfo;
};

export function HealthCell({ health }: HealthCellProps) {
  const statusMetaMap = {
    HEALTHY: {
      label: "Saudável",
      textClass: "text-emerald-700 dark:text-emerald-400 font-semibold",
    },
    WARNING: {
      label: "Atenção",
      textClass: "text-amber-700 dark:text-amber-400 font-semibold",
    },
    CRITICAL: {
      label: "Crítico",
      textClass: "text-red-700 dark:text-red-400 font-semibold",
    },
    UNEVALUATED: {
      label: "Sem avaliação",
      textClass: "text-muted-foreground font-medium",
    },
  };

  const meta = statusMetaMap[health.status] ?? statusMetaMap.UNEVALUATED;

  let subtitle = health.primaryReason ?? "Sem alertas ativos";
  if (health.activeAlerts > 1) {
    subtitle = `${health.activeAlerts} alertas ativos`;
  }

  const tooltipText = health.alertsList && health.alertsList.length > 0
    ? health.alertsList.join("\n")
    : subtitle;

  return (
    <div className="flex flex-col gap-0.5 min-w-0" title={tooltipText}>
      {/* Line 1: Consolidated Status */}
      <span className={cn("text-xs truncate", meta.textClass)}>{meta.label}</span>

      {/* Line 2: Primary reason or alert count */}
      <span className="truncate text-[11px] text-muted-foreground">{subtitle}</span>
    </div>
  );
}
