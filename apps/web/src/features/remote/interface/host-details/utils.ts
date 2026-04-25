import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  XCircle,
} from "lucide-react";

export function formatDateTime(value: string | null) {
  if (!value) return "Sem registro";
  return new Date(value).toLocaleString("pt-BR");
}

export function formatRelativeHeartbeat(value: string | null) {
  if (!value) return "Sem contato";

  const diffMinutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (diffMinutes < 1) return "Agora";
  if (diffMinutes < 60) return `${diffMinutes} min atras`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h atras`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d atras`;
}

export function formatDateOnly(value: string | null) {
  if (!value) return "Sem registro";
  return new Date(value).toLocaleDateString("pt-BR");
}

export function getSysproUpdateHealthMeta(input: { isServerHost: boolean | null; lastFileWriteAt: string | null }) {
  if (input.isServerHost !== true) {
    return {
      label: "Nao aplicavel",
      detail: "Indicador aplicado somente ao servidor Syspro.",
      className: "border-border/60 bg-background/70 text-muted-foreground",
    };
  }

  if (!input.lastFileWriteAt) {
    return {
      label: "Sem leitura",
      detail: "Sem data de atualizacao recebida do agente.",
      className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    };
  }

  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(input.lastFileWriteAt).getTime()) / (1000 * 60 * 60 * 24)),
  );

  if (days > 180) {
    return {
      label: "Critico",
      detail: `${days} dias sem atualizacao.`,
      className: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
    };
  }

  if (days > 90) {
    return {
      label: "Atencao",
      detail: `${days} dias sem atualizacao.`,
      className: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    };
  }

  if (days <= 45) {
    return {
      label: "Atualizado",
      detail: `${days} dias desde a ultima atualizacao.`,
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  }

  return {
    label: "Monitorar",
    detail: `${days} dias desde a ultima atualizacao.`,
    className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  };
}

