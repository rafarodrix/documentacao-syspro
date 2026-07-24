import { z } from "zod";
import { paginationMetaSchema, type PaginationMeta } from "../shared/pagination.types";
import { remoteModuleSettingsSchema, type RemoteModuleSettings } from "./remote-module-settings.types";

type RemoteDirectoryModuleSettings = RemoteModuleSettings & {
  rustDeskPublicKeyHash: string | null;
};

type RemoteHostDetailsModuleSettings = RemoteDirectoryModuleSettings;

export type RemotePlatformStatus = "planned" | "foundation" | "in_progress" | "blocked";

export type RemoteModuleSettingsActionSuccess<T = void> = T extends void
  ? {
      success: true;
      message?: string;
    }
  : {
      success: true;
      message?: string;
      data: T;
    };

export type RemoteModuleSettingsActionFailure = {
  success: false;
  error: string;
};

export type RemoteModuleSettingsActionResponse<T = void> =
  | RemoteModuleSettingsActionSuccess<T>
  | RemoteModuleSettingsActionFailure;

export type RemoteAccessScope = "global" | "company";

export type RemoteAccessPolicy = {
  role: "ADMIN" | "SUPORTE" | "DEVELOPER" | "CLIENTE_ADMIN";
  scope: RemoteAccessScope;
  description: string;
};

export type RemoteHostStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";
export type RemoteDiscoveredHostStatus = "PENDING_LINK" | "LINKED" | "IGNORED";
export type RemoteMachineProfile = "SERVER" | "WORKSTATION" | "TERMINAL" | "BACKUP_NODE";

export type RemoteSessionStatus = "REQUESTED" | "STARTED" | "ENDED" | "FAILED" | "CANCELLED";
export type RemoteOperationalStatus = "ONLINE" | "RECENT" | "OFFLINE" | "MISCONFIGURED" | "SESSION_BUSY";
export type RemoteProductStatus =
  | "AWAITING_LINK"
  | "PROVISIONING_REMOTE"
  | "REMOTE_READY"
  | "ATTENTION_REQUIRED"
  | "IN_SERVICE";
export type RemoteAgentCommandType =
  | "REAPPLY_ALIAS"
  | "REAPPLY_CONFIG"
  | "UPGRADE_CLIENT"
  | "UPGRADE_RUSTDESK"
  | "UPGRADE_AGENT"
  | "SERVICE_CONTROL"
  | "ROTATE_TOKEN_REQUIRED";
export type RemoteAgentCommandStatus = "PENDING" | "DELIVERED" | "ACKNOWLEDGED" | "CANCELLED" | "FAILED";
export type RemoteSessionAuditSource = "UI" | "WEBHOOK" | "JOB" | "AGENT" | "API";
export type RemoteSessionAuditAction =
  | "REQUESTED"
  | "STARTED"
  | "ENDED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "HOST_RESOLVED"
  | "COMMENT_POSTED";

export type RemoteAgentInstallStage =
  | "RUSTDESK_LINKED"
  | "HEARTBEAT_OK";

export type RemoteAgentLifecycleStatus =
  | "PENDING_INSTALL"
  | "INSTALLED"
  | "ONLINE"
  | "STALE"
  | "UNLINKED";

export type RemoteHostSummary = {
  id: string;
  companyId: string;
  name: string;
  environment: string | null;
  provider: string | null;
  description?: string | null;
  notes?: string | null;
  agentExternalId?: string | null;
  machineName?: string | null;
  agentVersion?: string | null;
  status: RemoteHostStatus;
};

export type RemoteSessionSummary = {
  id: string;
  companyId: string;
  ticketId: string | null;
  ticketNumber: string | null;
  hostId: string;
  requestedByUserId: string;
  startedByUserId: string | null;
  status: RemoteSessionStatus;
};

export type RemoteSessionAuditModel = {
  id: string;
  sessionId: string;
  action: RemoteSessionAuditAction;
  source: RemoteSessionAuditSource;
  actorUserId: string | null;
  hostId: string | null;
  ticketNumber: string | null;
  occurredAt: string;
  summary: string;
  metadata: string;
};

export type RemoteSessionAuditEvent = {
  id: string;
  sessionId: string;
  companyId: string;
  hostId: string | null;
  ticketId: string | null;
  ticketNumber: string | null;
  action: RemoteSessionAuditAction;
  source: RemoteSessionAuditSource;
  actorUserId: string | null;
  actorName: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
};

export type RemoteTenantScope = {
  role: "ADMIN" | "SUPORTE" | "DEVELOPER" | "CLIENTE_ADMIN";
  isGlobalView: boolean;
  companyIds: string[];
  companyCount: number;
  summary: string;
};

export type RemotePlatformModule = {
  id: string;
  title: string;
  description: string;
  status: RemotePlatformStatus;
  nextStep: string;
};

export type RemotePlatformEndpoint = {
  method: "GET" | "POST";
  path: string;
  purpose: string;
};

export type RemotePlatformRoadmapPhase = {
  id: string;
  title: string;
  summary: string;
  status: RemotePlatformStatus;
};

