import type {
  ProcessAckInput,
  ProcessAckOutput,
  ProcessBootstrapInput,
  ProcessBootstrapOutput,
  ProcessDiscoverInput,
  ProcessDiscoverOutput,
  ProcessHeartbeatInput,
  ProcessHeartbeatOutput,
  ProcessSyncOutput,
  SyncCommandType,
  SyncCompliance,
} from "./contracts";

export type RemoteHostContext = {
  hostId: string;
};

export type SysproInventorySnapshot = {
  knownInstallations: number;
  lastFullSnapshotAt: Date | null;
};

export type ProcessedHeartbeatRecord = {
  hostId: string;
  heartbeatAt: Date;
  payload: ProcessHeartbeatInput;
  dailySnapshotMissing: boolean;
};

export interface RemoteHeartbeatPort {
  resolveHostByAgentToken(agentToken: string): Promise<RemoteHostContext | null>;
  getInventorySnapshot(hostId: string): Promise<SysproInventorySnapshot>;
  saveProcessedHeartbeat(record: ProcessedHeartbeatRecord): Promise<void>;
  logWarning(event: string, fields: Record<string, unknown>): Promise<void>;
}

export type RemoteBootstrapHostContext = {
  hostId: string;
  hostName: string;
  companyId: string;
  companyName: string;
  agentExternalId: string | null;
  machineName: string | null;
  agentVersion: string | null;
  environment: string | null;
  lastKnownIp: string | null;
};

export type RemoteBootstrapConfigProfile = {
  serverHost: string | null;
  apiHost: string | null;
  publicKey: string | null;
  publicKeyHash: string | null;
  serverConfig: string | null;
  targetVersion: string | null;
  defaultPassword: string | null;
};

export type IssuedAgentToken = {
  token: string;
  tokenHash: string;
  issuedAt: Date;
};

export type PersistedBootstrapHostSnapshot = {
  id: string;
  companyId: string;
  agentExternalId: string | null;
  machineName: string | null;
  agentVersion: string | null;
  environment: string | null;
  agentTokenIssuedAt: Date | null;
  lastKnownRustDeskAlias: string | null;
  lastKnownRustDeskVersion: string | null;
  lastKnownRustDeskServerHost: string | null;
  lastKnownRustDeskApiHost: string | null;
  lastKnownRustDeskPublicKeyHash: string | null;
  lastRustDeskConfigSyncAt: Date | null;
};

export type ProcessedBootstrapRecord = {
  host: RemoteBootstrapHostContext;
  input: ProcessBootstrapInput;
  rustdeskId: string | null;
  machineName: string | null;
  alias: string;
  configProfile: RemoteBootstrapConfigProfile;
  issuedToken: IssuedAgentToken;
  reportedPublicKeyHash: string | null;
  requestIp: string | null;
};

export interface RemoteBootstrapPort {
  resolveHostByInstallToken(installToken: string): Promise<RemoteBootstrapHostContext | null>;
  getConfigProfile(): Promise<RemoteBootstrapConfigProfile>;
  issueAgentToken(): Promise<IssuedAgentToken>;
  hashPublicKey(publicKey: string): string;
  resolveAlias(input: { hostName: string; machineName: string | null; companyName: string }): string;
  getAgentTokenExpiresAt(issuedAt: Date | null): Date | null;
  saveProcessedBootstrap(record: ProcessedBootstrapRecord): Promise<PersistedBootstrapHostSnapshot>;
  logInfo(event: string, fields: Record<string, unknown>): Promise<void>;
}

export type RemoteAckHostContext = {
  hostId: string;
  agentTokenIssuedAt: Date | null;
};

export type RemoteAckCommand = {
  id: string;
  type: string;
};

export type ProcessedAckRecord = {
  hostId: string;
  commandId: string;
  status: ProcessAckInput["status"];
  message: string | null;
  details: Record<string, unknown> | null;
  executedAt: Date;
};

export interface RemoteAckPort {
  resolveHostByAgentToken(agentToken: string): Promise<RemoteAckHostContext | null>;
  isAgentTokenExpired(issuedAt: Date | null): boolean;
  findDeliverableCommand(hostId: string, commandId: string): Promise<RemoteAckCommand | null>;
  persistAck(record: ProcessedAckRecord): Promise<void>;
  logInfo(event: string, fields: Record<string, unknown>): Promise<void>;
}

export type RemoteSyncContext = {
  hostId: string;
  companyId: string;
  hostName: string;
  companyName: string;
  companyPrimaryNames: string[];
  agentExternalId: string | null;
  machineName: string | null;
  agentVersion: string | null;
  serviceStatus: string | null;
  lastKnownIp: string | null;
  lastKnownRustDeskAlias: string | null;
  lastKnownRustDeskVersion: string | null;
  lastKnownRustDeskServerHost: string | null;
  lastKnownRustDeskApiHost: string | null;
  lastKnownRustDeskPublicKeyHash: string | null;
  agentTokenIssuedAt: Date | null;
  agentTokenLastUsedAt: Date | null;
};

export type RemoteSyncConfigProfile = {
  serverHost: string | null;
  apiHost: string | null;
  publicKey: string | null;
  publicKeyHash: string | null;
  serverConfig: string | null;
  targetVersion: string | null;
};

export type RemoteSyncIncomingUpdate = {
  companyLabel: string;
  path: string;
  lastFileWriteAt: Date | null;
};

