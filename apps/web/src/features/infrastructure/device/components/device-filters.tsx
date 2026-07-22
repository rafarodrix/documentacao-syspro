"use client";

import { Filter, X } from "lucide-react";
import type {
  DeviceConnectivityStatus,
  DeviceHealthStatus,
  DeviceLifecycleStatus,
} from "@dosc-syspro/contracts";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@dosc-syspro/ui";

type DeviceFiltersProps = {
  connectivity: DeviceConnectivityStatus | "ALL";
  health: DeviceHealthStatus | "ALL";
  onConnectivityChange: (val: DeviceConnectivityStatus | "ALL") => void;
  onHealthChange: (val: DeviceHealthStatus | "ALL") => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
};

export function DeviceFilters({
  connectivity,
  health,
  onConnectivityChange,
  onHealthChange,
  onResetFilters,
  hasActiveFilters,
}: DeviceFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={connectivity}
        onValueChange={(val) => onConnectivityChange(val as DeviceConnectivityStatus | "ALL")}
      >
        <SelectTrigger className="h-9 w-40 bg-background text-xs font-medium">
          <SelectValue placeholder="Conectividade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todas conectividades</SelectItem>
          <SelectItem value="ONLINE">● Online</SelectItem>
          <SelectItem value="STALE">● Atrasado</SelectItem>
          <SelectItem value="OFFLINE">● Offline</SelectItem>
          <SelectItem value="MISSING">● Sem comunicação</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={health}
        onValueChange={(val) => onHealthChange(val as DeviceHealthStatus | "ALL")}
      >
        <SelectTrigger className="h-9 w-36 bg-background text-xs font-medium">
          <SelectValue placeholder="Saúde" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todas saúdes</SelectItem>
          <SelectItem value="HEALTHY">Saudável</SelectItem>
          <SelectItem value="WARNING">Atenção</SelectItem>
          <SelectItem value="CRITICAL">Crítico</SelectItem>
          <SelectItem value="UNEVALUATED">Sem avaliação</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground"
          onClick={onResetFilters}
        >
          <X className="mr-1.5 h-3.5 w-3.5" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
