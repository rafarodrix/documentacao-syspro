export type RemotePlatformStatus = "planned" | "foundation" | "in_progress" | "blocked";

export type RemoteAccessScope = "global" | "company";

export type RemoteAccessPolicy = {
  role: "ADMIN" | "SUPORTE" | "DEVELOPER" | "CLIENTE_ADMIN";
  scope: RemoteAccessScope;
  description: string;
};

export type RemoteHostStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export type RemoteSessionStatus = "REQUESTED" | "STARTED" | "ENDED" | "FAILED" | "CANCELLED";

export type RemoteHostSummary = {
  id: string;
  companyId: string;
  name: string;
  environment: string | null;
  provider: string | null;
  status: RemoteHostStatus;
};

export type RemoteSessionSummary = {
  id: string;
  companyId: string;
  hostId: string;
  requestedByUserId: string;
  startedByUserId: string | null;
  status: RemoteSessionStatus;
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
  modules: RemotePlatformModule[];
  endpoints: RemotePlatformEndpoint[];
  roadmap: RemotePlatformRoadmapPhase[];
};
