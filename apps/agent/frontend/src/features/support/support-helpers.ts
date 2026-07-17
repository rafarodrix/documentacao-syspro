import type { AgentSetupViewModel, AgentSupportViewModel, RemoteCapabilityView } from "../../types/agent-ui";
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
      label: "Provisionando",
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
      label: "Atencao",
      detail: "Acesso remoto ainda em configuracao.",
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
  if (remote.status === "pending") return "Configurando";
  return "Indisponivel";
}

export function getRemoteOperationalHint(remote: RemoteCapabilityView | null): string {
  if (!remote) return "Aguardando instalacao do acesso remoto.";
  return formatSetupCopy(remote.statusText) || "Aguardando sincronizacao do acesso remoto.";
}

export function getRemoteActionLabel(remote: RemoteCapabilityView | null, remoteOpening: boolean): string {
  if (remoteOpening) return "Abrindo RustDesk...";
  if (remote?.ready) return "Abrir RustDesk";
  if (remote?.status === "pending") return "Acesso remoto em configuracao";
  return "Acesso remoto indisponivel";
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

export function buildOperationalStatusRows(
  setupView: AgentSetupViewModel,
  supportView: AgentSupportViewModel | null,
): Array<{ label: string; value: string; tone: "ok" | "warn" | "muted" }> {
  const remote = supportView?.capabilities.remote ?? null;

  return [
    {
      label: "Agente Trilink",
      value: setupView.complete ? "Operacional" : "Provisionando",
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
  ];
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
    issues.push("Sem confirmacao recente de comunicacao com o portal.");
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