export function getServiceStatusMeta(value: string | null) {
  if (!value) {
    return {
      label: "Sem leitura",
      tone: "border-border/60 bg-background/70 text-muted-foreground",
    };
  }

  const normalized = value.toLowerCase();
  if (normalized === "running") {
    return {
      label: "Servico em execucao",
      tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  }

  if (normalized === "restarted_by_agent") {
    return {
      label: "Servico reiniciado pelo agente",
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    };
  }

  if (normalized === "not_found") {
    return {
      label: "Servico remoto nao encontrado",
      tone: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
    };
  }

  return {
    label: value,
    tone: "border-border/60 bg-background/70 text-foreground",
  };
}

export function getServiceStatusIconMeta(value: string | null) {
  if (!value) {
    return {
      Icon: CircleHelp,
      tone: "text-muted-foreground",
      label: "Sem leitura",
    };
  }

  const normalized = value.toLowerCase();
  if (normalized === "running") {
    return {
      Icon: CheckCircle2,
      tone: "text-emerald-600 dark:text-emerald-400",
      label: "Running",
    };
  }

  if (normalized === "restarted_by_agent") {
    return {
      Icon: AlertTriangle,
      tone: "text-amber-600 dark:text-amber-400",
      label: "Recovered",
    };
  }

  if (normalized === "not_found") {
    return {
      Icon: XCircle,
      tone: "text-red-600 dark:text-red-400",
      label: "Not found",
    };
  }

  return {
    Icon: CircleHelp,
    tone: "text-foreground",
    label: value,
  };
}

export function getAutoHealStatusIconMeta(value: string | null) {
  if (!value) {
    return {
      Icon: CircleHelp,
      tone: "text-muted-foreground",
      label: "Sem leitura",
    };
  }

  if (value === "ACKNOWLEDGED") {
    return {
      Icon: AlertTriangle,
      tone: "text-amber-600 dark:text-amber-400",
      label: "Recovered",
    };
  }

  if (value === "FAILED") {
    return {
      Icon: XCircle,
      tone: "text-red-600 dark:text-red-400",
      label: "Falhou",
    };
  }

  if (value === "PENDING" || value === "DELIVERED") {
    return {
      Icon: CircleHelp,
      tone: "text-foreground",
      label: "Em andamento",
    };
  }

  return {
    Icon: CircleHelp,
    tone: "text-muted-foreground",
    label: value,
  };
}

export function getCommandStatusMeta(command: {
  status: "PENDING" | "DELIVERED" | "ACKNOWLEDGED" | "CANCELLED" | "FAILED";
  executedAt: string | null;
  resultPayload: Record<string, unknown> | null;
}) {
  const payloadExecuted = command.resultPayload?.executed === true;
  const isCompletedAck = command.status === "ACKNOWLEDGED" && (payloadExecuted || Boolean(command.executedAt));

  if (isCompletedAck) {
    return {
      label: "Concluido",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  }

  if (command.status === "ACKNOWLEDGED") {
    return {
      label: "Acknowledged",
      className: "border-border/60 bg-background/70 text-foreground",
    };
  }

  if (command.status === "PENDING" || command.status === "DELIVERED") {
    return {
      label: command.status,
      className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    };
  }

  if (command.status === "FAILED") {
    return {
      label: "Falhou",
      className: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
    };
  }

  return {
    label: command.status,
    className: "border-border/60 bg-background/70 text-foreground",
  };
}

export function formatHourMinute(value: string | null) {
  if (!value) return "Sem registro";
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function extractStringFromPayload(
  payload: Record<string, unknown> | null,
  preferredKeys: string[]
) {
  if (!payload) return null;

  const normalizedPreferredKeys = new Set(preferredKeys.map((key) => key.toLowerCase()));
  const queue: unknown[] = [payload];
  const visited = new Set<object>();

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (visited.has(current as object)) continue;
    visited.add(current as object);

    for (const [key, value] of Object.entries(current as Record<string, unknown>)) {
      if (
        normalizedPreferredKeys.has(key.toLowerCase()) &&
        typeof value === "string" &&
        value.trim()
      ) {
        return value.trim();
      }
    }

    for (const value of Object.values(current as Record<string, unknown>)) {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return null;
}

export function readBootstrapRateMetrics(agentMetrics: Record<string, unknown> | null) {
  const raw = agentMetrics?.["bootstrapRate24h"];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ratePct: null as number | null, cycles: null as number | null, bootstrapCycles: null as number | null };
  }
  const payload = raw as Record<string, unknown>;
  const rate = typeof payload.bootstrapRatePct === "number" ? payload.bootstrapRatePct : null;
  const cycles = typeof payload.cycles === "number" ? payload.cycles : null;
  const bootstrapCycles = typeof payload.bootstrapCycles === "number" ? payload.bootstrapCycles : null;
  return { ratePct: rate, cycles, bootstrapCycles };
}

export function readContractSchemaVersions(agentMetrics: Record<string, unknown> | null) {
  const raw = agentMetrics?.["schemaVersions"];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { discover: null as string | null, sync: null as string | null, ack: null as string | null };
  }
  const payload = raw as Record<string, unknown>;
  const discover = typeof payload.discover === "string" ? payload.discover : null;
  const sync = typeof payload.sync === "string" ? payload.sync : null;
  const ack = typeof payload.ack === "string" ? payload.ack : null;
  return { discover, sync, ack };
}

export function extractContractValidationError(value: string | null) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  const looksLikeValidationError =
    normalized.includes("schema") ||
    normalized.includes("payload") ||
    normalized.includes("obrigatorio") ||
    normalized.includes("required") ||
    normalized.includes("invalido");
  return looksLikeValidationError ? value : null;
}

export async function copyTextWithFallback(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {}
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, value.length);

  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("copy_failed");
  }
}

export function resolveExpectedRustDeskAlias(input: {
  hostName: string;
  machineName: string | null;
  companyName: string | null;
}) {
  const machineName = input.machineName?.trim();
  if (machineName) return machineName;
  if (input.companyName?.trim()) return `${input.companyName.trim()} | ${input.hostName}`;
  return input.hostName;
}
