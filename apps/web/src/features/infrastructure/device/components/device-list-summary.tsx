"use client";

import type { DeviceLifecycleStatus, DeviceListSummary } from "@dosc-syspro/contracts";
import { Badge } from "@dosc-syspro/ui";
import { Search, RotateCcw } from "lucide-react";

type DeviceListSummaryProps = {
  summary?: DeviceListSummary | null;
  activeLifecycle: DeviceLifecycleStatus | "ALL";
  query?: string;
  totalFilteredItems: number;
};

export function DeviceListSummaryBar({
  summary,
  activeLifecycle,
  query,
  totalFilteredItems,
}: DeviceListSummaryProps) {
  if (query && query.trim()) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Search className="h-3.5 w-3.5 text-primary" />
        <span>
          <strong className="text-foreground font-semibold">{totalFilteredItems}</strong> resultado{totalFilteredItems === 1 ? "" : "s"} para “{query.trim()}”
        </span>
      </div>
    );
  }

  if (activeLifecycle === "AWAITING_LINK") {
    const count = summary?.awaitingLinkCount ?? totalFilteredItems;
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium">
        <span>
          <strong className="font-bold">{count}</strong> dispositivo{count === 1 ? "" : "s"} aguardando empresa
        </span>
      </div>
    );
  }

  if (activeLifecycle === "DISCOVERED") {
    const count = summary?.discoveredCount ?? totalFilteredItems;
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400 font-medium">
        <span>
          <strong className="font-bold">{count}</strong> dispositivo{count === 1 ? "" : "s"} descoberto{count === 1 ? "" : "s"} aguardando vínculo
        </span>
      </div>
    );
  }

  if (activeLifecycle === "ARCHIVED") {
    const count = summary?.archivedCount ?? totalFilteredItems;
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <span>
          <strong className="font-bold">{count}</strong> dispositivo{count === 1 ? "" : "s"} arquivado{count === 1 ? "" : "s"}
        </span>
      </div>
    );
  }

  // Default Managed lifecycle view summary
  const managed = summary?.managedCount ?? totalFilteredItems;
  const online = summary?.online ?? 0;
  const offline = summary?.offline ?? 0;
  const warning = summary?.warning ?? 0;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>
        <strong className="text-foreground font-bold">{managed}</strong> gerenciados
      </span>
      <span>•</span>
      <span className="text-emerald-700 dark:text-emerald-400 font-medium">
        <strong className="font-bold">{online}</strong> online
      </span>
      <span>•</span>
      <span className="text-red-700 dark:text-red-400 font-medium">
        <strong className="font-bold">{offline}</strong> offline
      </span>
      {warning > 0 && (
        <>
          <span>•</span>
          <span className="text-amber-700 dark:text-amber-400 font-medium">
            <strong className="font-bold">{warning}</strong> com atenção
          </span>
        </>
      )}
    </div>
  );
}
