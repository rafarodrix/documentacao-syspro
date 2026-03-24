export type RemotePlatformStatus = "planned" | "foundation" | "in_progress" | "blocked";

export type RemoteAccessScope = "global" | "company";

export type RemoteAccessPolicy = {
  role: "ADMIN" | "SUPORTE" | "DEVELOPER" | "CLIENTE_ADMIN";
  scope: RemoteAccessScope;
  description: string;
};

export type RemoteHostStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export type RemoteSessionStatus = "REQUESTED" | "STARTED" | "ENDED" | "FAILED" | "CANCELLED";
export type RemoteOperationalStatus = "ONLINE" | "RECENT" | "OFFLINE" | "MISCONFIGURED" | "SESSION_BUSY";
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
  | "TOKEN_READY"
  | "SCRIPT_READY"
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
  installToken?: string | null;
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
  }>;
  hostOptions: Array<{
    id: string;
    companyId: string;
    label: string;
    status: RemoteHostStatus;
  }>;
};

export type RemoteConfiguredHostItem = {
  id: string;
  companyId: string;
  companyName: string | null;
  name: string;
  environment: string | null;
  provider: string | null;
  rustdeskId: string | null;
  status: RemoteHostStatus;
  description: string;
  notes: string | null;
  installToken: string | null;
  machineName: string | null;
  agentVersion: string | null;
  lastHeartbeatAt: string | null;
  openSessionCount: number;
  operationalStatus: RemoteOperationalStatus;
  lastSessionAt: string | null;
  lastSessionStatus: RemoteSessionStatus | null;
  lastTicketNumber: string | null;
  agent: {
    installToken: string | null;
    rustdeskId: string | null;
    machineName: string | null;
    agentVersion: string | null;
    lastHeartbeatAt: string | null;
    lifecycleStatus: RemoteAgentLifecycleStatus;
    installStages: RemoteAgentInstallStage[];
    installerPath: string;
  };
};

export type RemotePlatformDirectory = {
  tenantScope: RemoteTenantScope;
  stats: {
    totalHosts: number;
    activeHosts: number;
    companies: number;
    pendingInstall: number;
    linkedAgents: number;
    onlineAgents: number;
  };
  companyOptions: Array<{
    id: string;
    label: string;
  }>;
  items: RemoteConfiguredHostItem[];
};

export type RemoteHostDetails = {
  host: RemoteConfiguredHostItem;
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
    cnpj: string;
    emailContato: string | null;
    telefone: string | null;
    observacoes: string | null;
  };
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
};