export type RemotePlatformOverview = {
  title: string;
  summary: string;
  recommendedEngine: string;
  secretVault: string;
  backupStrategy: string;
  companyFilterRule: string;
  accessPolicies: RemoteAccessPolicy[];
  tenantScope: RemoteTenantScope;
  hostModel: RemoteHostSummary;
  sessionModel: RemoteSessionSummary;
  sessionAuditModel: RemoteSessionAuditModel;
  modules: RemotePlatformModule[];
  endpoints: RemotePlatformEndpoint[];
  roadmap: RemotePlatformRoadmapPhase[];
  hostStats: {
    total: number;
    active: number;
    maintenance: number;
    inactive: number;
  };
  sessionStats: {
    total: number;
    requested: number;
    started: number;
    ended: number;
    failed: number;
  };
  recentHosts: Array<
    RemoteHostSummary & {
      companyName: string | null;
      createdAt: string;
      lastHeartbeatAt: string | null;
    }
  >;
  recentSessions: Array<
    RemoteSessionSummary & {
      hostName: string;
      companyName: string | null;
      requestedByName: string | null;
      createdAt: string;
      startedAt: string | null;
      endedAt: string | null;
    }
  >;
  companyOptions: Array<{
    id: string;
    label: string;
    searchText?: string;
  }>;
  hostOptions: Array<{
    id: string;
    companyId: string;
    label: string;
    status: RemoteHostStatus;
  }>;
};

export type RemotePaginationMeta = PaginationMeta & {
  totalPages: number;
};

/**
 * Agent is the technical runtime installed on the machine.
 * It executes commands, reports heartbeats/telemetry and consumes host-projected configuration.
 */
export type RemoteConfiguredHostAgent = {
  rustdeskId: string | null;
  machineName: string | null;
  agentVersion: string | null;
  lastHeartbeatAt: string | null;
  lastHeartbeatSuccessAt: string | null;
  lastHeartbeatErrorAt: string | null;
  lastHeartbeatErrorMessage: string | null;
  lastKnownIp: string | null;
  lastRegisterAt: string | null;
  lastRegisterSource: string | null;
  agentTokenIssuedAt: string | null;
  agentTokenLastUsedAt: string | null;
  lastKnownRustDeskAlias: string | null;
  lastKnownRustDeskVersion: string | null;
  lastKnownRustDeskServerHost: string | null;
  lastKnownRustDeskApiHost: string | null;
  lastKnownRustDeskPublicKeyHash: string | null;
  lastRustDeskConfigSyncAt: string | null;
  lifecycleStatus: RemoteAgentLifecycleStatus;
  installStages: RemoteAgentInstallStage[];
};

/**
 * A configured host is the administrative projection of a machine inside the portal.
 * It owns company linkage, operational naming and business context; its nested `agent`
 * represents the technical runtime currently attached to that host.
 */
export type RemoteConfiguredHostItem = {
  id: string;
  companyId: string;
  companyName: string | null;
  installationCompanies: string[];
  name: string;
  machineProfile: RemoteMachineProfile | null;
  environment: string | null;
  provider: string | null;
  status: RemoteHostStatus;
  description: string;
  notes: string | null;
  serviceStatus: string | null;
  bootstrapFlow:
    | "pending_link"
    | "linked_host_detected"
    | "host_bootstrap_required"
    | "token_invalid"
    | "body_parse_failed"
    | "unknown";
  contractErrorCode: string | null;
  bootstrapRate24hPct: number | null;
  pendingAckQueueSize: number | null;
  ackQueueFlushFailed: number | null;
  lastAgentMetrics: {
    cpuLoad: number | null;
    ramUsedPc: number | null;
    diskFree: number | null;
    diskTotal: number | null;
    osInfo: string | null;
  } | null;
  lastAgentMetricsAt: string | null;
  openSessionCount: number;
  operationalStatus: RemoteOperationalStatus;
  productStatus: RemoteProductStatus;
  lastSessionAt: string | null;
  lastSessionStatus: RemoteSessionStatus | null;
  lastTicketNumber: string | null;
  agent: RemoteConfiguredHostAgent;
  inventorySignals: {
    rebootPending: boolean | null;
    diskLow: boolean;
    sysproProcessDown: boolean;
    windowsPendingCount: number | null;
    lastExtendedSnapshotAt: string | null;
  };
};

/**
 * Discovered agent/pre-host record.
 * This exists before full host governance is established and still uses a flattened
 * technical shape because there is no consolidated host + agent boundary yet.
 */
export type RemoteDiscoveredAgentItem = {
  id: string;
  machineName: string | null;
  machineProfile: RemoteMachineProfile | null;
  rustdeskId: string | null;
  agentVersion: string | null;
  provider: string | null;
  environment: string | null;
  description: string | null;
  serviceStatus: string | null;
  lastHeartbeatAt: string | null;
  status: RemoteDiscoveredHostStatus;
  linkedHostId: string | null;
  suggestedCompanyId: string | null;
  installationCompanies: string[];
  lastAgentMetrics: {
    cpuLoad: number | null;
    ramUsedPc: number | null;
    diskFree: number | null;
    diskTotal: number | null;
    osInfo: string | null;
  } | null;
  lastAgentMetricsAt: string | null;
};

