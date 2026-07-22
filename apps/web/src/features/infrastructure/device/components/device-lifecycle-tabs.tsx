"use client";

import type { DeviceLifecycleStatus, DeviceListSummary } from "@dosc-syspro/contracts";
import { cn } from "@/lib/utils";

type DeviceLifecycleTabsProps = {
  activeTab: DeviceLifecycleStatus | "ALL";
  onTabChange: (tab: DeviceLifecycleStatus | "ALL") => void;
  summary?: DeviceListSummary | null;
  canCreateHosts?: boolean;
};

export function DeviceLifecycleTabs({
  activeTab,
  onTabChange,
  summary,
  canCreateHosts = true,
}: DeviceLifecycleTabsProps) {
  const tabs: Array<{
    value: DeviceLifecycleStatus | "ALL";
    label: string;
    count?: number;
    hidden?: boolean;
  }> = [
    {
      value: "MANAGED",
      label: "Gerenciados",
      count: summary?.managedCount,
    },
    {
      value: "AWAITING_LINK",
      label: "Aguardando vínculo",
      count: summary?.awaitingLinkCount,
    },
    {
      value: "DISCOVERED",
      label: "Descobertos",
      count: summary?.discoveredCount,
      hidden: !canCreateHosts,
    },
    {
      value: "ARCHIVED",
      label: "Arquivados",
      count: summary?.archivedCount,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tabs
        .filter((t) => !t.hidden)
        .map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onTabChange(tab.value)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-all duration-200 hover:scale-[1.02]",
                isActive
                  ? "bg-primary text-primary-foreground border-transparent shadow-xs shadow-primary/20"
                  : "border-border/60 bg-background text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
    </div>
  );
}
