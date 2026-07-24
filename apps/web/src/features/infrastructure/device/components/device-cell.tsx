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
    item.agentVersion ? `Agente: ${item.agentVersion}` : null,
    item.remote.externalIdFormatted ? `RustDesk: ${item.remote.externalIdFormatted}` : null,
    isAdmin && item.agentInstallationId ? `Device ID: ${item.agentInstallationId}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const statusVariantMap: Record<string, string> = {
    Gerenciado: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    "Aguardando vínculo": "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    Provisionando: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    Arquivado: "border-muted-foreground/30 bg-muted text-muted-foreground",
    Bloqueado: "border-destructive/30 bg-destructive/10 text-destructive",
  };

  const badgeClass = statusVariantMap[item.statusLabel] ?? "border-border/60 bg-muted/40 text-muted-foreground";

  return (
    <div className="flex min-w-0 flex-col gap-0.5" title={tooltipLines}>
      <span className="truncate text-xs font-semibold tracking-wide text-foreground">{line1Text}</span>
      <span className="truncate font-mono text-[11px] text-muted-foreground">{line2Text}</span>
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <Badge variant="outline" className={cn("h-4.5 px-1.5 text-[9px] font-semibold tracking-wider uppercase", badgeClass)}>
          {item.statusLabel}
        </Badge>
        {item.agentVersion ? (
          <span className="font-mono text-[10px] text-muted-foreground">v{item.agentVersion}</span>
        ) : null}
      </div>
    </div>
  );
}