export type RemotePlatformDirectory = {
  tenantScope: RemoteTenantScope;
  moduleSettings: RemoteDirectoryModuleSettings;
  stats: {
    totalHosts: number;
    activeHosts: number;
    companies: number;
    pendingInstall: number;
    linkedAgents: number;
    onlineAgents: number;
    pendingDiscovery: number;
  };
  commandObservability: {
    pendingTotal: number;
    pendingHosts: number;
    failedLast24h: number;
    acknowledgedLast24h: number;
    deliveredLast24h: number;
    hotspots: Array<{
      hostId: string;
      hostName: string;
      companyName: string | null;
      pendingCount: number;
      failedCount: number;
    }>;
    successRates: {
      window24h: number;
      window7d: number;
      window30d: number;
    };
    orchestrationMix: {
      window24h: {
        syncTokenFirst: number;
        discoverBootstrap: number;
        unknown: number;
      };
    };
    timeline: Array<{
      commandId: string;
      hostId: string;
      hostName: string;
      companyName: string | null;
      type: RemoteAgentCommandType;
      status: RemoteAgentCommandStatus;
      createdAt: string;
      deliveredAt: string | null;
      executedAt: string | null;
      failedAt: string | null;
      durationSeconds: number | null;
    }>;
  };
  companyOptions: Array<{
    id: string;
    label: string;
    searchText?: string;
  }>;
  pendingItems: RemoteDiscoveredAgentItem[];
  items: RemoteConfiguredHostItem[];
};

export type RemoteHostSysproUpdateItem = {
  id: string;
  companyId: string | null;
  companyLabel: string;
  resolvedCompanyName: string | null;
  path: string;
  lastFileWriteAt: string | null;
  isServerHost: boolean | null;
  hasClientFolder: boolean | null;
  hasDllFolder: boolean | null;
  firebirdVersion: string | null;
  firebirdPath: string | null;
  lastHeartbeatAt: string;
};

export type RemoteCompanyContextItem = {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  serverType: "SYSPRO_SERVER" | "IIS" | null;
  serverPort: number | null;
  serverHost: string | null;
  serverProtocol: "HTTP" | "HTTPS" | null;
  iisIsapiPath: string | null;
  installationDirectory: string | null;
  remoteConnections: Array<{
    type: "DDNS_NOIP" | "RADMIN_VPN";
    details: string;
  }>;
  observacoes: string | null;
};

export type RemoteHostDetails = {
  tenantScope: RemoteTenantScope;
  host: RemoteConfiguredHostItem;
  agentHealth: {
    productStatus: RemoteProductStatus;
    lastDiscoverAt: string | null;
    lastSyncAt: string | null;
    bootstrapFlow:
      | "pending_link"
      | "linked_host_detected"
      | "host_bootstrap_required"
      | "token_invalid"
      | "body_parse_failed"
      | "unknown";
    consecutiveFailures: number;
    agentVersion: string | null;
    tokenSource: string | null;
    serviceStatus: string | null;
    contractErrorCode: string | null;
  };
  criticalEvents: Array<{
    id: string;
    source: string;
    provider: string;
    eventCode: string;
    severity: string;
    message: string;
    occurredAt: string;
  }>;
  agentTelemetry: {
    systemSnapshot: Record<string, unknown> | null;
    systemSnapshotAt: string | null;
    networkSnapshot: Record<string, unknown> | null;
    networkSnapshotAt: string | null;
    softwareSnapshot: Array<Record<string, unknown>>;
    softwareSnapshotAt: string | null;
    hardwareIdentity: Record<string, unknown> | null;
    hardwareIdentityAt: string | null;
    diskSnapshot: Array<Record<string, unknown>>;
    diskSnapshotAt: string | null;
    sysproProcessSnapshot: Array<Record<string, unknown>>;
    sysproProcessSnapshotAt: string | null;
    sysproVersionSnapshot: Record<string, unknown> | null;
    sysproVersionSnapshotAt: string | null;
    windowsUpdateStatus: Record<string, unknown> | null;
    windowsUpdateStatusAt: string | null;
    rebootPending: boolean | null;
    rebootPendingAt: string | null;
    agentMetrics: Record<string, unknown> | null;
    agentMetricsAt: string | null;
    metricsHistory: Array<{
      collectedAt: string;
      cpuLoadPct: number | null;
      memoryUsedPct: number | null;
      memoryUsedMB: number | null;
      memoryTotalMB: number | null;
    }>;
  };
  moduleSettings: RemoteHostDetailsModuleSettings;
  companyOptions: Array<{
    id: string;
    label: string;
    searchText?: string;
  }>;
  installGuide: Array<{
    id: RemoteAgentInstallStage;
    title: string;
    description: string;
    done: boolean;
  }>;
  company: {
    id: string;
    razaoSocial: string;
    nomeFantasia: string | null;
    installationDirectory: string | null;
  };
  installationContexts: Array<{
    update: RemoteHostSysproUpdateItem;
    company: RemoteCompanyContextItem | null;
  }>;
  erpInstallations: Array<{
    id: string;
    rootPath: string;
    serverPath: string | null;
    executablePath: string | null;
    configPath: string | null;
    dataPath: string | null;
    runtimeType: "SYSPRO_SERVER" | "IIS" | null;
    protocol: "HTTP" | "HTTPS" | "TCP" | null;
    hostName: string | null;
    iisApplicationPath: string | null;
    configuredPort: number | null;
    requestedPort: number | null;
    detectedPort: number | null;
    runtimeStatus: string;
    lastRuntimeCheckAt: string | null;
    version: string | null;
    serviceStatus: string | null;
    processPid: number | null;
    discoverySources: string[];
    lastSeenAt: string;
    companies: Array<{
      id: string;
      companyId: string | null;
      code: string;
      name: string;
      role: "PRIMARY" | "SECONDARY";
      active: boolean;
    }>;
  }>;
  linkedUsers: Array<{
    id: string;
    name: string | null;
    email: string;
    role: "ADMIN" | "SUPORTE" | "DEVELOPER" | "CLIENTE_ADMIN" | "CLIENTE_USER";
  }>;
  recentSessions: Array<
    RemoteSessionSummary & {
      hostName: string;
      companyName: string | null;
      requestedByName: string | null;
      createdAt: string;
      startedAt: string | null;
      endedAt: string | null;
    }
  >;
  agentCommands: Array<{
    id: string;
    type: RemoteAgentCommandType;
    status: RemoteAgentCommandStatus;
    reason: string | null;
    payload: Record<string, unknown> | null;
    attemptCount: number;
    resultMessage: string | null;
    resultPayload: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
    deliveredAt: string | null;
    executedAt: string | null;
    failedAt: string | null;
  }>;
  commandSuccessRates: {
    window24h: number;
    window7d: number;
    window30d: number;
  };
  commandTimeline: Array<{
    id: string;
    type: RemoteAgentCommandType;
    status: RemoteAgentCommandStatus;
    createdAt: string;
    deliveredAt: string | null;
    executedAt: string | null;
    failedAt: string | null;
    durationSeconds: number | null;
  }>;
};

