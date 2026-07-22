"use client";

import type { DeviceConnectivityInfo } from "@dosc-syspro/contracts";
import { cn } from "@/lib/utils";

type ConnectivityCellProps = {
  connectivity: DeviceConnectivityInfo;
};

function formatHeartbeatSubtitle(info: DeviceConnectivityInfo): string {
  if (!info.lastHeartbeatAt || info.lastHeartbeatDiffMinutes == null) {
    return "Sem heartbeat";
  }
  const diffMin = info.lastHeartbeatDiffMinutes;
  if (diffMin < 1) return "Agora";
  if (diffMin < 60) return `Há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Há ${diffH} h`;
  const diffDays = Math.floor(diffH / 24);
  return `Há ${diffDays} dia${diffDays === 1 ? "" : "s"}`;
}

export function ConnectivityCell({ connectivity }: ConnectivityCellProps) {
  const metaMap = {
    ONLINE: {
      label: "Online",
      dotClass: "bg-emerald-500 animate-pulse shadow-[0_0_0_3px_rgba(16,185,129,0.15)]",
      textClass: "text-emerald-700 dark:text-emerald-400 font-semibold",
    },
    STALE: {
      label: "Atrasado",
      dotClass: "bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.15)]",
      textClass: "text-amber-700 dark:text-amber-400 font-semibold",
    },
    OFFLINE: {
      label: "Offline",
      dotClass: "bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.15)]",
      textClass: "text-red-700 dark:text-red-400 font-semibold",
    },
    MISSING: {
      label: "Sem comunicação",
      dotClass: "bg-gray-400 shadow-[0_0_0_3px_rgba(156,163,175,0.15)]",
      textClass: "text-muted-foreground font-medium",
    },
  };

  const meta = metaMap[connectivity.status] ?? metaMap.MISSING;
  const subtitle = formatHeartbeatSubtitle(connectivity);

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      {/* Line 1: Colored dot + Status */}
      <div className="flex items-center gap-1.5">
        <span className={cn("h-2 w-2 rounded-full shrink-0", meta.dotClass)} />
        <span className={cn("text-xs truncate", meta.textClass)}>{meta.label}</span>
      </div>

      {/* Line 2: Heartbeat subtitle */}
      <span className="truncate text-[11px] text-muted-foreground">{subtitle}</span>
    </div>
  );
}
