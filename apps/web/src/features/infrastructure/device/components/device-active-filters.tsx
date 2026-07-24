"use client";

import { X } from "lucide-react";
import { Badge, Button } from "@dosc-syspro/ui";
import type {
  DeviceConnectivityStatus,
  DeviceHealthStatus,
} from "@dosc-syspro/contracts";

type DeviceActiveFiltersProps = {
  connectivity: DeviceConnectivityStatus | "ALL";
  health: DeviceHealthStatus | "ALL";
  companyId?: string;
  onRemoveConnectivity: () => void;
  onRemoveHealth: () => void;
  onRemoveCompany: () => void;
  onClearAll: () => void;
};

const CONNECTIVITY_LABELS: Record<string, string> = {
  ONLINE: "Online",
  STALE: "Atrasado",
  OFFLINE: "Offline",
  MISSING: "Sem comunicação",
};

const HEALTH_LABELS: Record<string, string> = {
  HEALTHY: "Saudável",
  WARNING: "Atenção",
  CRITICAL: "Crítico",
  UNEVALUATED: "Sem avaliação",
};

export function DeviceActiveFilters({
  connectivity,
  health,
  companyId,
  onRemoveConnectivity,
  onRemoveHealth,
  onRemoveCompany,
  onClearAll,
}: DeviceActiveFiltersProps) {
  const hasConnectivityFilter = connectivity !== "ALL";
  const hasHealthFilter = health !== "ALL";
  const hasCompanyFilter = Boolean(companyId);

  const hasAnyActiveFilter = hasConnectivityFilter || hasHealthFilter || hasCompanyFilter;

  if (!hasAnyActiveFilter) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs animate-in fade-in duration-200">
      <span className="text-muted-foreground mr-1 font-medium">Filtros ativos:</span>

      {hasConnectivityFilter && (
        <Badge
          variant="secondary"
          className="h-6 gap-1 border border-border/60 pl-2 pr-1 font-normal"
        >
          <span>{CONNECTIVITY_LABELS[connectivity] ?? connectivity}</span>
          <button
            type="button"
            onClick={onRemoveConnectivity}
            className="rounded-full p-0.5 hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground transition-colors"
            title="Remover filtro de conectividade"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {hasHealthFilter && (
        <Badge
          variant="secondary"
          className="h-6 gap-1 border border-border/60 pl-2 pr-1 font-normal"
        >
          <span>{HEALTH_LABELS[health] ?? health}</span>
          <button
            type="button"
            onClick={onRemoveHealth}
            className="rounded-full p-0.5 hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground transition-colors"
            title="Remover filtro de saúde"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {hasCompanyFilter && (
        <Badge
          variant="secondary"
          className="h-6 gap-1 border border-border/60 pl-2 pr-1 font-normal"
        >
          <span>Empresa selecionada</span>
          <button
            type="button"
            onClick={onRemoveCompany}
            className="rounded-full p-0.5 hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground transition-colors"
            title="Remover filtro de empresa"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={onClearAll}
      >
        Limpar filtros
      </Button>
    </div>
  );
}
