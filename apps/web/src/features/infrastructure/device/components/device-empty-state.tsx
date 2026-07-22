"use client";

import { MonitorOff, SearchX, X } from "lucide-react";
import type { DeviceLifecycleStatus } from "@dosc-syspro/contracts";
import { Button } from "@dosc-syspro/ui";

type DeviceEmptyStateProps = {
  hasSearchQuery: boolean;
  activeLifecycle: DeviceLifecycleStatus | "ALL";
  onClearSearch?: () => void;
};

export function DeviceEmptyState({
  hasSearchQuery,
  activeLifecycle,
  onClearSearch,
}: DeviceEmptyStateProps) {
  if (hasSearchQuery) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-card p-10 text-center shadow-xs">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
          <SearchX className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">Nenhum dispositivo encontrado</h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">
          Revise o nome, CNPJ, hostname, IP ou ID RustDesk informado.
        </p>
        {onClearSearch && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 h-8 gap-1.5 text-xs shadow-xs"
            onClick={onClearSearch}
          >
            <X className="h-3.5 w-3.5" />
            Limpar pesquisa
          </Button>
        )}
      </div>
    );
  }

  const lifecycleMessages: Record<string, { title: string; desc: string }> = {
    AWAITING_LINK: {
      title: "Nenhum dispositivo aguardando vínculo",
      desc: "Todas as máquinas descobertas foram vinculadas a uma empresa ou bloqueadas.",
    },
    DISCOVERED: {
      title: "Nenhum dispositivo descoberto",
      desc: "Não há registros de novas instalações aguardando autorização.",
    },
    ARCHIVED: {
      title: "Nenhum dispositivo arquivado",
      desc: "Nenhuma máquina desativada ou mantida em arquivo no momento.",
    },
    MANAGED: {
      title: "Nenhum dispositivo gerenciado",
      desc: "Cadastre um novo host ou vincule uma máquina descoberta para iniciar o gerenciamento.",
    },
  };

  const currentMsg = lifecycleMessages[activeLifecycle] ?? lifecycleMessages.MANAGED;

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-card p-10 text-center shadow-xs">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
        <MonitorOff className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{currentMsg.title}</h3>
      <p className="mt-1 text-xs text-muted-foreground max-w-sm">{currentMsg.desc}</p>
    </div>
  );
}