export type RemoteDiscoveredHostDetails = {
  tenantScope: RemoteTenantScope;
  host: RemoteDiscoveredAgentItem;
  companyOptions: Array<{
    id: string;
    label: string;
    searchText?: string;
  }>;
  suggestedCompanyId: string | null;
  firstSeenAt: string;
  updatedAt: string;
};

export const remotePlatformStatusSchema = z.enum(["planned", "foundation", "in_progress", "blocked"]);
export const remoteAccessScopeSchema = z.enum(["global", "company"]);
export const remoteHostStatusSchema = z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]);
export const remoteDiscoveredHostStatusSchema = z.enum(["PENDING_LINK", "LINKED", "IGNORED"]);
export const remoteMachineProfileSchema = z.enum(["SERVER", "WORKSTATION", "TERMINAL", "BACKUP_NODE"]);
export const remoteSessionStatusSchema = z.enum(["REQUESTED", "STARTED", "ENDED", "FAILED", "CANCELLED"]);
export const remoteOperationalStatusSchema = z.enum(["ONLINE", "RECENT", "OFFLINE", "MISCONFIGURED", "SESSION_BUSY"]);
export const remoteProductStatusSchema = z.enum([
  "AWAITING_LINK",
  "PROVISIONING_REMOTE",
  "REMOTE_READY",
  "ATTENTION_REQUIRED",
  "IN_SERVICE",
]);
export const remoteAgentCommandTypeSchema = z.enum([
  "REAPPLY_ALIAS",
  "REAPPLY_CONFIG",
  "UPGRADE_CLIENT",
  "SERVICE_CONTROL",
  "ROTATE_TOKEN_REQUIRED",
]);
export const remoteAgentCommandStatusSchema = z.enum(["PENDING", "DELIVERED", "ACKNOWLEDGED", "CANCELLED", "FAILED"]);
export const remoteSessionAuditSourceSchema = z.enum(["UI", "WEBHOOK", "JOB", "AGENT", "API"]);
export const remoteSessionAuditActionSchema = z.enum([
  "REQUESTED",
  "STARTED",
  "ENDED",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
  "HOST_RESOLVED",
  "COMMENT_POSTED",
]);
export const remoteAgentInstallStageSchema = z.enum(["RUSTDESK_LINKED", "HEARTBEAT_OK"]);
export const remoteAgentLifecycleStatusSchema = z.enum([
  "PENDING_INSTALL",
  "INSTALLED",
  "ONLINE",
  "STALE",
  "UNLINKED",
]);

const remoteStringOrNullSchema = z.string().nullable();
const remoteUnknownRecordSchema = z.record(z.string(), z.unknown());
const remoteCompanyOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  searchText: z.string().optional(),
});

const remotePlatformHostOptionSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  label: z.string(),
  status: remoteHostStatusSchema,
});

const remoteLastAgentMetricsSchema = z.object({
  cpuLoad: z.number().nullable(),
  ramUsedPc: z.number().nullable(),
  diskFree: z.number().nullable(),
  diskTotal: z.number().nullable(),
  osInfo: z.string().nullable(),
});

const remoteDirectoryModuleSettingsSchema = remoteModuleSettingsSchema.extend({
  rustDeskPublicKeyHash: remoteStringOrNullSchema,
});

const remoteHostDetailsModuleSettingsSchema = remoteDirectoryModuleSettingsSchema;

export const remoteAccessPolicySchema = z.object({
  role: z.enum(["ADMIN", "SUPORTE", "DEVELOPER", "CLIENTE_ADMIN"]),
  scope: remoteAccessScopeSchema,
  description: z.string(),
});

export const remoteHostSummarySchema = z.object({
  id: z.string(),
  companyId: z.string(),
  name: z.string(),
  environment: remoteStringOrNullSchema,
  provider: remoteStringOrNullSchema,
  description: remoteStringOrNullSchema.optional(),
  notes: remoteStringOrNullSchema.optional(),
  agentExternalId: remoteStringOrNullSchema.optional(),
  machineName: remoteStringOrNullSchema.optional(),
  agentVersion: remoteStringOrNullSchema.optional(),
  status: remoteHostStatusSchema,
});

export const remoteSessionSummarySchema = z.object({
  id: z.string(),
  companyId: z.string(),
  ticketId: remoteStringOrNullSchema,
  ticketNumber: remoteStringOrNullSchema,
  hostId: z.string(),
  requestedByUserId: z.string(),
  startedByUserId: remoteStringOrNullSchema,
  status: remoteSessionStatusSchema,
});

export const remoteSessionAuditModelSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  action: remoteSessionAuditActionSchema,
  source: remoteSessionAuditSourceSchema,
  actorUserId: remoteStringOrNullSchema,
  hostId: remoteStringOrNullSchema,
  ticketNumber: remoteStringOrNullSchema,
  occurredAt: z.string(),
  summary: z.string(),
  metadata: z.string(),
});

export const remoteSessionAuditEventSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  companyId: z.string(),
  hostId: remoteStringOrNullSchema,
  ticketId: remoteStringOrNullSchema,
  ticketNumber: remoteStringOrNullSchema,
  action: remoteSessionAuditActionSchema,
  source: remoteSessionAuditSourceSchema,
  actorUserId: remoteStringOrNullSchema,
  actorName: remoteStringOrNullSchema,
  summary: z.string(),
  metadata: remoteUnknownRecordSchema.nullable(),
  occurredAt: z.string(),
});

export const remoteTenantScopeSchema = z.object({
  role: z.enum(["ADMIN", "SUPORTE", "DEVELOPER", "CLIENTE_ADMIN"]),
  isGlobalView: z.boolean(),
  companyIds: z.array(z.string()),
  companyCount: z.number(),
  summary: z.string(),
});

export const remotePlatformModuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: remotePlatformStatusSchema,
  nextStep: z.string(),
});

export const remotePlatformEndpointSchema = z.object({
  method: z.enum(["GET", "POST"]),
  path: z.string(),
  purpose: z.string(),
});

export const remotePlatformRoadmapPhaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  status: remotePlatformStatusSchema,
});

export const remoteConfiguredHostAgentSchema = z.object({
  rustdeskId: remoteStringOrNullSchema,
  machineName: remoteStringOrNullSchema,
  agentVersion: remoteStringOrNullSchema,
  lastHeartbeatAt: remoteStringOrNullSchema,
  lastHeartbeatSuccessAt: remoteStringOrNullSchema,
  lastHeartbeatErrorAt: remoteStringOrNullSchema,
  lastHeartbeatErrorMessage: remoteStringOrNullSchema,
  lastKnownIp: remoteStringOrNullSchema,
  lastRegisterAt: remoteStringOrNullSchema,
  lastRegisterSource: remoteStringOrNullSchema,
  agentTokenIssuedAt: remoteStringOrNullSchema,
  agentTokenLastUsedAt: remoteStringOrNullSchema,
  lastKnownRustDeskAlias: remoteStringOrNullSchema,
  lastKnownRustDeskVersion: remoteStringOrNullSchema,
  lastKnownRustDeskServerHost: remoteStringOrNullSchema,
  lastKnownRustDeskApiHost: remoteStringOrNullSchema,
  lastKnownRustDeskPublicKeyHash: remoteStringOrNullSchema,
  lastRustDeskConfigSyncAt: remoteStringOrNullSchema,
  lifecycleStatus: remoteAgentLifecycleStatusSchema,
  installStages: z.array(remoteAgentInstallStageSchema),
});

export const remoteConfiguredHostItemSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  companyName: remoteStringOrNullSchema,
  installationCompanies: z.array(z.string()),
  name: z.string(),
  machineProfile: remoteMachineProfileSchema.nullable(),
  environment: remoteStringOrNullSchema,
  provider: remoteStringOrNullSchema,
  status: remoteHostStatusSchema,
  description: z.string(),
  notes: remoteStringOrNullSchema,
  serviceStatus: remoteStringOrNullSchema,
  bootstrapFlow: z.enum([
    "pending_link",
    "linked_host_detected",
    "host_bootstrap_required",
    "token_invalid",
    "body_parse_failed",
    "unknown",
  ]),
  contractErrorCode: remoteStringOrNullSchema,
  bootstrapRate24hPct: z.number().nullable(),
  pendingAckQueueSize: z.number().nullable(),
  ackQueueFlushFailed: z.number().nullable(),
  lastAgentMetrics: remoteLastAgentMetricsSchema.nullable(),
  lastAgentMetricsAt: remoteStringOrNullSchema,
  openSessionCount: z.number(),
  operationalStatus: remoteOperationalStatusSchema,
  productStatus: remoteProductStatusSchema,
  lastSessionAt: remoteStringOrNullSchema,
  lastSessionStatus: remoteSessionStatusSchema.nullable(),
  lastTicketNumber: remoteStringOrNullSchema,
  agent: remoteConfiguredHostAgentSchema,
  inventorySignals: z.object({
    rebootPending: z.boolean().nullable(),
    diskLow: z.boolean(),
    sysproProcessDown: z.boolean(),
    windowsPendingCount: z.number().nullable(),
    lastExtendedSnapshotAt: remoteStringOrNullSchema,
  }),
});

export const remoteDiscoveredAgentItemSchema = z.object({
  id: z.string(),
  machineName: remoteStringOrNullSchema,
  machineProfile: remoteMachineProfileSchema.nullable(),
  rustdeskId: remoteStringOrNullSchema,
  agentVersion: remoteStringOrNullSchema,
  provider: remoteStringOrNullSchema,
  environment: remoteStringOrNullSchema,
  description: remoteStringOrNullSchema,
  serviceStatus: remoteStringOrNullSchema,
  lastHeartbeatAt: remoteStringOrNullSchema,
  status: remoteDiscoveredHostStatusSchema,
  linkedHostId: remoteStringOrNullSchema,
  suggestedCompanyId: remoteStringOrNullSchema,
  installationCompanies: z.array(z.string()),
  lastAgentMetrics: remoteLastAgentMetricsSchema.nullable(),
  lastAgentMetricsAt: remoteStringOrNullSchema,
});

export const remoteHostSysproUpdateItemSchema = z.object({
  id: z.string(),
  companyId: remoteStringOrNullSchema,
  companyLabel: z.string(),
  resolvedCompanyName: remoteStringOrNullSchema,
  path: z.string(),
  lastFileWriteAt: remoteStringOrNullSchema,
  isServerHost: z.boolean().nullable(),
  hasClientFolder: z.boolean().nullable(),
  hasDllFolder: z.boolean().nullable(),
  firebirdVersion: remoteStringOrNullSchema,
  firebirdPath: remoteStringOrNullSchema,
  lastHeartbeatAt: z.string(),
});

export const remoteCompanyContextItemSchema = z.object({
  id: z.string(),
  razaoSocial: z.string(),
  nomeFantasia: remoteStringOrNullSchema,
  serverType: z.enum(["SYSPRO_SERVER", "IIS"]).nullable(),
  serverPort: z.number().nullable(),
  serverHost: remoteStringOrNullSchema,
  serverProtocol: z.enum(["HTTP", "HTTPS"]).nullable(),
  iisIsapiPath: remoteStringOrNullSchema,
  installationDirectory: remoteStringOrNullSchema,
  remoteConnections: z.array(
    z.object({
      type: z.enum(["DDNS_NOIP", "RADMIN_VPN"]),
      details: z.string(),
    }),
  ),
  observacoes: remoteStringOrNullSchema,
});

export const remotePlatformOverviewSchema = z.object({
  title: z.string(),
  summary: z.string(),
  recommendedEngine: z.string(),
  secretVault: z.string(),
  backupStrategy: z.string(),
  companyFilterRule: z.string(),
  accessPolicies: z.array(remoteAccessPolicySchema),
  tenantScope: remoteTenantScopeSchema,
  hostModel: remoteHostSummarySchema,
  sessionModel: remoteSessionSummarySchema,
  sessionAuditModel: remoteSessionAuditModelSchema,
  modules: z.array(remotePlatformModuleSchema),
  endpoints: z.array(remotePlatformEndpointSchema),
  roadmap: z.array(remotePlatformRoadmapPhaseSchema),
  hostStats: z.object({
    total: z.number(),
    active: z.number(),
    maintenance: z.number(),
    inactive: z.number(),
  }),
  sessionStats: z.object({
    total: z.number(),
    requested: z.number(),
    started: z.number(),
    ended: z.number(),
    failed: z.number(),
  }),
  recentHosts: z.array(
    remoteHostSummarySchema.extend({
      companyName: remoteStringOrNullSchema,
      createdAt: z.string(),
      lastHeartbeatAt: remoteStringOrNullSchema,
    }),
  ),
  recentSessions: z.array(
      remoteSessionSummarySchema.extend({
        hostName: z.string(),
        companyName: remoteStringOrNullSchema,
        requestedByName: remoteStringOrNullSchema,
      createdAt: z.string(),
      startedAt: remoteStringOrNullSchema,
      endedAt: remoteStringOrNullSchema,
      }),
    ),
    companyOptions: z.array(remoteCompanyOptionSchema),
    hostOptions: z.array(remotePlatformHostOptionSchema),
  });

