"use client";

import type { DeviceListItem } from "@dosc-syspro/contracts";
import { Badge } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";

type DeviceCellProps = {
  item: DeviceListItem;
  isAdmin?: boolean;
};

export function DeviceCell({ item, isAdmin = false }: DeviceCellProps) {
  const line1Text = item.displayName || item.hostname || "DISPOSITIVO";
  const isSameName = (item.displayName || "").trim().toLowerCase() === (item.hostname || "").trim().toLowerCase();

  const hasValidIp = !!item.network.primaryIp;
  let line2Text = "";
  if (isSameName) {
    line2Text = hasValidIp ? item.network.primaryIp! : "IP não registrado";
  } else {
    line2Text = hasValidIp
      ? `${item.hostname} • ${item.network.primaryIp}`
      : `Hostname: ${item.hostname}`;
  }

  const tooltipLines = [
    `Nome no portal: ${item.displayName}`,
    `Hostname: ${item.hostname}`,
    item.remote.externalIdFormatted ? `RustDesk: ${item.remote.externalIdFormatted}` : null,
    isAdmin && item.agentInstallationId ? `Device ID: ${item.agentInstallationId}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const statusVariantMap: Record<string, string> = {
    Gerenciado: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    "Aguardando vínculo": "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    Provisionando: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    Arquivado: "border-muted-foreground/30 bg-muted text-muted-foreground",
    Bloqueado: "border-destructive/30 bg-destructive/10 text-destructive",
  };

  const badgeClass = statusVariantMap[item.statusLabel] ?? "border-border/60 bg-muted/40 text-muted-foreground";

  return (
    <div className="flex flex-col gap-0.5 min-w-0" title={tooltipLines}>
      {/* Line 1: Friendly name */}
      <span className="truncate text-xs font-bold uppercase tracking-wide text-foreground">
        {line1Text}
      </span>

      {/* Line 2: Hostname • IP */}
      <span className="truncate text-[11px] font-mono text-muted-foreground">
        {line2Text}
      </span>

      {/* Line 3: Administrative status badge */}
      <div className="pt-0.5">
        <Badge
          variant="outline"
          className={cn("h-4.5 px-1.5 text-[9px] font-semibold tracking-wider uppercase", badgeClass)}
        >
          {item.statusLabel}
        </Badge>
      </div>
    </div>
  );
}