export type SyncCommandDirective = {
  action: "reapply_alias" | "reapply_config" | "upgrade_client";
  reason: string;
  payload: Record<string, unknown> | null;
};

export type PersistedSyncHostSnapshot = {
  id: string;
  agentExternalId: string | null;
  machineName: string | null;
  agentVersion: string | null;
  lastHeartbeatSuccessAt: Date | null;
  agentTokenIssuedAt: Date | null;
  agentTokenLastUsedAt: Date | null;
  lastKnownRustDeskAlias: string | null;
  lastKnownRustDeskVersion: string | null;
  lastKnownRustDeskServerHost: string | null;
  lastKnownRustDeskApiHost: string | null;
  lastKnownRustDeskPublicKeyHash: string | null;
  lastRustDeskConfigSyncAt: Date | null;
};

export type PersistedSyncCommand = {
  id: string;
  type: SyncCommandType;
  status: "DELIVERED";
  reason: string | null;
  payload: Record<string, unknown> | null;
  attemptCount: number;
  createdAt: Date;
  deliveredAt: Date | null;
};

export type ProcessedSyncRecord = {
  context: RemoteSyncContext;
  heartbeatAt: Date;
  ip: string | null;
  rustdeskId: string | null;
  machineName: string | null;
  agentVersion: string | null;
  serviceStatus: string | null;
  reportedAlias: string | null;
  reportedVersion: string | null;
  reportedServerHost: string | null;
  reportedApiHost: string | null;
  reportedPublicKeyHash: string | null;
  normalizedSysproUpdates: RemoteSyncIncomingUpdate[];
  syncDirectives: SyncCommandDirective[];
  compliance: SyncCompliance;
};

export type PersistedSyncResult = {
  host: PersistedSyncHostSnapshot;
  pendingCommands: PersistedSyncCommand[];
};

export interface RemoteSyncPort {
  resolveSyncContextByAgentToken(agentToken: string): Promise<RemoteSyncContext | null>;
  isAgentTokenExpired(issuedAt: Date | null): boolean;
  getAgentTokenExpiresAt(issuedAt: Date | null): Date | null;
  getConfigProfile(): Promise<RemoteSyncConfigProfile>;
  hashPublicKey(publicKey: string): string;
  normalizeRustdeskId(value: string | null | undefined): string | null;
  normalizeSysproUpdates(value: unknown): RemoteSyncIncomingUpdate[];
  resolveAlias(input: { hostName: string; machineName: string | null; companyName: string }): string;
  getInventorySnapshot(hostId: string): Promise<SysproInventorySnapshot>;
  persistSync(record: ProcessedSyncRecord): Promise<PersistedSyncResult>;
  logInfo(event: string, fields: Record<string, unknown>): Promise<void>;
  logWarning(event: string, fields: Record<string, unknown>): Promise<void>;
}

export type RemoteDiscoverTransitionMap = Record<
  "pending_link" | "linked_host_detected" | "host_installer_required",
  {
    state: string;
    nextStep: string;
    nextEndpoint: string;
    allowDiscoveryHeartbeat: boolean;
    requiresHostInstaller: boolean;
  }
>;

export type RemoteDiscoverExistingHost = {
  id: string;
  linkedHostId: string | null;
  linkedAt: Date | null;
};

export type RemoteDiscoverLinkedHost = {
  id: string;
  name: string;
  agentTokenHash: string | null;
  lastHeartbeatErrorMessage: string | null;
};

export type ProcessedDiscoverPayload = {
  machineName: string | null;
  agentExternalId: string | null;
  agentVersion: string | null;
  environment: string | null;
  provider: string;
  description: string | null;
  serviceStatus: string | null;
  installationsSnapshot: unknown;
  lastHeartbeatAt: Date;
  linkedAt?: Date | null;
  status: "PENDING_LINK" | "LINKED";
};

export interface RemoteDiscoverPort {
  getExpectedDiscoveryToken(): string | null;
  normalizeRustdeskId(value: string | null | undefined): string | null;
  normalizeSysproUpdates(value: unknown): ProcessDiscoverInput["sysproUpdates"];
  serializeSysproUpdatesSnapshot(updates: ProcessDiscoverInput["sysproUpdates"]): unknown;
  getTransitions(): RemoteDiscoverTransitionMap;
  findDiscoveredHost(input: { rustdeskId: string | null; machineName: string | null }): Promise<RemoteDiscoverExistingHost | null>;
  findLinkedHost(linkedHostId: string): Promise<RemoteDiscoverLinkedHost | null>;
  updateDiscoveredHost(id: string, payload: ProcessedDiscoverPayload): Promise<{ id: string }>;
  createDiscoveredHost(payload: ProcessedDiscoverPayload): Promise<{ id: string }>;
  logInfo(event: string, fields: Record<string, unknown>): Promise<void>;
  logWarning(event: string, fields: Record<string, unknown>): Promise<void>;
  logError(event: string, fields?: Record<string, unknown>): Promise<void>;
}

export interface TrilinkRemoteDomain {
  processHeartbeat(payload: unknown): Promise<ProcessHeartbeatOutput>;
  processBootstrap(payload: unknown): Promise<ProcessBootstrapOutput>;
  processAck(payload: unknown): Promise<ProcessAckOutput>;
  processSync(payload: unknown): Promise<ProcessSyncOutput>;
  processDiscover(payload: unknown): Promise<ProcessDiscoverOutput>;
}
