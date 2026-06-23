import { prisma } from "@dosc-syspro/database";
import { hashRustDeskPublicKey } from "@dosc-syspro/remote-infra/rustdesk-helpers";
import { normalizeSearchText } from "@dosc-syspro/shared";
import type { RemoteTenantScope } from "./remote-admin.types";
import { getRemoteModuleSettingsSnapshot } from "../../../common/system-settings/remote-module-settings-snapshot";
import { resolveRemoteOperationalStatus } from "./operational-status";
import { buildRemoteScopedWhere, buildScopedCompanyWhere } from "./scope";
import type {
  RemoteConfiguredHostItem,
  RemoteDiscoveredAgentItem,
  RemoteHostDetails,
  RemotePlatformDirectory,
  RemotePlatformOverview,
  RemoteAgentInstallStage,
  RemoteAgentLifecycleStatus,
  RemoteProductStatus,
} from "./remote-admin.types";
import { Prisma } from "@prisma/client";

type RemoteConnectionItem = {
  type: "DDNS_NOIP" | "RADMIN_VPN";
  details: string;
};

function mapHostDescription(input: {
  description: string | null;
  environment: string | null;
  provider: string | null;
  rustdeskId: string | null;
  machineName: string | null;
  agentVersion: string | null;
}) {
  return [
    input.description ? input.description : null,
    input.environment ? `Ambiente: ${input.environment}` : null,
    input.provider ? `Provider: ${input.provider}` : null,
    input.rustdeskId ? `RustDesk ID: ${input.rustdeskId}` : null,
    input.machineName ? `Maquina: ${input.machineName}` : null,
    input.agentVersion ? `Agente: ${input.agentVersion}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

function resolveAgentLifecycleStatus(input: {
  rustdeskId: string | null;
  lastHeartbeatAt: Date | null;
}): RemoteAgentLifecycleStatus {
  if (!input.rustdeskId) {
    return "PENDING_INSTALL";
  }

  if (!input.lastHeartbeatAt) {
    return "INSTALLED";
  }

  const diffMinutes = Math.floor((Date.now() - input.lastHeartbeatAt.getTime()) / 60000);
  if (diffMinutes <= 5) return "ONLINE";
  if (diffMinutes <= 60) return "STALE";
  return "UNLINKED";
}

function buildInstallStages(input: {
  rustdeskId: string | null;
  lastHeartbeatAt: Date | null;
}): RemoteAgentInstallStage[] {
  const stages: RemoteAgentInstallStage[] = [];

  if (input.rustdeskId) stages.push("RUSTDESK_LINKED");
  if (input.lastHeartbeatAt) stages.push("HEARTBEAT_OK");

  return stages;
}

function toIsoDate(value: Date | null | undefined) {
  return value instanceof Date ? value.toISOString() : null;
}

function buildRemoteModuleSettingsView(moduleSettings: Awaited<ReturnType<typeof getRemoteModuleSettingsSnapshot>>) {
  return {
    rustDeskServerHost: moduleSettings.rustDeskServerHost,
    rustDeskServerConfig: moduleSettings.rustDeskServerConfig,
    rustDeskPublicKey: moduleSettings.rustDeskPublicKey,
    rustDeskPublicKeyHash: moduleSettings.rustDeskPublicKey.trim()
      ? hashRustDeskPublicKey(moduleSettings.rustDeskPublicKey)
      : null,
    rustDeskVersion: moduleSettings.rustDeskVersion,
    defaultPassword: moduleSettings.defaultPassword,
    rustDeskAutoInstall: moduleSettings.rustDeskAutoInstall,
    rustDeskAutoUpgrade: moduleSettings.rustDeskAutoUpgrade,
    rustDeskInstallerUrl: moduleSettings.rustDeskInstallerUrl,
    rustDeskInstallerSha256: moduleSettings.rustDeskInstallerSha256,
    rustDeskInstallerPackageType: moduleSettings.rustDeskInstallerPackageType,
    rustDeskInstallArgs: moduleSettings.rustDeskInstallArgs,
    rustDeskRestartServiceAfterApply: moduleSettings.rustDeskRestartServiceAfterApply,
    rustDeskSuppressTrayShortcuts: moduleSettings.rustDeskSuppressTrayShortcuts,
    rustDeskHideTray: moduleSettings.rustDeskHideTray,
    rustDeskHideStopService: moduleSettings.rustDeskHideStopService,
    rustDeskAllowRemoteConfigModification: moduleSettings.rustDeskAllowRemoteConfigModification,
    rustDeskAllowD3DRender: moduleSettings.rustDeskAllowD3DRender,
    rustDeskEnableDirectXCapture: moduleSettings.rustDeskEnableDirectXCapture,
  };
}

function buildAgentProjection(input: {
  rustdeskId: string | null;
  machineName: string | null;
  agentVersion: string | null;
  lastHeartbeatAt: Date | null;
  lastHeartbeatSuccessAt?: Date | null;
  lastHeartbeatErrorAt?: Date | null;
  lastHeartbeatErrorMessage?: string | null;
  lastKnownIp?: string | null;
  lastRegisterAt?: Date | null;
  lastRegisterSource?: string | null;
  agentTokenIssuedAt?: Date | null;
  agentTokenLastUsedAt?: Date | null;
  lastKnownRustDeskAlias?: string | null;
  lastKnownRustDeskVersion?: string | null;
  lastKnownRustDeskServerHost?: string | null;
  lastKnownRustDeskApiHost?: string | null;
  lastKnownRustDeskPublicKeyHash?: string | null;
  lastRustDeskConfigSyncAt?: Date | null;
  lifecycleStatus: RemoteAgentLifecycleStatus;
  installStages: RemoteAgentInstallStage[];
}): RemoteConfiguredHostItem["agent"] {
  return {
    rustdeskId: input.rustdeskId,
    machineName: input.machineName,
    agentVersion: input.agentVersion,
    lastHeartbeatAt: toIsoDate(input.lastHeartbeatAt),
    lastHeartbeatSuccessAt: toIsoDate(input.lastHeartbeatSuccessAt),
    lastHeartbeatErrorAt: toIsoDate(input.lastHeartbeatErrorAt),
    lastHeartbeatErrorMessage: input.lastHeartbeatErrorMessage ?? null,
    lastKnownIp: input.lastKnownIp ?? null,
    lastRegisterAt: toIsoDate(input.lastRegisterAt),
    lastRegisterSource: input.lastRegisterSource ?? null,
    agentTokenIssuedAt: toIsoDate(input.agentTokenIssuedAt),
    agentTokenLastUsedAt: toIsoDate(input.agentTokenLastUsedAt),
    lastKnownRustDeskAlias: input.lastKnownRustDeskAlias ?? null,
    lastKnownRustDeskVersion: input.lastKnownRustDeskVersion ?? null,
    lastKnownRustDeskServerHost: input.lastKnownRustDeskServerHost ?? null,
    lastKnownRustDeskApiHost: input.lastKnownRustDeskApiHost ?? null,
    lastKnownRustDeskPublicKeyHash: input.lastKnownRustDeskPublicKeyHash ?? null,
    lastRustDeskConfigSyncAt: toIsoDate(input.lastRustDeskConfigSyncAt),
    lifecycleStatus: input.lifecycleStatus,
    installStages: input.installStages,
  };
}

function resolveRemoteProductStatus(input: {
  bootstrapFlow: RemoteConfiguredHostItem["bootstrapFlow"];
  lifecycleStatus: RemoteAgentLifecycleStatus;
  operationalStatus: RemoteConfiguredHostItem["operationalStatus"];
  contractErrorCode: string | null;
}): RemoteProductStatus {
  if (input.operationalStatus === "SESSION_BUSY") return "IN_SERVICE";
  if (input.bootstrapFlow === "pending_link") return "AWAITING_LINK";

  if (
    input.bootstrapFlow === "token_invalid" ||
    input.bootstrapFlow === "body_parse_failed" ||
    input.operationalStatus === "OFFLINE" ||
    !!input.contractErrorCode
  ) {
    return "ATTENTION_REQUIRED";
  }

  if (
    input.lifecycleStatus === "PENDING_INSTALL" ||
    input.bootstrapFlow === "host_bootstrap_required" ||
    input.bootstrapFlow === "linked_host_detected" ||
    input.operationalStatus === "MISCONFIGURED"
  ) {
    return "PROVISIONING_REMOTE";
  }

  if (input.operationalStatus === "ONLINE") return "REMOTE_READY";

  return "ATTENTION_REQUIRED";
}

function mapDirectoryItem(host: any): RemoteConfiguredHostItem {
  const companyName = host.company.nomeFantasia ?? host.company.razaoSocial;
  const bootstrapFlowFromMetrics = readBootstrapFlowFromMetrics(host.lastAgentMetrics);
  const bootstrapFlow: RemoteConfiguredHostItem["bootstrapFlow"] =
    bootstrapFlowFromMetrics ??
    (() => {
      if (!host.agentExternalId) return "host_bootstrap_required";
      const lastHeartbeatError = (host.lastHeartbeatErrorMessage ?? "").toLowerCase();
      if (/agenttoken (invalido|expirado|rotacionado|indisponivel)/.test(lastHeartbeatError)) {
        return "token_invalid";
      }
      return "linked_host_detected";
    })();
  const contractErrorCode = readContractErrorCodeFromMetrics(host.lastAgentMetrics);
  const bootstrapRate24hPct = readBootstrapRatePctFromMetrics(host.lastAgentMetrics);
  const pendingAckQueueSize = readPendingAckQueueSizeFromMetrics(host.lastAgentMetrics);
  const ackQueueFlushFailed = readAckQueueFlushFailedFromMetrics(host.lastAgentMetrics);
  const openSessionCount = host.sessions.filter((session: any) => session.status === "REQUESTED" || session.status === "STARTED").length;
  const lastSessionAt = host.sessions[0]?.createdAt.toISOString() ?? null;
  const lastSessionStatus = (host.sessions[0]?.status as RemoteConfiguredHostItem["lastSessionStatus"]) ?? null;
  const lastTicketNumber = host.sessions[0]?.ticketNumber ?? null;
  const description =
    host.description ??
    mapHostDescription({
      description: null,
      environment: host.environment,
      provider: host.provider,
      rustdeskId: host.agentExternalId,
      machineName: host.machineName,
      agentVersion: host.agentVersion,
    });
  const lifecycleStatus = resolveAgentLifecycleStatus({
    rustdeskId: host.agentExternalId,
    lastHeartbeatAt: host.lastHeartbeatAt,
  });
  const installStages = buildInstallStages({
    rustdeskId: host.agentExternalId,
    lastHeartbeatAt: host.lastHeartbeatAt,
  });
  const windowsUpdateStatus = toRecord(host.lastWindowsUpdateStatus);
  const diskSnapshot = toRecordArray(host.lastDiskSnapshot);
  const sysproProcessSnapshot = toRecordArray(host.lastSysproProcessSnapshot);
  const rebootPendingFromWindows = readBooleanRecordValue(windowsUpdateStatus, "rebootRequired");
  const rebootPending = typeof host.lastRebootPending === "boolean" ? host.lastRebootPending : rebootPendingFromWindows;
  const windowsPendingCount = readNumberRecordValue(windowsUpdateStatus, "pendingCount");
  const diskLow = diskSnapshot.some((entry) => {
    const freePercent = readNumberRecordValue(entry, "freePercent");
    const freeGb = readNumberRecordValue(entry, "freeGb");
    const freeMb = readNumberRecordValue(entry, "freeMb");
    const totalMb = readNumberRecordValue(entry, "totalMb");
    const usedPct = readNumberRecordValue(entry, "usedPct");
    if (typeof freePercent === "number" && freePercent <= 10) return true;
    if (typeof freeGb === "number" && freeGb <= 5) return true;
    if (typeof freeMb === "number" && freeMb <= 5 * 1024) return true;
    if (typeof totalMb === "number" && totalMb > 0 && typeof freeMb === "number" && freeMb / totalMb <= 0.1) return true;
    if (typeof usedPct === "number" && usedPct >= 90) return true;
    return false;
  });
  const sysproProcessDown = sysproProcessSnapshot.some((entry) => {
    const running = readBooleanRecordValue(entry, "running");
    if (running === false) return true;
    const status = typeof entry.status === "string" ? entry.status.trim().toLowerCase() : "";
    return !!status && status !== "running";
  });
  const extendedSnapshotDates = [host.lastHardwareIdentityAt, host.lastDiskSnapshotAt, host.lastSysproProcessSnapshotAt, host.lastWindowsUpdateStatusAt, host.lastRebootPendingAt].filter((value): value is Date => value instanceof Date);
  const lastExtendedSnapshotAt = extendedSnapshotDates.length
    ? new Date(Math.max(...extendedSnapshotDates.map((value) => (value instanceof Date ? value.getTime() : 0)))).toISOString()
    : null;
  const operationalStatus = resolveRemoteOperationalStatus({
    rustdeskId: host.agentExternalId,
    lastHeartbeatAt: host.lastHeartbeatAt,
    openSessionCount,
  });
  const productStatus = resolveRemoteProductStatus({
    bootstrapFlow,
    lifecycleStatus,
    operationalStatus,
    contractErrorCode,
  });
  const agent = buildAgentProjection({
    rustdeskId: host.agentExternalId,
    machineName: host.machineName,
    agentVersion: host.agentVersion,
    lastHeartbeatAt: host.lastHeartbeatAt,
    lastHeartbeatSuccessAt: host.lastHeartbeatSuccessAt,
    lastHeartbeatErrorAt: host.lastHeartbeatErrorAt,
    lastHeartbeatErrorMessage: host.lastHeartbeatErrorMessage,
    lastKnownIp: host.lastKnownIp,
    lastRegisterAt: host.lastRegisterAt,
    lastRegisterSource: host.lastRegisterSource,
    agentTokenIssuedAt: host.agentTokenIssuedAt,
    agentTokenLastUsedAt: host.agentTokenLastUsedAt,
    lastKnownRustDeskAlias: host.lastKnownRustDeskAlias,
    lastKnownRustDeskVersion: host.lastKnownRustDeskVersion,
    lastKnownRustDeskServerHost: host.lastKnownRustDeskServerHost,
    lastKnownRustDeskApiHost: host.lastKnownRustDeskApiHost,
    lastKnownRustDeskPublicKeyHash: host.lastKnownRustDeskPublicKeyHash,
    lastRustDeskConfigSyncAt: host.lastRustDeskConfigSyncAt,
    lifecycleStatus,
    installStages,
  });

  return {
    id: host.id,
    companyId: host.companyId,
    companyName,
    installationCompanies: host.installationCompanies ?? [],
    name: host.name,
    machineProfile: (host.machineProfile ?? null) as RemoteConfiguredHostItem["machineProfile"],
    environment: host.environment,
    provider: host.provider,
    status: host.status,
    description,
    notes: host.notes,
    serviceStatus: host.serviceStatus ?? null,
    bootstrapFlow,
    contractErrorCode,
    bootstrapRate24hPct,
    pendingAckQueueSize,
    ackQueueFlushFailed,
    lastAgentMetrics: normalizeLastAgentMetrics(host.lastAgentMetrics),
    lastAgentMetricsAt: toIsoDate(host.lastAgentMetricsAt),
    openSessionCount,
    operationalStatus,
    productStatus,
    lastSessionAt,
    lastSessionStatus,
    lastTicketNumber,
      inventorySignals: {
        rebootPending,
        diskLow,
        sysproProcessDown,
        windowsPendingCount,
        lastExtendedSnapshotAt,
      },
      agent,
    };
}

function buildInstallGuide(item: RemoteConfiguredHostItem) {
  return [
    {
      id: "RUSTDESK_LINKED" as const,
      title: "RustDesk ID vinculado",
      description: "A maquina precisa devolver RustDesk ID valido para o host ficar pronto para acesso.",
      done: item.agent.installStages.includes("RUSTDESK_LINKED"),
    },
    {
      id: "HEARTBEAT_OK" as const,
      title: "Heartbeat confirmado",
      description: "Depois do registro inicial, o agente precisa voltar ao portal com heartbeat recorrente.",
      done: item.agent.installStages.includes("HEARTBEAT_OK"),
    },
  ];
}

function resolveCommandDurationSeconds(input: {
  createdAt: Date;
  executedAt: Date | null;
  failedAt: Date | null;
}) {
  const endAt = input.failedAt ?? input.executedAt;
  if (!endAt) return null;
  const diffMs = endAt.getTime() - input.createdAt.getTime();
  return diffMs >= 0 ? Math.floor(diffMs / 1000) : 0;
}

function resolveSuccessRate(
  rows: Array<{ status: "PENDING" | "DELIVERED" | "ACKNOWLEDGED" | "CANCELLED" | "FAILED"; updatedAt: Date }>,
  since: Date
) {
  const success = rows.filter((row) => row.updatedAt >= since && row.status === "ACKNOWLEDGED").length;
  const failed = rows.filter((row) => row.updatedAt >= since && row.status === "FAILED").length;
  const total = success + failed;
  if (!total) return 0;
  return Math.round((success / total) * 100);
}

function mapCompanyRemoteConnections(input: {
  remoteConnections?: unknown;
  remoteConnectionType?: unknown;
  remoteConnectionDetails?: unknown;
}): RemoteConnectionItem[] {
  if (Array.isArray(input.remoteConnections)) {
    return input.remoteConnections
      .filter(
        (entry): entry is { type: "DDNS_NOIP" | "RADMIN_VPN"; details?: string } =>
          !!entry &&
          typeof entry === "object" &&
          "type" in entry &&
          (((entry as { type?: string }).type ?? "") === "DDNS_NOIP" ||
            ((entry as { type?: string }).type ?? "") === "RADMIN_VPN")
      )
      .map((entry) => ({
        type: entry.type,
        details: entry.details ?? "",
      }));
  }

  if (input.remoteConnectionType === "DDNS_NOIP" || input.remoteConnectionType === "RADMIN_VPN") {
    return [
      {
        type: input.remoteConnectionType as RemoteConnectionItem["type"],
        details: typeof input.remoteConnectionDetails === "string" ? input.remoteConnectionDetails : "",
      },
    ];
  }

  return [];
}

function buildCompanyOptionLabel(input: { nomeFantasia: string | null; razaoSocial: string }) {
  const nomeFantasia = input.nomeFantasia?.trim() ?? "";
  const razaoSocial = input.razaoSocial.trim();

  if (!nomeFantasia) return razaoSocial;
  if (normalizeSearchText(nomeFantasia) === normalizeSearchText(razaoSocial)) return nomeFantasia;

  return `${nomeFantasia} | ${razaoSocial}`;
}

function buildCompanyOptionSearchText(input: { nomeFantasia: string | null; razaoSocial: string }) {
  return [input.nomeFantasia?.trim() ?? "", input.razaoSocial.trim()]
    .filter((entry) => !!entry)
    .join(" ");
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  const list: Array<Record<string, unknown>> = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    list.push(entry as Record<string, unknown>);
    if (list.length >= 200) break;
  }
  return list;
}

function readBooleanRecordValue(record: Record<string, unknown> | null, key: string): boolean | null {
  if (!record) return null;
  const value = record[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "sim") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "nao") return false;
  }
  return null;
}

function readNumberRecordValue(record: Record<string, unknown> | null, key: string): number | null {
  if (!record) return null;
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeLastAgentMetrics(metrics: unknown) {
  const record = toRecord(metrics);
  if (!record) return null;

  return {
    cpuLoad: readNumberRecordValue(record, "cpuLoadPct") ?? readNumberRecordValue(record, "cpuLoad"),
    ramUsedPc: readNumberRecordValue(record, "memoryUsedPct") ?? readNumberRecordValue(record, "ramUsedPc"),
    diskFree: readNumberRecordValue(record, "diskFree"),
    diskTotal: readNumberRecordValue(record, "diskTotal"),
    osInfo: typeof record.osInfo === "string" ? record.osInfo : null,
  };
}

function readBootstrapFlowFromMetrics(metrics: unknown): RemoteHostDetails["agentHealth"]["bootstrapFlow"] | null {
  const record = toRecord(metrics);
  if (!record) return null;
  const value = record.lastBootstrapFlow;
  if (typeof value !== "string") return null;
  const flow = value.trim();
  if (
    flow === "pending_link" ||
    flow === "linked_host_detected" ||
    flow === "host_bootstrap_required" ||
    flow === "token_invalid" ||
    flow === "body_parse_failed" ||
    flow === "unknown"
  ) {
    return flow;
  }
  return null;
}

function readContractErrorCodeFromMetrics(metrics: unknown): string | null {
  const record = toRecord(metrics);
  if (!record) return null;
  const value = record.lastContractErrorCode;
  if (typeof value !== "string") return null;
  const code = value.trim();
  return code ? code : null;
}

function readBootstrapRatePctFromMetrics(metrics: unknown): number | null {
  const record = toRecord(metrics);
  if (!record) return null;
  const payload = toRecord(record.bootstrapRate24h);
  if (!payload) return null;
  const value = payload.bootstrapRatePct;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function readPendingAckQueueSizeFromMetrics(metrics: unknown): number | null {
  const record = toRecord(metrics);
  if (!record) return null;
  const value = record.pendingAckQueueSize;
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed));
  }
  return null;
}

function readAckQueueFlushFailedFromMetrics(metrics: unknown): number | null {
  const record = toRecord(metrics);
  if (!record) return null;
  const flush = toRecord(record.ackQueueFlush);
  if (!flush) return null;
  const value = flush.failed;
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed));
  }
  return null;
}

export async function getRemotePlatformOverview(tenantScope: RemoteTenantScope): Promise<RemotePlatformOverview> {
  const moduleSettings = await getRemoteModuleSettingsSnapshot();
  const scopedWhere = buildRemoteScopedWhere(tenantScope);
  const companyOptions = await prisma.company.findMany({
    where: { deletedAt: null, ...buildScopedCompanyWhere(tenantScope) },
    select: {
      id: true,
      nomeFantasia: true,
      razaoSocial: true,
    },
    orderBy: [{ nomeFantasia: "asc" }, { razaoSocial: "asc" }],
  });

  const [
    recentHosts,
    recentSessions,
    hostOptionsRows,
    companies,
    totalHosts,
    activeHosts,
    maintenanceHosts,
    inactiveHosts,
    totalSessions,
    requestedSessions,
    startedSessions,
    endedSessions,
    failedSessions,
  ] = await Promise.all([
    prisma.remoteHost.findMany({
      where: scopedWhere,
      include: {
        company: { select: { nomeFantasia: true, razaoSocial: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
    prisma.remoteSession.findMany({
      where: scopedWhere,
      include: {
        company: { select: { nomeFantasia: true, razaoSocial: true } },
        host: { select: { name: true } },
        requestedByUser: { select: { name: true } },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 6,
    }),
    prisma.remoteHost.findMany({
      where: scopedWhere,
      include: {
        company: { select: { nomeFantasia: true, razaoSocial: true } },
      },
      orderBy: [{ name: "asc" }],
      take: 100,
    }),
      prisma.company.findMany({
        where: { deletedAt: null, ...buildScopedCompanyWhere(tenantScope) },
      select: { id: true, nomeFantasia: true, razaoSocial: true },
      orderBy: [{ nomeFantasia: "asc" }, { razaoSocial: "asc" }],
    }),
    prisma.remoteHost.count({ where: scopedWhere }),
    prisma.remoteHost.count({ where: { ...scopedWhere, status: "ACTIVE" } }),
    prisma.remoteHost.count({ where: { ...scopedWhere, status: "MAINTENANCE" } }),
    prisma.remoteHost.count({ where: { ...scopedWhere, status: "INACTIVE" } }),
    prisma.remoteSession.count({ where: scopedWhere }),
    prisma.remoteSession.count({ where: { ...scopedWhere, status: "REQUESTED" } }),
    prisma.remoteSession.count({ where: { ...scopedWhere, status: "STARTED" } }),
    prisma.remoteSession.count({ where: { ...scopedWhere, status: "ENDED" } }),
    prisma.remoteSession.count({ where: { ...scopedWhere, status: "FAILED" } }),
  ]);

  const hostStats = {
    total: totalHosts,
    active: activeHosts,
    maintenance: maintenanceHosts,
    inactive: inactiveHosts,
  };

  const sessionStats = {
    total: totalSessions,
    requested: requestedSessions,
    started: startedSessions,
    ended: endedSessions,
    failed: failedSessions,
  };

  return {
    title: "Plataforma Remota",
    summary:
      "Base inicial para acesso remoto, credenciais centralizadas, backup e trilha de auditoria em uma operacao unica.",
    recommendedEngine: "RustDesk self-hosted",
    secretVault: "HashiCorp Vault",
    backupStrategy: "Firebird com gbak como padrao e nbackup para cenarios especificos",
    companyFilterRule:
      "ADMIN, SUPORTE e DEVELOPER enxergam todos os hosts e sessoes. CLIENTE_ADMIN deve enxergar apenas registros cujo companyId coincide com sua membership ativa.",
    accessPolicies: [
      {
        role: "ADMIN",
        scope: "global",
        description: "Visao global para operacao, suporte e governanca da plataforma remota.",
      },
      {
        role: "SUPORTE",
        scope: "global",
        description: "Visao global para atendimento tecnico, diagnostico e abertura de sessao.",
      },
      {
        role: "DEVELOPER",
        scope: "global",
        description: "Visao global para integracoes, observabilidade e manutencao de agentes.",
      },
      {
        role: "CLIENTE_ADMIN",
        scope: "company",
        description: "Escopo estrito a hosts e sessoes da propria empresa, nunca visao global.",
      },
    ],
    tenantScope,
    hostModel: {
      id: "remote_host.id",
      companyId: "remote_host.companyId",
      name: "remote_host.name",
      environment: "remote_host.environment",
      provider: "remote_host.provider",
      description: "remote_host.description",
      notes: "remote_host.notes",
      agentExternalId: "remote_host.agentExternalId",
      machineName: "remote_host.machineName",
      agentVersion: "remote_host.agentVersion",
      status: "ACTIVE",
    },
    sessionModel: {
      id: "remote_session.id",
      companyId: "remote_session.companyId",
      ticketId: "remote_session.ticketId",
      ticketNumber: "remote_session.ticketNumber",
      hostId: "remote_session.hostId",
      requestedByUserId: "remote_session.requestedByUserId",
      startedByUserId: "remote_session.startedByUserId",
      status: "REQUESTED",
    },
    sessionAuditModel: {
      id: "remote_session_audit.id",
      sessionId: "remote_session_audit.sessionId",
      action: "REQUESTED",
      source: "UI",
      actorUserId: "remote_session_audit.actorUserId",
      hostId: "remote_session_audit.hostId",
      ticketNumber: "remote_session_audit.ticketNumber",
      occurredAt: "remote_session_audit.occurredAt",
      summary: "Sessao solicitada por operador autenticado",
      metadata: "json com origem, motivo, expiracao, payload externo e diagnostico",
    },
    modules: [
      {
        id: "remote-hosts",
        title: "Ambientes e agentes",
        description: "Cadastro de clientes, ambientes, hosts e agentes com companyId explicito e heartbeat OSS-first.",
        status: "foundation",
        nextStep: "Validar auto-registro do agente, heartbeat e enriquecimento operacional do host.",
      },
      {
        id: "remote-sessions",
        title: "Sessoes remotas",
        description: "Inicio, encerramento e rastreabilidade minima de sessoes tecnicas com companyId proprio para auditoria e filtro.",
        status: "foundation",
        nextStep: "Materializar trilha de auditoria por sessao, job de expiracao e resolucao de host por ticket.",
      },
      {
        id: "ticket-rustdesk",
        title: "Integracao Tickets + RustDesk",
        description: "Link rapido no ticket com rustdesk://<id>, vinculo do ticket com sessao remota e webhook para auditoria.",
        status: "planned",
        nextStep: "Criar rustdesk_id no contexto do Tickets e payload webhook para o orquestrador remoto.",
      },
      {
        id: "credential-vault",
        title: "Credenciais e cofres",
        description: "Referencias seguras para segredos, acesso controlado e auditoria de leitura.",
        status: "planned",
        nextStep: "Modelar CredentialVaultRef e policy de acesso por role.",
      },
      {
        id: "backup-restore",
        title: "Backup e restore",
        description: "Jobs de backup, catalogo de artefatos e trilha de restore com dupla confirmacao.",
        status: "planned",
        nextStep: "Criar entidades BackupJob, BackupArtifact e RestoreJob.",
      },
      {
        id: "audit-observability",
        title: "Auditoria e observabilidade",
        description: "Registro de acoes tecnicas, health checks e alertas operacionais por ambiente.",
        status: "planned",
        nextStep: "Persistir eventos por sessao com action, source, actor, summary e metadata.",
      },
    ],
    endpoints: [
      { method: "GET", path: "/api/remote/hosts", purpose: "Listar hosts remotos no escopo do usuario" },
      { method: "POST", path: "/api/remote/hosts", purpose: "Cadastrar host remoto" },
      { method: "POST", path: "/api/remote/agents/discover", purpose: "Registrar maquina descoberta e manter heartbeat sem host previo" },
      { method: "POST", path: "/api/remote/rustdesk/bootstrap", purpose: "Bootstrap autenticado do host para emissao de agentToken" },
      { method: "POST", path: "/api/remote/rustdesk/sync", purpose: "Heartbeat autenticado, compliance do cliente e sincronizacao operacional" },
      { method: "POST", path: "/api/remote/rustdesk/ack", purpose: "Ack de comandos executados pelo agente no host" },
      { method: "GET", path: "/api/remote/sessions", purpose: "Listar sessoes remotas no escopo do usuario" },
      { method: "POST", path: "/api/remote/sessions", purpose: "Solicitar sessao remota" },
      { method: "POST", path: "/api/remote/sessions/:id/start", purpose: "Iniciar sessao remota solicitada" },
      { method: "POST", path: "/api/remote/sessions/:id/stop", purpose: "Encerrar sessao remota iniciada" },
      { method: "POST", path: "/api/integrations/tickets/webhook", purpose: "Receber evento do ticket remoto e vincular sessao" },
      { method: "GET", path: "/api/integrations/tickets/rustdesk-link/:ticketId", purpose: "Resolver deep-link rustdesk:// para o ticket" },
      { method: "POST", path: "/api/credentials/request", purpose: "Solicitar segredo por referencia" },
      { method: "POST", path: "/api/backup/run", purpose: "Disparar backup" },
      { method: "GET", path: "/api/backup/jobs", purpose: "Listar jobs e artefatos" },
      { method: "POST", path: "/api/restore/run", purpose: "Solicitar restore" },
      { method: "GET", path: "/api/audit/events", purpose: "Consultar trilha de auditoria" },
    ],
    roadmap: [
      {
        id: "phase-1",
        title: "Fase 1 - Fundacao",
        summary: "RustDesk self-hosted, companyId em host/sessao, integracao inicial com Tickets, controle de sessao, auditoria minima e backup padrao com gbak.",
        status: "foundation",
      },
      {
        id: "phase-2",
        title: "Fase 2 - Seguranca e governanca",
        summary: "Vault, politicas por role, rotacao de credenciais e trilha ampliada.",
        status: "planned",
      },
      {
        id: "phase-3",
        title: "Fase 3 - Escala e experiencia web-first",
        summary: "Guacamole, gravacao/replay, operacao multiambiente e observabilidade avancada.",
        status: "planned",
      },
    ],
    hostStats,
    sessionStats,
    recentHosts: recentHosts.map((host) => ({
      id: host.id,
      companyId: host.companyId,
      name: host.name,
      environment: host.environment,
      provider: host.provider,
      description: host.description,
      agentExternalId: host.agentExternalId,
      notes: host.notes,
      machineName: host.machineName,
      agentVersion: host.agentVersion,
      status: host.status,
      companyName: host.company.nomeFantasia ?? host.company.razaoSocial,
      createdAt: host.createdAt.toISOString(),
      lastHeartbeatAt: host.lastHeartbeatAt?.toISOString() ?? null,
    })),
    recentSessions: recentSessions.map((session) => ({
      id: session.id,
      companyId: session.companyId,
      ticketId: session.ticketId,
      ticketNumber: session.ticketNumber,
      hostId: session.hostId,
      requestedByUserId: session.requestedByUserId,
      startedByUserId: session.startedByUserId,
      status: session.status,
      hostName: session.host.name,
      companyName: session.company.nomeFantasia ?? session.company.razaoSocial,
      requestedByName: session.requestedByUser.name,
      createdAt: session.createdAt.toISOString(),
      startedAt: session.startedAt?.toISOString() ?? null,
      endedAt: session.endedAt?.toISOString() ?? null,
    })),
    companyOptions: companies.map((company) => ({
      id: company.id,
      label: buildCompanyOptionLabel(company),
      searchText: buildCompanyOptionSearchText(company),
    })),
    hostOptions: hostOptionsRows.map((host) => ({
      id: host.id,
      companyId: host.companyId,
      label: `${host.name} (${host.company.nomeFantasia ?? host.company.razaoSocial})`,
      status: host.status,
    })),
  };
}

export async function getRemotePlatformDirectory(tenantScope: RemoteTenantScope): Promise<RemotePlatformDirectory> {
  
  const moduleSettings = await getRemoteModuleSettingsSnapshot();
  const scopedWhere = buildRemoteScopedWhere(tenantScope);
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [hosts, totalHosts, activeHosts, companies, companyOptions, discoveredHosts] = await Promise.all([
    prisma.remoteHost.findMany({
      where: scopedWhere,
      include: {
        company: { select: { nomeFantasia: true, razaoSocial: true } },
        sessions: {
          select: { createdAt: true, status: true, ticketNumber: true },
          orderBy: [{ createdAt: "desc" }],
          take: 10,
        },
      },
      orderBy: [{ company: { razaoSocial: "asc" } }, { name: "asc" }],
    }),
    prisma.remoteHost.count({ where: scopedWhere }),
    prisma.remoteHost.count({ where: { ...scopedWhere, status: "ACTIVE" } }),
    prisma.remoteHost.groupBy({
      by: ["companyId"],
      where: scopedWhere,
    }),
      prisma.company.findMany({
        where: { deletedAt: null, ...buildScopedCompanyWhere(tenantScope) },
      select: { id: true, nomeFantasia: true, razaoSocial: true },
      orderBy: [{ razaoSocial: "asc" }],
      take: 100,
    }),
    tenantScope.isGlobalView
      ? prisma.remoteDiscoveredHost.findMany({
          where: { status: "PENDING_LINK" },
          orderBy: [{ lastHeartbeatAt: "desc" }, { updatedAt: "desc" }],
          take: 50,
        })
      : Promise.resolve([]),
  ]);

  const hostIds = hosts.map((host) => host.id);
  const commandRows = hostIds.length
    ? await prisma.remoteAgentCommand.findMany({
        where: {
          hostId: { in: hostIds },
          OR: [{ status: "PENDING" }, { updatedAt: { gte: last30d } }],
        },
        select: {
          id: true,
          hostId: true,
          type: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          deliveredAt: true,
          executedAt: true,
          failedAt: true,
        },
        orderBy: [{ updatedAt: "desc" }],
        take: 500,
      })
    : [];

  const installationRows = hostIds.length
    ? await prisma.$queryRaw<Array<{ hostId: string; companyName: string | null; companyLabel: string }>>(
        Prisma.sql`
          SELECT
            u."hostId" AS "hostId",
            COALESCE(c."nomeFantasia", c."razaoSocial") AS "companyName",
            u."companyLabel" AS "companyLabel"
          FROM "remote_host_syspro_update" u
          LEFT JOIN "company" c ON c."id" = u."companyId"
          WHERE u."hostId" IN (${Prisma.join(hostIds)})
          ORDER BY u."companyLabel" ASC
        `
      )
    : [];

  const installationMap = new Map<string, string[]>();
  for (const row of installationRows) {
    const labels = [row.companyName, row.companyLabel]
      .map((label) => label?.trim())
      .filter((label): label is string => !!label);
    if (!labels.length) continue;
    const current = installationMap.get(row.hostId) ?? [];
    for (const label of labels) {
      if (!current.includes(label)) current.push(label);
    }
    installationMap.set(row.hostId, current);
  }

  const pendingHosts = new Set<string>();
  const failedHosts = new Set<string>();
  let pendingTotal = 0;
  let failedLast24h = 0;
  let acknowledgedLast24h = 0;
  let deliveredLast24h = 0;
  const perHostCommandStats = new Map<string, { pendingCount: number; failedCount: number }>();

  for (const row of commandRows) {
    const current = perHostCommandStats.get(row.hostId) ?? { pendingCount: 0, failedCount: 0 };
    if (row.status === "PENDING") {
      pendingTotal += 1;
      pendingHosts.add(row.hostId);
      current.pendingCount += 1;
    }
    if (row.status === "FAILED" && row.updatedAt >= last24h) {
      failedLast24h += 1;
      failedHosts.add(row.hostId);
      current.failedCount += 1;
    }
    if (row.status === "ACKNOWLEDGED" && row.updatedAt >= last24h) {
      acknowledgedLast24h += 1;
    }
    if (row.status === "DELIVERED" && row.updatedAt >= last24h) {
      deliveredLast24h += 1;
    }
    perHostCommandStats.set(row.hostId, current);
  }

  const hostMap = new Map(
    hosts.map((host) => [host.id, { hostName: host.name, companyName: host.company.nomeFantasia ?? host.company.razaoSocial }])
  );
  const hotspots = Array.from(perHostCommandStats.entries())
    .map(([hostId, stats]) => ({
      hostId,
      hostName: hostMap.get(hostId)?.hostName ?? "Host remoto",
      companyName: hostMap.get(hostId)?.companyName ?? null,
      pendingCount: stats.pendingCount,
      failedCount: stats.failedCount,
    }))
    .filter((entry) => entry.pendingCount > 0 || entry.failedCount > 0)
    .sort((a, b) => (b.pendingCount + b.failedCount * 2) - (a.pendingCount + a.failedCount * 2))
    .slice(0, 5);

  const timeline = commandRows
    .filter((row) => row.status !== "PENDING")
    .map((row) => ({
      commandId: row.id,
      hostId: row.hostId,
      hostName: hostMap.get(row.hostId)?.hostName ?? "Host remoto",
      companyName: hostMap.get(row.hostId)?.companyName ?? null,
      type: row.type,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      deliveredAt: row.deliveredAt?.toISOString() ?? null,
      executedAt: row.executedAt?.toISOString() ?? null,
      failedAt: row.failedAt?.toISOString() ?? null,
      durationSeconds: resolveCommandDurationSeconds({
        createdAt: row.createdAt,
        executedAt: row.executedAt,
        failedAt: row.failedAt,
      }),
    }))
    .slice(0, 20);

  const successRates = {
    window24h: resolveSuccessRate(commandRows, last24h),
    window7d: resolveSuccessRate(commandRows, last7d),
    window30d: resolveSuccessRate(commandRows, last30d),
  };
  const orchestrationMix24hRaw = hostIds.length
    ? await prisma.$queryRaw<
        Array<{
          syncTokenFirst: bigint | number | null;
          discoverBootstrap: bigint | number | null;
          unknown: bigint | number | null;
        }>
      >(
        Prisma.sql`
          SELECT
            SUM(
              CASE
                WHEN "lastAgentMetrics"->>'orchestrationStrategy' = 'sync_token_first' THEN 1
                ELSE 0
              END
            ) AS "syncTokenFirst",
            SUM(
              CASE
                WHEN "lastAgentMetrics"->>'orchestrationStrategy' = 'discover_bootstrap' THEN 1
                ELSE 0
              END
            ) AS "discoverBootstrap",
            SUM(
              CASE
                WHEN COALESCE("lastAgentMetrics"->>'orchestrationStrategy', '') NOT IN ('sync_token_first', 'discover_bootstrap')
                THEN 1
                ELSE 0
              END
            ) AS "unknown"
          FROM "remote_host"
          WHERE "id" IN (${Prisma.join(hostIds)})
            AND "lastAgentMetricsAt" >= ${last24h}
        `
      )
    : [{ syncTokenFirst: 0, discoverBootstrap: 0, unknown: 0 }];
  const orchestrationMix24h = orchestrationMix24hRaw[0] ?? {
    syncTokenFirst: 0,
    discoverBootstrap: 0,
    unknown: 0,
  };

  const pendingItems: RemoteDiscoveredAgentItem[] = discoveredHosts.map((host) => {
    const snapshot = Array.isArray(host.installationsSnapshot) ? host.installationsSnapshot : [];
    
    // Extrai o objeto de telemetria se existir (marcado com _telemetry: true/objeto)
    const telemetryEntry = snapshot.find(entry => entry && typeof entry === 'object' && '_telemetry' in entry);
    const lastAgentMetrics = normalizeLastAgentMetrics((telemetryEntry as any)?._telemetry ?? null);

    const installationCompanies = snapshot
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        if ("_telemetry" in entry) return null; // Ignora o entry de telemetria na listagem de empresas
        if ("empresa" in entry && typeof entry.empresa === "string") return entry.empresa.trim();
        if ("companyLabel" in entry && typeof entry.companyLabel === "string") return entry.companyLabel.trim();
        return null;
      })
      .filter((entry): entry is string => !!entry);

    return {
      id: host.id,
      machineName: host.machineName,
      machineProfile: null,
      rustdeskId: host.agentExternalId,
      agentVersion: host.agentVersion,
      provider: host.provider,
      environment: host.environment,
      description: host.description,
      serviceStatus: host.serviceStatus,
      lastHeartbeatAt: host.lastHeartbeatAt?.toISOString() ?? null,
      status: host.status as RemoteDiscoveredAgentItem["status"],
      linkedHostId: host.linkedHostId,
      installationCompanies,
      lastAgentMetrics,
      lastAgentMetricsAt: host.lastHeartbeatAt?.toISOString() ?? null,
    };
  });

  return {
    tenantScope,
    moduleSettings: buildRemoteModuleSettingsView(moduleSettings),
    stats: {
      totalHosts,
      activeHosts,
      companies: companies.length,
      pendingInstall: hosts.filter((host) => !host.agentExternalId).length,
      linkedAgents: hosts.filter((host) => !!host.agentExternalId).length,
      onlineAgents: hosts.filter((host) => !!host.lastHeartbeatAt).length,
      pendingDiscovery: pendingItems.length,
    },
    commandObservability: {
      pendingTotal,
      pendingHosts: pendingHosts.size,
      failedLast24h,
      acknowledgedLast24h,
      deliveredLast24h,
      hotspots,
      successRates,
      orchestrationMix: {
        window24h: {
          syncTokenFirst: Number(orchestrationMix24h.syncTokenFirst ?? 0),
          discoverBootstrap: Number(orchestrationMix24h.discoverBootstrap ?? 0),
          unknown: Number(orchestrationMix24h.unknown ?? 0),
        },
      },
      timeline,
    },
    companyOptions: companyOptions.map((company) => ({
      id: company.id,
      label: buildCompanyOptionLabel(company),
      searchText: buildCompanyOptionSearchText(company),
    })),
    pendingItems,
    items: hosts.map((host) =>
      mapDirectoryItem({
        ...host,
        installationCompanies: installationMap.get(host.id) ?? [],
      })
    ),
  };
}

export async function getRemoteHostDetails(tenantScope: RemoteTenantScope, hostId: string): Promise<RemoteHostDetails | null> {
  
  const moduleSettings = await getRemoteModuleSettingsSnapshot();
  const scopedWhere = buildRemoteScopedWhere(tenantScope);

  const host = await prisma.remoteHost.findFirst({
    where: {
      id: hostId,
      ...scopedWhere,
    },
    include: {
      discoveryRecord: {
        select: {
          status: true,
          lastHeartbeatAt: true,
          updatedAt: true,
          agentVersion: true,
        },
      },
      company: {
        select: {
          id: true,
          nomeFantasia: true,
          razaoSocial: true,
          serverType: true,
          serverPort: true,
          serverHost: true,
          serverProtocol: true,
          iisIsapiPath: true,
          installationDirectory: true,
          remoteConnections: true,
          remoteConnectionType: true,
          remoteConnectionDetails: true,
          observacoes: true,
          memberships: {
            where: {
              user: {
                deletedAt: null,
                isActive: true,
              },
            },
            select: {
              role: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: [{ createdAt: "asc" }],
            take: 20,
          },
        },
      },
      sessions: {
        include: {
          company: { select: { nomeFantasia: true, razaoSocial: true } },
          host: { select: { name: true } },
          requestedByUser: { select: { name: true } },
        },
        orderBy: [{ createdAt: "desc" }],
        take: 20,
      },
      sysproUpdates: {
        select: {
          id: true,
          companyId: true,
          companyLabel: true,
          path: true,
        },
      },
    },
  });

  if (!host) return null;
  const companyOptions = await prisma.company.findMany({
    where: { deletedAt: null, ...buildScopedCompanyWhere(tenantScope) },
    select: {
      id: true,
      nomeFantasia: true,
      razaoSocial: true,
    },
    orderBy: [{ nomeFantasia: "asc" }, { razaoSocial: "asc" }],
  });
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const sysproUpdates = await prisma.$queryRaw<
    Array<{
      id: string;
      companyId: string | null;
      companyLabel: string;
      resolvedCompanyName: string | null;
      path: string;
      lastFileWriteAt: Date | null;
      isServerHost: boolean | null;
      hasClientFolder: boolean | null;
      hasDllFolder: boolean | null;
      firebirdVersion: string | null;
      firebirdPath: string | null;
      lastHeartbeatAt: Date;
    }>
  >`
    SELECT
      u."id",
      u."companyId",
      u."companyLabel",
      COALESCE(c."nomeFantasia", c."razaoSocial") AS "resolvedCompanyName",
      u."path",
      u."lastFileWriteAt",
      u."isServerHost",
      u."hasClientFolder",
      u."hasDllFolder",
      u."firebirdVersion",
      u."firebirdPath",
      u."lastHeartbeatAt"
    FROM "remote_host_syspro_update" u
    LEFT JOIN "company" c ON c."id" = u."companyId"
    WHERE u."hostId" = ${host.id}
    ORDER BY u."companyLabel" ASC, u."path" ASC
  `;
  const companyIdsFromInstallations = Array.from(new Set(sysproUpdates.map((entry) => entry.companyId).filter((id): id is string => !!id)));
  const installationCompanies = companyIdsFromInstallations.length
    ? await prisma.company.findMany({
        where: { id: { in: companyIdsFromInstallations } },
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true,
          serverType: true,
          serverPort: true,
          serverHost: true,
          serverProtocol: true,
          iisIsapiPath: true,
          installationDirectory: true,
          remoteConnections: true,
          remoteConnectionType: true,
          remoteConnectionDetails: true,
          observacoes: true,
        },
      })
    : [];
  const companyContextById = new Map(
    installationCompanies.map((company) => [
      company.id,
      {
        id: company.id,
        razaoSocial: company.razaoSocial,
        nomeFantasia: company.nomeFantasia,
        serverType: ((company as any).serverType ?? null) as "SYSPRO_SERVER" | "IIS" | null,
        serverPort: company.serverPort ?? null,
        serverHost: company.serverHost ?? null,
        serverProtocol: ((company as any).serverProtocol ?? null) as "HTTP" | "HTTPS" | null,
        iisIsapiPath: company.iisIsapiPath ?? null,
        installationDirectory: company.installationDirectory ?? null,
        remoteConnections: mapCompanyRemoteConnections({
          remoteConnections: (company as any).remoteConnections,
          remoteConnectionType: (company as any).remoteConnectionType,
          remoteConnectionDetails: (company as any).remoteConnectionDetails,
        }),
        observacoes: company.observacoes ?? null,
      },
    ])
  );
  const primaryCompanyContext = {
    id: host.company.id,
    razaoSocial: host.company.razaoSocial,
    nomeFantasia: host.company.nomeFantasia,
    serverType: ((host.company as any).serverType ?? null) as "SYSPRO_SERVER" | "IIS" | null,
    serverPort: host.company.serverPort ?? null,
    serverHost: host.company.serverHost ?? null,
    serverProtocol: ((host.company as any).serverProtocol ?? null) as "HTTP" | "HTTPS" | null,
    iisIsapiPath: host.company.iisIsapiPath ?? null,
    installationDirectory: host.company.installationDirectory ?? null,
    remoteConnections: mapCompanyRemoteConnections({
      remoteConnections: (host.company as any).remoteConnections,
      remoteConnectionType: (host.company as any).remoteConnectionType,
      remoteConnectionDetails: (host.company as any).remoteConnectionDetails,
    }),
    observacoes: host.company.observacoes ?? null,
  };
  companyContextById.set(host.company.id, primaryCompanyContext);
  const companyContexts = Array.from(companyContextById.values());
  const companyContextByIdentity = new Map<string, (typeof primaryCompanyContext)>();
  const companyContextByDirectory = new Map<string, (typeof primaryCompanyContext)>();

  for (const context of companyContexts) {
    const identities = [context.nomeFantasia, context.razaoSocial]
      .map((entry) => normalizeSearchText(entry))
      .filter((entry) => !!entry);
    for (const identity of identities) {
      if (!companyContextByIdentity.has(identity)) {
        companyContextByIdentity.set(identity, context);
      }
    }

    const directoryKey = context.installationDirectory?.trim().toLowerCase();
    if (directoryKey && !companyContextByDirectory.has(directoryKey)) {
      companyContextByDirectory.set(directoryKey, context);
    }
  }
  const primaryCompanyLabels = new Set(
    [host.company.nomeFantasia, host.company.razaoSocial]
      .map((entry) => normalizeSearchText(entry))
      .filter((entry) => !!entry)
  );
  const agentCommands = await prisma.remoteAgentCommand.findMany({
      where: {
        hostId: host.id,
        status: {
          in: ["PENDING", "DELIVERED", "ACKNOWLEDGED", "FAILED"],
        },
      },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 12,
  });
  const timelineCommands = await prisma.remoteAgentCommand.findMany({
    where: {
      hostId: host.id,
      OR: [{ status: "PENDING" }, { updatedAt: { gte: last30d } }],
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 60,
  });

  const hostServiceStatus = await prisma.$queryRaw<Array<{ serviceStatus: string | null }>>`
    SELECT "serviceStatus"
    FROM "remote_host"
    WHERE "id" = ${host.id}
  `;
  const serviceStatus = hostServiceStatus[0]?.serviceStatus ?? null;
  const mappedSysproUpdates = sysproUpdates.map((entry) => ({
    id: entry.id,
    companyId: entry.companyId,
    companyLabel: entry.companyLabel,
    resolvedCompanyName: entry.resolvedCompanyName,
    path: entry.path,
    lastFileWriteAt: entry.lastFileWriteAt?.toISOString() ?? null,
    isServerHost: entry.isServerHost,
    hasClientFolder: entry.hasClientFolder,
    hasDllFolder: entry.hasDllFolder,
    firebirdVersion: entry.firebirdVersion,
    firebirdPath: entry.firebirdPath,
    lastHeartbeatAt: entry.lastHeartbeatAt.toISOString(),
  }));
  const mostRecentFailureStreak = agentCommands.reduce((acc, command) => {
    if (acc.stopped) return acc;
    if (command.status === "FAILED") {
      return { count: acc.count + 1, stopped: false };
    }
    return { count: acc.count, stopped: true };
  }, { count: 0, stopped: false }).count;
  const bootstrapFlowFromMetrics = readBootstrapFlowFromMetrics(host.lastAgentMetrics);
  const bootstrapFlow: RemoteHostDetails["agentHealth"]["bootstrapFlow"] = (() => {
    if (bootstrapFlowFromMetrics) return bootstrapFlowFromMetrics;
    if (host.discoveryRecord?.status === "PENDING_LINK") return "pending_link";
    if (!host.agentTokenHash) return "host_bootstrap_required";
    if (host.discoveryRecord?.status === "LINKED") return "linked_host_detected";
    return "unknown";
  })();
  const contractErrorCode = readContractErrorCodeFromMetrics(host.lastAgentMetrics);
  const hostTelemetry = host as typeof host & {
    lastSysproVersionSnapshot?: Prisma.JsonValue | null;
    lastSysproVersionSnapshotAt?: Date | null;
  };
  const hostView = mapDirectoryItem({
    ...host,
    serviceStatus,
    lastHeartbeatSuccessAt: host.lastHeartbeatSuccessAt,
    lastHeartbeatErrorAt: host.lastHeartbeatErrorAt,
    lastHeartbeatErrorMessage: host.lastHeartbeatErrorMessage,
    lastKnownIp: host.lastKnownIp,
    lastRegisterAt: host.lastRegisterAt,
    lastRegisterSource: host.lastRegisterSource,
    sessions: host.sessions.map((session) => ({
      createdAt: session.createdAt,
      status: session.status,
      ticketNumber: session.ticketNumber,
    })),
  });

  return {
    tenantScope,
    host: hostView,
    agentHealth: {
      productStatus: hostView.productStatus,
      lastDiscoverAt:
        host.discoveryRecord?.lastHeartbeatAt?.toISOString() ??
        host.discoveryRecord?.updatedAt?.toISOString() ??
        null,
      lastSyncAt: host.lastHeartbeatAt?.toISOString() ?? null,
      bootstrapFlow,
      consecutiveFailures: mostRecentFailureStreak,
      agentVersion: host.agentVersion ?? host.discoveryRecord?.agentVersion ?? null,
      tokenSource: host.lastRegisterSource ?? null,
      serviceStatus,
      contractErrorCode,
    },
    agentTelemetry: {
      systemSnapshot: toRecord(host.lastSystemSnapshot),
      systemSnapshotAt: host.lastSystemSnapshotAt?.toISOString() ?? null,
      networkSnapshot: toRecord(host.lastNetworkSnapshot),
      networkSnapshotAt: host.lastNetworkSnapshotAt?.toISOString() ?? null,
      softwareSnapshot: toRecordArray(host.lastSoftwareSnapshot),
      softwareSnapshotAt: host.lastSoftwareSnapshotAt?.toISOString() ?? null,
      hardwareIdentity: toRecord(host.lastHardwareIdentity),
      hardwareIdentityAt: host.lastHardwareIdentityAt?.toISOString() ?? null,
      diskSnapshot: toRecordArray(host.lastDiskSnapshot),
      diskSnapshotAt: host.lastDiskSnapshotAt?.toISOString() ?? null,
      sysproProcessSnapshot: toRecordArray(host.lastSysproProcessSnapshot),
      sysproProcessSnapshotAt: host.lastSysproProcessSnapshotAt?.toISOString() ?? null,
      sysproVersionSnapshot: toRecord(hostTelemetry.lastSysproVersionSnapshot),
      sysproVersionSnapshotAt: hostTelemetry.lastSysproVersionSnapshotAt?.toISOString() ?? null,
      windowsUpdateStatus: toRecord(host.lastWindowsUpdateStatus),
      windowsUpdateStatusAt: host.lastWindowsUpdateStatusAt?.toISOString() ?? null,
      rebootPending: typeof host.lastRebootPending === "boolean" ? host.lastRebootPending : null,
      rebootPendingAt: host.lastRebootPendingAt?.toISOString() ?? null,
      agentMetrics: toRecord(host.lastAgentMetrics),
      agentMetricsAt: host.lastAgentMetricsAt?.toISOString() ?? null,
    },
    moduleSettings: buildRemoteModuleSettingsView(moduleSettings),
    companyOptions: companyOptions.map((company) => ({
      id: company.id,
      label: buildCompanyOptionLabel(company),
      searchText: buildCompanyOptionSearchText(company),
    })),
    installGuide: buildInstallGuide(hostView),
    company: {
      id: host.company.id,
      razaoSocial: host.company.razaoSocial,
      nomeFantasia: host.company.nomeFantasia,
      installationDirectory: host.company.installationDirectory ?? null,
    },
    installationContexts: mappedSysproUpdates.map((update) => {
      const linkedCompanyContext = update.companyId ? companyContextById.get(update.companyId) ?? null : null;
      if (linkedCompanyContext) {
        return {
          update,
          company: linkedCompanyContext,
        };
      }

      const updateLabels = [update.resolvedCompanyName, update.companyLabel]
        .map((entry) => normalizeSearchText(entry))
        .filter((entry) => !!entry);
      const guessedByLabel = updateLabels
        .map((label) => companyContextByIdentity.get(label) ?? null)
        .find((context): context is typeof primaryCompanyContext => !!context);
      if (guessedByLabel) {
        return {
          update,
          company: guessedByLabel,
        };
      }

      const guessedByDirectory = companyContextByDirectory.get(update.path.trim().toLowerCase()) ?? null;
      if (guessedByDirectory) {
        return {
          update,
          company: guessedByDirectory,
        };
      }

      const belongsToPrimaryCompany = updateLabels.some((entry) => primaryCompanyLabels.has(entry));

      return {
        update,
        company: belongsToPrimaryCompany ? primaryCompanyContext : null,
      };
    }),
    linkedUsers: host.company.memberships.map((membership) => ({
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role,
    })),
    recentSessions: host.sessions.map((session) => ({
      id: session.id,
      companyId: session.companyId,
      ticketId: session.ticketId,
      ticketNumber: session.ticketNumber,
      hostId: session.hostId,
      requestedByUserId: session.requestedByUserId,
      startedByUserId: session.startedByUserId,
      status: session.status,
      hostName: session.host.name,
      companyName: session.company.nomeFantasia ?? session.company.razaoSocial,
      requestedByName: session.requestedByUser.name,
      createdAt: session.createdAt.toISOString(),
      startedAt: session.startedAt?.toISOString() ?? null,
      endedAt: session.endedAt?.toISOString() ?? null,
    })),
    agentCommands: agentCommands.map((command) => ({
      id: command.id,
      type: command.type,
      status: command.status,
      reason: command.reason ?? null,
      payload:
        command.payload && typeof command.payload === "object" && !Array.isArray(command.payload)
          ? (command.payload as Record<string, unknown>)
          : null,
      attemptCount: command.attemptCount,
      resultMessage: command.resultMessage ?? null,
      resultPayload:
        command.resultPayload && typeof command.resultPayload === "object" && !Array.isArray(command.resultPayload)
          ? (command.resultPayload as Record<string, unknown>)
          : null,
      createdAt: command.createdAt.toISOString(),
      updatedAt: command.updatedAt.toISOString(),
      deliveredAt: command.deliveredAt?.toISOString() ?? null,
      executedAt: command.executedAt?.toISOString() ?? null,
      failedAt: command.failedAt?.toISOString() ?? null,
    })),
    commandSuccessRates: {
      window24h: resolveSuccessRate(timelineCommands, last24h),
      window7d: resolveSuccessRate(timelineCommands, last7d),
      window30d: resolveSuccessRate(timelineCommands, last30d),
    },
    commandTimeline: timelineCommands.map((command) => ({
      id: command.id,
      type: command.type,
      status: command.status,
      createdAt: command.createdAt.toISOString(),
      deliveredAt: command.deliveredAt?.toISOString() ?? null,
      executedAt: command.executedAt?.toISOString() ?? null,
      failedAt: command.failedAt?.toISOString() ?? null,
      durationSeconds: resolveCommandDurationSeconds({
        createdAt: command.createdAt,
        executedAt: command.executedAt,
        failedAt: command.failedAt,
      }),
    })),
  };
}
