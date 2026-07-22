"use client";

import { Filter, RotateCcw, X } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Badge,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dosc-syspro/ui";
import type {
  DeviceConnectivityStatus,
  DeviceHealthStatus,
} from "@dosc-syspro/contracts";
import { cn } from "@/lib/utils";

type DeviceFilterPopoverProps = {
  connectivity: DeviceConnectivityStatus | "ALL";
  health: DeviceHealthStatus | "ALL";
  capabilities?: string[];
  activeFilterCount: number;
  onApplyFilters: (filters: {
    connectivity: DeviceConnectivityStatus | "ALL";
    health: DeviceHealthStatus | "ALL";
    capabilities?: string[];
  }) => void;
  onClearFilters: () => void;
};

const CONNECTIVITY_OPTIONS: Array<{ value: DeviceConnectivityStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "ONLINE", label: "Online" },
  { value: "STALE", label: "Atrasado" },
  { value: "OFFLINE", label: "Offline" },
];

const HEALTH_OPTIONS: Array<{ value: DeviceHealthStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "HEALTHY", label: "Saudável" },
  { value: "WARNING", label: "Atenção" },
  { value: "CRITICAL", label: "Crítico" },
  { value: "UNEVALUATED", label: "Sem avaliação" },
];

const CAPABILITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "AGENT", label: "Agente" },
  { value: "REMOTE", label: "Remoto" },
  { value: "ERP", label: "ERP" },
  { value: "BACKUP", label: "Backup" },
  { value: "TUNNEL", label: "Túnel" },
];

export function DeviceFilterPopover({
  connectivity: currentConnectivity,
  health: currentHealth,
  capabilities: currentCapabilities = [],
  activeFilterCount,
  onApplyFilters,
  onClearFilters,
}: DeviceFilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConnectivity, setSelectedConnectivity] = useState<DeviceConnectivityStatus | "ALL">(currentConnectivity);
  const [selectedHealth, setSelectedHealth] = useState<DeviceHealthStatus | "ALL">(currentHealth);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>(currentCapabilities);

  useEffect(() => {
    setSelectedConnectivity(currentConnectivity);
    setSelectedHealth(currentHealth);
    setSelectedCapabilities(currentCapabilities);
  }, [currentConnectivity, currentHealth, currentCapabilities, isOpen]);

  const toggleCapability = (cap: string) => {
    setSelectedCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((item) => item !== cap) : [...prev, cap],
    );
  };

  const handleApply = () => {
    onApplyFilters({
      connectivity: selectedConnectivity,
      health: selectedHealth,
      capabilities: selectedCapabilities,
    });
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedConnectivity("ALL");
    setSelectedHealth("ALL");
    setSelectedCapabilities([]);
    onClearFilters();
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-10 gap-2 border-border/60 font-medium transition-colors",
            activeFilterCount > 0 && "border-primary/50 bg-primary/5 text-primary",
          )}
        >
          <Filter className="h-4 w-4" />
          <span>Filtros</span>
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-0.5 h-5 min-w-[20px] rounded-full px-1.5 text-xs font-semibold"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[340px] sm:w-[400px] p-4 shadow-lg border-border/60"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <h4 className="font-semibold text-sm">Filtros avançados</h4>
            {activeFilterCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleClear}
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Limpar tudo
              </Button>
            )}
          </div>

          {/* Conectividade */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Conectividade
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CONNECTIVITY_OPTIONS.map((opt) => {
                const isSelected = selectedConnectivity === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedConnectivity(opt.value)}
                    className={cn(
                      "h-7 rounded-md px-2.5 text-xs font-medium transition-colors border",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Saúde */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Saúde do Dispositivo
            </label>
            <div className="flex flex-wrap gap-1.5">
              {HEALTH_OPTIONS.map((opt) => {
                const isSelected = selectedHealth === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedHealth(opt.value)}
                    className={cn(
                      "h-7 rounded-md px-2.5 text-xs font-medium transition-colors border",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Capacidades */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Capacidades
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CAPABILITY_OPTIONS.map((opt) => {
                const isSelected = selectedCapabilities.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleCapability(opt.value)}
                    className={cn(
                      "h-7 rounded-md px-2.5 text-xs font-medium transition-colors border",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setIsOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" size="sm" className="h-8 px-4" onClick={handleApply}>
              Aplicar filtros
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
