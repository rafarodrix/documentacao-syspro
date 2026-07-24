"use client";

import type { DeviceLifecycleStatus, DeviceListSummary } from "@dosc-syspro/contracts";
import { FilterTabs } from "@/components/patterns";

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
  const options = [
    {
      value: "MANAGED" as const,
      label: "Gerenciados",
      count: summary?.managedCount,
    },
    {
      value: "AWAITING_LINK" as const,
      label: "Aguardando vínculo",
      count: summary?.awaitingLinkCount,
    },
    ...(canCreateHosts
      ? [
          {
            value: "DISCOVERED" as const,
            label: "Descobertos",
            count: summary?.discoveredCount,
          },
        ]
      : []),
    {
      value: "ARCHIVED" as const,
      label: "Arquivados",
      count: summary?.archivedCount,
    },
  ];

  return (
    <FilterTabs
      options={options}
      value={activeTab === "ALL" ? "MANAGED" : activeTab}
      onChange={onTabChange}
    />
  );
}
