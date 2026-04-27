import type { RemoteModuleSettings } from "./remote-module-settings.types";
import type { PaginationMeta } from "../shared/pagination.types";

type RemoteDirectoryModuleSettings = RemoteModuleSettings & {
  rustDeskPublicKeyHash: string | null;
};

type RemoteHostDetailsModuleSettings = Pick<
  RemoteModuleSettings,
  "rustDeskServerHost" | "rustDeskVersion"
> & {
  rustDeskPublicKeyHash: string | null;
};

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

export type RemoteConfiguredHostItem = {
  id: string;
  companyId: string;
  companyName: string | null;
  installationCompanies: string[];
  name: string;
  machineProfile: RemoteMachineProfile | null;
  environment: string | null;
  provider: string | null;
  rustdeskId: string | null;
  status: RemoteHostStatus;
  description: string;
  notes: string | null;
  machineName: string | null;
  agentVersion: string | null;
  serviceStatus: string | null;
  lastHeartbeatAt: string | null;
  lastHeartbeatSuccessAt: string | null;
  lastHeartbeatErrorAt: string | null;
  lastHeartbeatErrorMessage: string | null;
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
  lastKnownIp: string | null;
  lastAgentMetrics: {
    cpuLoad: number | null;
    ramUsedPc: number | null;
    diskFree: number | null;
    osInfo: string | null;
  } | null;
  lastAgentMetricsAt: string | null;
  lastRegisterAt: string | null;
  lastRegisterSource: string | null;
  agentTokenIssuedAt: string | null;
  agentTokenLastUsedAt: string | null;
  openSessionCount: number;
  operationalStatus: RemoteOperationalStatus;
  productStatus: RemoteProductStatus;
  lastSessionAt: string | null;
  lastSessionStatus: RemoteSessionStatus | null;
  lastTicketNumber: string | null;
  agent: {
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
  inventorySignals: {
    rebootPending: boolean | null;
    diskLow: boolean;
    sysproProcessDown: boolean;
    windowsPendingCount: number | null;
    lastExtendedSnapshotAt: string | null;
  };
};

export type RemoteDiscoveredHostItem = {
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
  installationCompanies: string[];
  lastAgentMetrics: {
    cpuLoad: number | null;
    ramUsedPc: number | null;
    diskFree: number | null;
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
  pendingItems: RemoteDiscoveredHostItem[];
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
    windowsUpdateStatus: Record<string, unknown> | null;
    windowsUpdateStatusAt: string | null;
    rebootPending: boolean | null;
    rebootPendingAt: string | null;
    agentMetrics: Record<string, unknown> | null;
    agentMetricsAt: string | null;
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
