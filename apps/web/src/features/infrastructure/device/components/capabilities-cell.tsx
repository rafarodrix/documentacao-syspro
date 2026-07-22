"use client";

import type { DeviceCapability, DeviceListItem } from "@dosc-syspro/contracts";
import { Badge } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";

type CapabilitiesCellProps = {
  item: DeviceListItem;
};

const FIXED_ORDER: DeviceCapability[] = ["AGENT", "REMOTE", "ERP", "BACKUP", "TUNNEL"];

const CAPABILITY_LABEL_MAP: Record<DeviceCapability, string> = {
  AGENT: "Agente",
  REMOTE: "Remoto",
  ERP: "ERP",
  BACKUP: "Backup",
  TUNNEL: "Túnel",
};

export function CapabilitiesCell({ item }: CapabilitiesCellProps) {
  const activeCapabilities = FIXED_ORDER.filter((cap) => item.capabilities.includes(cap));

  if (activeCapabilities.length === 0) {
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }

  const getTooltip = (cap: DeviceCapability) => {
    if (cap === "AGENT") {
      return `Trilink Agent\nVersão ${item.agentVersion ?? "1.0.0"}\nOperacional`;
    }
    if (cap === "REMOTE") {
      return `RustDesk\nID ${item.remote.externalIdFormatted ?? "Sem ID"}\n${item.remote.isOperational ? "Operacional" : "Indisponível"}`;
    }
    if (cap === "ERP") {
      return `Syspro ERP\n${item.sysproUpdate?.instanceName ?? "Instalação validada"}\n${item.sysproUpdate?.environment ?? "Produção"}`;
    }
    if (cap === "BACKUP") {
      return "Backup\nStatus da última execução configurado";
    }
    if (cap === "TUNNEL") {
      return "Túnel de rede configurado";
    }
    return CAPABILITY_LABEL_MAP[cap];
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {activeCapabilities.map((cap) => (
        <Badge
          key={cap}
          variant="outline"
          className={cn(
            "h-5 px-1.5 text-[9px] font-bold tracking-tight border-border/60 bg-muted/30 text-muted-foreground",
            cap === "REMOTE" && item.remote.isOperational && "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
            cap === "AGENT" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
            cap === "ERP" && "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
          )}
          title={getTooltip(cap)}
        >
          {CAPABILITY_LABEL_MAP[cap]}
        </Badge>
      ))}
    </div>
  );
}
