import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  XCircle,
} from "lucide-react";
import {
  formatDate,
  formatDateTimeSafe,
  formatRelativeDate,
  formatTimeShort as centralFormatTimeShort,
  differenceInDays,
} from "@/lib/date";

export function formatDateTime(value: string | null) {
  return formatDateTimeSafe(value, "Sem registro");
}

export function formatRelativeHeartbeat(value: string | null) {
  return formatRelativeDate(value, "Sem contato");
}

export function formatDateOnly(value: string | null) {
  return formatDate(value, "Sem registro");
}

export function getSysproUpdateHealthMeta(input: { isServerHost: boolean | null; lastFileWriteAt: string | null }) {
  if (input.isServerHost !== true) {
    return {
      label: "Não aplicável",
      detail: "Indicador aplicado somente ao servidor Syspro.",
      className: "border-border/60 bg-background/70 text-muted-foreground",
    };
  }

  if (!input.lastFileWriteAt) {
    return {
      label: "Sem leitura",
      detail: "Sem data de atualização recebida do agente.",
      className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    };
  }

  const days = Math.max(
     0,
     differenceInDays(new Date(), input.lastFileWriteAt),
  );

  if (days > 180) {
    return {
      label: "Crítico",
      detail: `${days} dias sem atualização.`,
      className: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
    };
  }

  if (days > 90) {
    return {
      label: "Atenção",
      detail: `${days} dias sem atualização.`,
      className: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    };
  }

  if (days <= 45) {
    return {
      label: "Atualizado",
      detail: `${days} dias desde a última atualização.`,
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  }

  return {
    label: "Monitorar",
    detail: `${days} dias desde a última atualização.`,
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
      label: "Serviço em execução",
      tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  }

  if (normalized === "restarted_by_agent") {
    return {
      label: "Serviço reiniciado pelo agente",
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    };
  }

  if (normalized === "not_found") {
    return {
      label: "Serviço remoto não encontrado",
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
  const res = centralFormatTimeShort(value);
  return res === "-" ? "Sem registro" : res;
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

export type SysproInstallationGroupView = {
  id: string;
  rootPath: string;
  classification: string | null;
  roles: string[];
  confidence: string | null;
  sharedDirectories: string[];
  discoveryEvidence: string[];
  clientInstances: Array<{ rootPath: string; status: string | null; evidence: string[] }>;
  serverInstances: SysproServerInstanceView[];
};

export type SysproServerInstanceView = {
  id: string;
  rootPath: string;
  executablePath: string | null;
  configurationPath: string | null;
  isapiDllPath: string | null;
  validationStatus: string | null;
  validationEvidence: string[];
  productVersion: string | null;
  fileVersion: string | null;
  versionSource: string | null;
  updatedAt: string | null;
  updateSource: string | null;
  updateConfidence: string | null;
  executableSizeMb: number | null;
  companyHints: Array<{ companyId: string | null; companyName: string | null; path: string | null }>;
  dataDirectories: Array<{ path: string; source: string | null; validated: boolean }>;
  execution: { processRunning: boolean | null; serviceStatus: string | null; pid: number | null };
};

function readRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object" && !Array.isArray(entry))
    : [];
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0) : [];
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function normalizeInstallationPath(value: string | null) {
  return value ? value.trim().replace(/[\\/]+/g, "/").toLowerCase() : "";
}

export function readSysproInstallationGroups(snapshot: Record<string, unknown> | null): SysproInstallationGroupView[] {
  const groups = readRecordArray(snapshot?.["installationGroups"]);
  return groups.map((group, index) => {
    const serverInstances = readRecordArray(group["serverInstances"]).map<SysproServerInstanceView>((server, serverIndex) => ({
      id: readString(server["id"]) ?? `server-${index}-${serverIndex}`,
      rootPath: readString(server["rootPath"]) ?? "Desconhecido",
      executablePath: readString(server["executablePath"]),
      configurationPath: readString(server["configurationPath"]),
      isapiDllPath: readString(server["isapiDllPath"]),
      validationStatus: readString((server["validation"] as Record<string, unknown> | null)?.["status"]),
      validationEvidence: readStringArray((server["validation"] as Record<string, unknown> | null)?.["evidence"]),
      productVersion: readString((server["version"] as Record<string, unknown> | null)?.["productVersion"]),
      fileVersion: readString((server["version"] as Record<string, unknown> | null)?.["fileVersion"]),
      versionSource: readString((server["version"] as Record<string, unknown> | null)?.["source"]),
      updatedAt: readString((server["update"] as Record<string, unknown> | null)?.["updatedAt"]),
      updateSource: readString((server["update"] as Record<string, unknown> | null)?.["source"]),
      updateConfidence: readString((server["update"] as Record<string, unknown> | null)?.["confidence"]),
      executableSizeMb: readNumber(server["executableSizeMb"]),
      companyHints: readRecordArray(server["companyHints"]).map((hint) => ({
        companyId: readString(hint["companyId"]),
        companyName: readString(hint["companyName"]),
        path: readString(hint["path"]),
      })),
      dataDirectories: readRecordArray(server["dataDirectories"]).map((directory) => ({
        path: readString(directory["path"]) ?? "Desconhecido",
        source: readString(directory["source"]),
        validated: directory["validated"] === true,
      })),
      execution: {
        processRunning: readBoolean((server["execution"] as Record<string, unknown> | null)?.["processRunning"]),
        serviceStatus: readString((server["execution"] as Record<string, unknown> | null)?.["serviceStatus"]),
        pid: readNumber((server["execution"] as Record<string, unknown> | null)?.["pid"]),
      },
    }));

    return {
      id: readString(group["id"]) ?? `group-${index}`,
      rootPath: readString(group["rootPath"]) ?? "Desconhecido",
      classification: readString(group["classification"]),
      roles: readStringArray(group["roles"]),
      confidence: readString(group["confidence"]),
      sharedDirectories: readStringArray(group["sharedDirectories"]),
      discoveryEvidence: readStringArray(group["discoveryEvidence"]),
      clientInstances: readRecordArray(group["clientInstances"]).map((client) => ({
        rootPath: readString(client["rootPath"]) ?? "Desconhecido",
        status: readString(client["status"]),
        evidence: readStringArray(client["evidence"]),
      })),
      serverInstances,
    };
  });
}

export function readSysproValidatedServers(snapshot: Record<string, unknown> | null): SysproServerInstanceView[] {
  return readSysproInstallationGroups(snapshot).flatMap((group) =>
    group.serverInstances.filter((server) => server.validationStatus === "VALIDATED"),
  );
}

export function resolveSysproServerForPath(
  snapshot: Record<string, unknown> | null,
  installationPath: string,
): SysproServerInstanceView | null {
  const targetPath = normalizeInstallationPath(installationPath);
  if (!targetPath) return null;

  const servers = readSysproValidatedServers(snapshot);
  return (
    servers.find((server) => normalizeInstallationPath(server.rootPath) === targetPath) ??
    servers.find((server) => normalizeInstallationPath(server.executablePath) === targetPath) ??
    servers.find((server) =>
      server.companyHints.some((hint) => normalizeInstallationPath(hint.path) === targetPath),
    ) ??
    null
  );
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
