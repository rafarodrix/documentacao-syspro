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
      return `Trilink Agent\nVersão ${item.agentVersion ?? "não informada"}\nOperacional`;
    }
    if (cap === "REMOTE") {
      return `RustDesk\nID ${item.remote.externalIdFormatted ?? "Sem ID"}\n${item.remote.isOperational ? "Operacional" : "Indisponível"}`;
    }
    if (cap === "ERP") {
      const version = item.sysproUpdate?.sysproVersion?.trim();
      const instance = item.sysproUpdate?.instanceName?.trim();
      return [
        "Syspro ERP",
        instance || item.sysproUpdate?.installationPath || "Instalação validada",
        version ? `Versão ${version}` : null,
        item.sysproUpdate?.environment ?? "Produção",
      ]
        .filter(Boolean)
        .join("\n");
    }
    if (cap === "BACKUP") {
      return "Backup\nStatus da última execução configurado";
    }
    if (cap === "TUNNEL") {
      return "Túnel de rede configurado";
    }
    return CAPABILITY_LABEL_MAP[cap];
  };

  const visibleCapabilities = activeCapabilities.slice(0, 3);
  const hiddenCapabilities = activeCapabilities.slice(3);
  const overflowTooltip = hiddenCapabilities.map((cap) => CAPABILITY_LABEL_MAP[cap]).join(", ");

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1">
        {visibleCapabilities.map((cap) => (
          <Badge
            key={cap}
            variant="outline"
            className={cn(
              "h-5 px-1.5 text-[9px] font-semibold tracking-tight border-border/60 bg-muted/30 text-muted-foreground",
              cap === "REMOTE" && item.remote.isOperational && "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
              cap === "AGENT" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
              cap === "ERP" && "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
            )}
            title={getTooltip(cap)}
          >
            {CAPABILITY_LABEL_MAP[cap]}
            {cap === "AGENT" && item.agentVersion ? ` ${item.agentVersion}` : ""}
            {cap === "ERP" && item.sysproUpdate?.sysproVersion ? ` ${item.sysproUpdate.sysproVersion}` : ""}
          </Badge>
        ))}

        {hiddenCapabilities.length > 0 && (
          <Badge
            variant="outline"
            className="h-5 cursor-help px-1.5 text-[9px] font-semibold tracking-tight border-border/60 bg-muted/50 text-muted-foreground"
            title={`Outras capacidades: ${overflowTooltip}`}
          >
            +{hiddenCapabilities.length}
          </Badge>
        )}
      </div>
    </div>
  );
}
