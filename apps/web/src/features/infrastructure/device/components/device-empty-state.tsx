"use client";

import { MonitorOff, SearchX } from "lucide-react";
import type { DeviceLifecycleStatus } from "@dosc-syspro/contracts";
import { EmptyState } from "@/components/patterns";

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
      <EmptyState
        icon={SearchX}
        dashed
        className="rounded-lg border-border/70 bg-card shadow-xs"
        title="Nenhum dispositivo encontrado"
        description="Revise o nome, CNPJ, hostname, IP ou ID RustDesk informado."
        action={
          onClearSearch
            ? {
                label: "Limpar pesquisa",
                onClick: onClearSearch,
              }
            : undefined
        }
      />
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
      desc: "Nenhum dispositivo desativado ou mantido em arquivo no momento.",
    },
    MANAGED: {
      title: "Nenhum dispositivo gerenciado",
      desc: "Cadastre um novo dispositivo ou vincule uma máquina descoberta para iniciar o gerenciamento.",
    },
  };

  const currentMsg = lifecycleMessages[activeLifecycle] ?? lifecycleMessages.MANAGED;

  return (
    <EmptyState
      icon={MonitorOff}
      dashed
      className="rounded-lg border-border/70 bg-card shadow-xs"
      title={currentMsg.title}
      description={currentMsg.desc}
    />
  );
}
