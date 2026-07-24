import type {
  AgentSetupViewModel,
  AgentSupportViewModel,
  OpenRemoteAccessResultView,
  RemoteCapabilityView,
} from "../../types/agent-ui";
import { formatRustDeskId, formatSetupCopy } from "../setup/setup-helpers";

export type SupportBannerTone = "complete" | "running" | "idle" | "error";

export type SupportBannerState = {
  tone: SupportBannerTone;
  label: string;
  detail: string;
};

export type OperationalHealthSummary = {
  tone: "ok" | "warn" | "muted";
  summary: string;
  issues: string[];
};

export function resolveSupportBannerState(
  setupView: AgentSetupViewModel,
  supportView: AgentSupportViewModel | null,
): SupportBannerState {
  if (!setupView.complete) {
    if (setupView.lastError) {
      return {
        tone: "error",
        label: "Erro",
        detail: "Provisionamento interrompido.",
      };
    }

    return {
      tone: setupView.progressPct > 0 ? "running" : "idle",
      label: "Configurando",
      detail: "Configuracao do agente em andamento.",
    };
  }

  const remote = supportView?.capabilities.remote ?? null;
  if (remote?.lastSyncAt) {
    return {
      tone: "complete",
      label: "Online",
      detail: `Conectado ao portal${formatRelativeTime(remote.lastSyncAt) ? ` ${formatRelativeTime(remote.lastSyncAt)}` : ""}.`,
    };
  }

  if (remote?.status === "pending") {
    return {
      tone: "running",
      label: "Aguardando vinculo",
      detail: "Instalacao tecnica concluida. Falta apenas concluir o vinculo no portal.",
    };
  }

  return {
    tone: "idle",
    label: "Offline",
    detail: "Sem confirmacao recente de comunicacao com o portal.",
  };
}

export function formatRelativeTime(value?: string | null): string {
  const iso = value?.trim();
  if (!iso) return "";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "agora";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 10) return "agora";
  if (seconds < 60) return `ha ${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `ha ${minutes}min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `ha ${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `ha ${days}d`;

  return date.toLocaleDateString("pt-BR");
}

export function getRemoteOperationalLabel(remote: RemoteCapabilityView | null): string {
  if (!remote) return "Nao instalado";
  if (remote.status === "ready") return "Operacional";
  if (remote.status === "pending") return remote.externalId ? "Pronto para vinculo" : "Configurando";
  return "Indisponivel";
}

export function getRemoteOperationalHint(remote: RemoteCapabilityView | null): string {
  if (!remote) return "Aguardando instalacao do acesso remoto.";
  return formatSetupCopy(remote.statusText) || "Aguardando sincronizacao do acesso remoto.";
}

export function getRemoteActionLabel(
  remote: RemoteCapabilityView | null,
  remoteOpening: boolean,
  remoteResult?: OpenRemoteAccessResultView | null,
): string {
  if (remoteOpening) return "Abrindo suporte remoto...";
  if (remoteResult?.needsRepair) return "Reparar acesso remoto";
  if (remote?.ready) return "Suporte remoto";
  if (remote?.status === "pending") return remote.externalId ? "Abrir suporte remoto" : "Suporte remoto em configuracao";
  return "Suporte remoto indisponivel";
}

export function formatRemoteId(remoteId: string | null | undefined): string {
  if (!remoteId) return "Aguardando vinculacao";
  return formatRustDeskId(remoteId);
}

export function truncateIdentifier(value?: string | null): string {
  const raw = value?.trim();
  if (!raw) return "-";
  if (raw.length <= 18) return raw;
  return `${raw.slice(0, 8)}...${raw.slice(-6)}`;
}

export function formatAgentVersion(value?: string | null): string {
  const raw = value?.trim();
  if (!raw) return "-";

  const versionMatch = raw.match(/^v?(\d+\.\d+(?:\.\d+)?)$/i);
  if (versionMatch) {
    return versionMatch[1];
  }

  const legacyBuildMatch = raw.match(/go-agent-v(\d+)/i);
  if (legacyBuildMatch) {
    return `${legacyBuildMatch[1]}.0.0`;
  }

  return raw;
}

export function buildOperationalStatusRows(
  setupView: AgentSetupViewModel,
  supportView: AgentSupportViewModel | null,
): Array<{ label: string; value: string; tone: "ok" | "warn" | "muted" }> {
  const remote = supportView?.capabilities.remote ?? null;

  return [
    {
      label: "Agente Trilink",
      value: setupView.complete ? "Operacional" : "Configurando",
      tone: setupView.complete ? "ok" : "warn",
    },
    {
      label: "Portal Trilink",
      value: remote?.lastSyncAt ? "Conectado" : "Sem dados",
      tone: remote?.lastSyncAt ? "ok" : "warn",
    },
    {
      label: "RustDesk",
      value: getRemoteOperationalLabel(remote),
      tone: remote?.status === "ready" ? "ok" : remote?.status === "pending" ? "warn" : "muted",
    },
    {
      label: "Perfil de coleta",
      value: formatCollectionProfile(supportView?.monitoring?.collectionProfile),
      tone: supportView?.monitoring?.collectionProfile ? "ok" : "muted",
    },
    {
      label: "Inventario / metricas",
      value: [
        supportView?.monitoring?.collectInventory ? "inventario" : null,
        supportView?.monitoring?.collectMetrics ? "metricas" : null,
      ]
        .filter(Boolean)
        .join(" + ") || "Desligado",
      tone: supportView?.monitoring?.collectInventory || supportView?.monitoring?.collectMetrics ? "ok" : "muted",
    },
  ];
}

export function formatCollectionProfile(profile?: string | null): string {
  switch ((profile ?? "").trim()) {
    case "server_syspro":
      return "Servidor Syspro";
    case "workstation":
      return "Estacao";
    case "terminal":
      return "Terminal";
    case "backup_node":
      return "No de backup";
    case "unlinked":
      return "Nao vinculado";
    default:
      return profile?.trim() || "Nao informado";
  }
}

export function summarizeOperationalHealth(
  setupView: AgentSetupViewModel,
  supportView: AgentSupportViewModel | null,
): OperationalHealthSummary {
  const remote = supportView?.capabilities.remote ?? null;
  const issues: string[] = [];

  if (!setupView.complete) {
    issues.push("Provisionamento incompleto.");
  }

  if (!remote?.lastSyncAt) {
    issues.push(remote?.externalId ? "Instalacao concluida; aguardando vinculo empresarial para sincronizacao autenticada." : "Sem confirmacao recente de comunicacao com o portal.");
  }

  if (!remote?.ready) {
    issues.push(getRemoteOperationalHint(remote));
  }

  if (issues.length === 0) {
    return {
      tone: "ok",
      summary: "Todos os servicos operacionais",
      issues: [],
    };
  }

  if (issues.length === 1) {
    return {
      tone: "warn",
      summary: issues[0],
      issues,
    };
  }

  return {
    tone: "warn",
    summary: `${issues.length} itens requerem atencao`,
    issues,
  };
}