export const remotePlatformDirectorySchema = z.object({
  tenantScope: remoteTenantScopeSchema,
  moduleSettings: remoteDirectoryModuleSettingsSchema,
  stats: z.object({
    totalHosts: z.number(),
    activeHosts: z.number(),
    companies: z.number(),
    pendingInstall: z.number(),
    linkedAgents: z.number(),
    onlineAgents: z.number(),
    pendingDiscovery: z.number(),
  }),
  commandObservability: z.object({
    pendingTotal: z.number(),
    pendingHosts: z.number(),
    failedLast24h: z.number(),
    acknowledgedLast24h: z.number(),
    deliveredLast24h: z.number(),
    hotspots: z.array(
      z.object({
        hostId: z.string(),
        hostName: z.string(),
        companyName: remoteStringOrNullSchema,
        pendingCount: z.number(),
        failedCount: z.number(),
      }),
    ),
    successRates: z.object({
      window24h: z.number(),
      window7d: z.number(),
      window30d: z.number(),
    }),
    orchestrationMix: z.object({
      window24h: z.object({
        syncTokenFirst: z.number(),
        discoverBootstrap: z.number(),
        unknown: z.number(),
      }),
    }),
    timeline: z.array(
      z.object({
        commandId: z.string(),
        hostId: z.string(),
        hostName: z.string(),
        companyName: remoteStringOrNullSchema,
        type: remoteAgentCommandTypeSchema,
        status: remoteAgentCommandStatusSchema,
        createdAt: z.string(),
        deliveredAt: remoteStringOrNullSchema,
        executedAt: remoteStringOrNullSchema,
        failedAt: remoteStringOrNullSchema,
        durationSeconds: z.number().nullable(),
      }),
    ),
  }),
  companyOptions: z.array(remoteCompanyOptionSchema),
  pendingItems: z.array(remoteDiscoveredAgentItemSchema),
  items: z.array(remoteConfiguredHostItemSchema),
});

export const remoteHostDetailsSchema = z.object({
  tenantScope: remoteTenantScopeSchema,
  host: remoteConfiguredHostItemSchema,
  agentHealth: z.object({
    productStatus: remoteProductStatusSchema,
    lastDiscoverAt: remoteStringOrNullSchema,
    lastSyncAt: remoteStringOrNullSchema,
    bootstrapFlow: z.enum([
      "pending_link",
      "linked_host_detected",
      "host_bootstrap_required",
      "token_invalid",
      "body_parse_failed",
      "unknown",
    ]),
    consecutiveFailures: z.number(),
    agentVersion: remoteStringOrNullSchema,
    tokenSource: remoteStringOrNullSchema,
    serviceStatus: remoteStringOrNullSchema,
    contractErrorCode: remoteStringOrNullSchema,
  }),
  criticalEvents: z.array(z.object({
    id: z.string(),
    source: z.string(),
    provider: z.string(),
    eventCode: z.string(),
    severity: z.string(),
    message: z.string(),
    occurredAt: z.string(),
  })),
  agentTelemetry: z.object({
    systemSnapshot: remoteUnknownRecordSchema.nullable(),
    systemSnapshotAt: remoteStringOrNullSchema,
    networkSnapshot: remoteUnknownRecordSchema.nullable(),
    networkSnapshotAt: remoteStringOrNullSchema,
    softwareSnapshot: z.array(remoteUnknownRecordSchema),
    softwareSnapshotAt: remoteStringOrNullSchema,
    hardwareIdentity: remoteUnknownRecordSchema.nullable(),
    hardwareIdentityAt: remoteStringOrNullSchema,
    diskSnapshot: z.array(remoteUnknownRecordSchema),
    diskSnapshotAt: remoteStringOrNullSchema,
    sysproProcessSnapshot: z.array(remoteUnknownRecordSchema),
    sysproProcessSnapshotAt: remoteStringOrNullSchema,
    sysproVersionSnapshot: remoteUnknownRecordSchema.nullable(),
    sysproVersionSnapshotAt: remoteStringOrNullSchema,
    windowsUpdateStatus: remoteUnknownRecordSchema.nullable(),
    windowsUpdateStatusAt: remoteStringOrNullSchema,
    rebootPending: z.boolean().nullable(),
    rebootPendingAt: remoteStringOrNullSchema,
    agentMetrics: remoteUnknownRecordSchema.nullable(),
    agentMetricsAt: remoteStringOrNullSchema,
    metricsHistory: z.array(
      z.object({
        collectedAt: z.string(),
        cpuLoadPct: z.number().nullable(),
        memoryUsedPct: z.number().nullable(),
        memoryUsedMB: z.number().nullable(),
        memoryTotalMB: z.number().nullable(),
      }),
    ),
  }),
  moduleSettings: remoteHostDetailsModuleSettingsSchema,
  companyOptions: z.array(remoteCompanyOptionSchema),
  installGuide: z.array(
    z.object({
      id: remoteAgentInstallStageSchema,
      title: z.string(),
      description: z.string(),
      done: z.boolean(),
    }),
  ),
  company: z.object({
    id: z.string(),
    razaoSocial: z.string(),
    nomeFantasia: remoteStringOrNullSchema,
    installationDirectory: remoteStringOrNullSchema,
  }),
  installationContexts: z.array(
    z.object({
      update: remoteHostSysproUpdateItemSchema,
      company: remoteCompanyContextItemSchema.nullable(),
    }),
  ),
  erpInstallations: z.array(
    z.object({
      id: z.string(),
      rootPath: z.string(),
      serverPath: remoteStringOrNullSchema,
      executablePath: remoteStringOrNullSchema,
      configPath: remoteStringOrNullSchema,
      dataPath: remoteStringOrNullSchema,
      runtimeType: z.enum(["SYSPRO_SERVER", "IIS"]).nullable(),
      protocol: z.enum(["HTTP", "HTTPS", "TCP"]).nullable(),
      hostName: remoteStringOrNullSchema,
      iisApplicationPath: remoteStringOrNullSchema,
      configuredPort: z.number().int().nullable(),
      requestedPort: z.number().int().nullable(),
      detectedPort: z.number().int().nullable(),
      runtimeStatus: z.string(),
      lastRuntimeCheckAt: remoteStringOrNullSchema,
      version: remoteStringOrNullSchema,
      serviceStatus: remoteStringOrNullSchema,
      processPid: z.number().int().nullable(),
      discoverySources: z.array(z.string()),
      lastSeenAt: z.string(),
      companies: z.array(z.object({
        id: z.string(),
        companyId: remoteStringOrNullSchema,
        code: z.string(),
        name: z.string(),
        role: z.enum(["PRIMARY", "SECONDARY"]),
        active: z.boolean(),
      })),
    }),
  ),
  linkedUsers: z.array(
    z.object({
      id: z.string(),
      name: remoteStringOrNullSchema,
      email: z.string(),
      role: z.enum(["ADMIN", "SUPORTE", "DEVELOPER", "CLIENTE_ADMIN", "CLIENTE_USER"]),
    }),
  ),
  recentSessions: z.array(
    remoteSessionSummarySchema.extend({
      hostName: z.string(),
      companyName: remoteStringOrNullSchema,
      requestedByName: remoteStringOrNullSchema,
      createdAt: z.string(),
      startedAt: remoteStringOrNullSchema,
      endedAt: remoteStringOrNullSchema,
    }),
  ),
  agentCommands: z.array(
    z.object({
      id: z.string(),
      type: remoteAgentCommandTypeSchema,
      status: remoteAgentCommandStatusSchema,
      reason: remoteStringOrNullSchema,
      payload: remoteUnknownRecordSchema.nullable(),
      attemptCount: z.number(),
      resultMessage: remoteStringOrNullSchema,
      resultPayload: remoteUnknownRecordSchema.nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      deliveredAt: remoteStringOrNullSchema,
      executedAt: remoteStringOrNullSchema,
      failedAt: remoteStringOrNullSchema,
    }),
  ),
  commandSuccessRates: z.object({
    window24h: z.number(),
    window7d: z.number(),
    window30d: z.number(),
  }),
  commandTimeline: z.array(
    z.object({
      id: z.string(),
      type: remoteAgentCommandTypeSchema,
      status: remoteAgentCommandStatusSchema,
      createdAt: z.string(),
      deliveredAt: remoteStringOrNullSchema,
      executedAt: remoteStringOrNullSchema,
      failedAt: remoteStringOrNullSchema,
      durationSeconds: z.number().nullable(),
    }),
  ),
});

export const remoteDiscoveredHostDetailsSchema = z.object({
  tenantScope: remoteTenantScopeSchema,
  host: remoteDiscoveredAgentItemSchema,
  companyOptions: z.array(remoteCompanyOptionSchema),
  suggestedCompanyId: remoteStringOrNullSchema,
  firstSeenAt: z.string(),
  updatedAt: z.string(),
});

export const remoteSessionsGatewayResponseSchema = z.object({
  sessions: z.array(
    remoteSessionSummarySchema.extend({
      hostName: z.string(),
      companyName: remoteStringOrNullSchema,
      requestedByName: remoteStringOrNullSchema,
      createdAt: z.string(),
      startedAt: remoteStringOrNullSchema,
      endedAt: remoteStringOrNullSchema,
    }),
  ),
  pagination: paginationMetaSchema.extend({
    totalPages: z.number(),
  }),
  hostOptions: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    }),
  ),
});
