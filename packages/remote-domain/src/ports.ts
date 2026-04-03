import type {
  CreateSessionInput,
  CreateSessionOutput,
  ListSessionsInput,
  ListSessionsOutput,
  ProcessAckInput,
  ProcessAckOutput,
  ProcessBootstrapInput,
  ProcessBootstrapOutput,
  ProcessDiscoverInput,
  ProcessDiscoverOutput,
  ProcessHeartbeatInput,
  ProcessHeartbeatOutput,
  ProcessSyncOutput,
  StartSessionOutput,
  StopSessionOutput,
  SyncCommandType,
  SyncCompliance,
  LinkDiscoveredHostInput,
  LinkDiscoveredHostOutput,
  CreateHostInput,
  CreateHostOutput,
  UpdateHostInput,
  UpdateHostOutput,
  DeleteHostInput,
  DeleteHostOutput,
  HostAgentTokenInput,
  RotateHostAgentTokenOutput,
  RotateHostInstallTokenOutput,
  RevokeHostAgentTokenOutput,
  RelinkHostSysproUpdateInput,
  RelinkHostSysproUpdateOutput,
  ListAddressBookInput,
  ListAddressBookOutput,
  ListAddressBookCredentialsInput,
  ListAddressBookCredentialsOutput,
  CreateAddressBookCredentialInput,
  CreateAddressBookCredentialOutput,
  RotateAddressBookCredentialInput,
  RotateAddressBookCredentialOutput,
  RevokeAddressBookCredentialInput,
  RevokeAddressBookCredentialOutput,
} from "./contracts";
import type { RemoteAgentAckReasonCode } from "./ack-reason-codes";

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
  reasonCode: RemoteAgentAckReasonCode;
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
  upgradeDownloadUrl?: string | null;
  upgradeChecksumSha256?: string | null;
  upgradePackageType?: string | null;
  upgradeSilentArgs?: string | null;
};

export type RemoteSyncIncomingUpdate = {
  companyLabel: string;
  path: string;
  lastFileWriteAt: Date | null;
  isServerHost?: boolean;
  hasClientFolder?: boolean;
  hasDllFolder?: boolean;
  firebirdVersion?: string | null;
  firebirdPath?: string | null;
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
  systemSnapshot: Record<string, unknown> | null;
  networkSnapshot: Record<string, unknown> | null;
  softwareSnapshot: Array<Record<string, unknown>>;
  hardwareIdentity: Record<string, unknown> | null;
  diskSnapshot: Array<Record<string, unknown>>;
  sysproProcesses: Array<Record<string, unknown>>;
  windowsUpdateStatus: Record<string, unknown> | null;
  rebootPending: boolean | null;
  agentMetrics: Record<string, unknown> | null;
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
  "pending_link" | "linked_host_detected" | "host_bootstrap_required" | "token_invalid",
  {
    state: string;
    nextStep: string;
    nextEndpoint: string;
    allowDiscoveryHeartbeat: boolean;
    requiresAuthenticatedBootstrap: boolean;
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
  systemMetrics?: unknown;
  lastHeartbeatAt: Date;
  linkedAt?: Date | null;
  status: "PENDING_LINK" | "LINKED";
};

export interface RemoteDiscoverPort {
  getExpectedDiscoveryToken(): string | null;
  normalizeRustdeskId(value: string | null | undefined): string | null;
  normalizeSysproUpdates(value: unknown): ProcessDiscoverInput["sysproUpdates"];
  normalizeSystemMetrics(value: unknown): unknown;
  serializeSysproUpdatesSnapshot(updates: ProcessDiscoverInput["sysproUpdates"]): unknown;
  getTransitions(): RemoteDiscoverTransitionMap;
  findDiscoveredHost(input: { rustdeskId: string | null; machineName: string | null }): Promise<RemoteDiscoverExistingHost | null>;
  findLinkedHost(linkedHostId: string): Promise<RemoteDiscoverLinkedHost | null>;
  updateDiscoveredHost(id: string, payload: ProcessedDiscoverPayload): Promise<{ id: string }>;
  createDiscoveredHost(payload: ProcessedDiscoverPayload): Promise<{ id: string }>;
  updateLinkedHostMetrics(hostId: string, metrics: unknown): Promise<void>;
  logInfo(event: string, fields: Record<string, unknown>): Promise<void>;
  logWarning(event: string, fields: Record<string, unknown>): Promise<void>;
  logError(event: string, fields?: Record<string, unknown>): Promise<void>;
}


export type RemoteSessionScope = ListSessionsInput["scope"];
export type RemoteSessionActor = CreateSessionInput["actor"];
export type RemoteSessionStatus = "REQUESTED" | "STARTED" | "ENDED" | "FAILED" | "CANCELLED";

export type RemoteSessionListRecord = Record<string, unknown>;
export type RemoteSessionPersistedRecord = Record<string, unknown>;

export type RemoteHostForSession = {
  id: string;
  companyId: string;
  status: string;
  agentExternalId: string | null;
};

export type RemoteOpenSessionConflict = {
  id: string;
  ticketNumber: string | null;
  record: RemoteSessionPersistedRecord;
};

export type RemoteSessionStartContext = {
  id: string;
  status: RemoteSessionStatus;
  ticketId: string | null;
  ticketNumber: string | null;
  host: { id: string; name: string; agentExternalId: string | null; status: string };
  company: { nomeFantasia: string | null; razaoSocial: string | null };
};

export type RemoteSessionStopContext = {
  id: string;
  status: RemoteSessionStatus;
  startedAt: Date | null;
  ticketId: string | null;
  ticketNumber: string | null;
  host: { name: string };
  company: { nomeFantasia: string | null; razaoSocial: string | null };
};

export interface RemoteSessionPort {
  listSessions(scope: RemoteSessionScope): Promise<RemoteSessionListRecord[]>;
  findHostForSessionCreate(input: { companyId: string; hostId: string }): Promise<RemoteHostForSession | null>;
  findOpenSessionConflict(input: {
    companyId: string;
    hostId: string;
    ticketId: string | null;
    ticketNumber: string | null;
  }): Promise<RemoteOpenSessionConflict | null>;
  createRequestedSession(input: {
    companyId: string;
    hostId: string;
    ticketId: string | null;
    ticketNumber: string | null;
    reason: string | null;
    requestedByUserId: string;
    requestedAt: Date;
    expiresAt: Date;
  }): Promise<RemoteSessionPersistedRecord>;
  findSessionForStart(input: { sessionId: string; scope: RemoteSessionScope }): Promise<RemoteSessionStartContext | null>;
  findConcurrentStartedSession(input: { hostId: string; excludeSessionId: string }): Promise<{ id: string; ticketNumber: string | null } | null>;
  updateSessionStarted(input: {
    sessionId: string;
    startedAt: Date;
    expiresAt: Date;
    startedByUserId: string;
  }): Promise<RemoteSessionPersistedRecord>;
  findSessionForStop(input: { sessionId: string; scope: RemoteSessionScope }): Promise<RemoteSessionStopContext | null>;
  updateSessionEnded(input: { sessionId: string; endedAt: Date }): Promise<RemoteSessionPersistedRecord>;
  addInternalTicketNote(input: { ticketId: string; body: string }): Promise<void>;
  logInfo(event: string, fields: Record<string, unknown>): Promise<void>;
  logWarning(event: string, fields: Record<string, unknown>): Promise<void>;
  logError(event: string, error?: unknown, fields?: Record<string, unknown>): Promise<void>;
}

export interface RemoteHostAdminPort {
  linkDiscoveredHost(input: LinkDiscoveredHostInput): Promise<LinkDiscoveredHostOutput>;
  createHost(input: CreateHostInput): Promise<CreateHostOutput>;
  updateHost(input: UpdateHostInput): Promise<UpdateHostOutput>;
  deleteHost(input: DeleteHostInput): Promise<DeleteHostOutput>;
  rotateHostAgentToken(input: HostAgentTokenInput): Promise<RotateHostAgentTokenOutput>;
  rotateHostInstallToken(input: HostAgentTokenInput): Promise<RotateHostInstallTokenOutput>;
  revokeHostAgentToken(input: HostAgentTokenInput): Promise<RevokeHostAgentTokenOutput>;
  relinkHostSysproUpdate(input: RelinkHostSysproUpdateInput): Promise<RelinkHostSysproUpdateOutput>;
}

export interface RemoteAddressBookPort {
  listAddressBook(input: ListAddressBookInput): Promise<ListAddressBookOutput>;
  listAddressBookCredentials(input: ListAddressBookCredentialsInput): Promise<ListAddressBookCredentialsOutput>;
  createAddressBookCredential(input: CreateAddressBookCredentialInput): Promise<CreateAddressBookCredentialOutput>;
  rotateAddressBookCredential(input: RotateAddressBookCredentialInput): Promise<RotateAddressBookCredentialOutput>;
  revokeAddressBookCredential(input: RevokeAddressBookCredentialInput): Promise<RevokeAddressBookCredentialOutput>;
}

export interface TrilinkRemoteDomain {
  processHeartbeat(payload: unknown): Promise<ProcessHeartbeatOutput>;
  processBootstrap(payload: unknown): Promise<ProcessBootstrapOutput>;
  processAck(payload: unknown): Promise<ProcessAckOutput>;
  processSync(payload: unknown): Promise<ProcessSyncOutput>;
  processDiscover(payload: unknown): Promise<ProcessDiscoverOutput>;
  listSessions(payload: unknown): Promise<ListSessionsOutput>;
  createSession(payload: unknown): Promise<CreateSessionOutput>;
  startSession(payload: unknown): Promise<StartSessionOutput>;
  stopSession(payload: unknown): Promise<StopSessionOutput>;
  linkDiscoveredHost(payload: unknown): Promise<LinkDiscoveredHostOutput>;
  createHost(payload: unknown): Promise<CreateHostOutput>;
  updateHost(payload: unknown): Promise<UpdateHostOutput>;
  deleteHost(payload: unknown): Promise<DeleteHostOutput>;
  rotateHostAgentToken(payload: unknown): Promise<RotateHostAgentTokenOutput>;
  rotateHostInstallToken(payload: unknown): Promise<RotateHostInstallTokenOutput>;
  revokeHostAgentToken(payload: unknown): Promise<RevokeHostAgentTokenOutput>;
  relinkHostSysproUpdate(payload: unknown): Promise<RelinkHostSysproUpdateOutput>;
  listAddressBook(payload: unknown): Promise<ListAddressBookOutput>;
  listAddressBookCredentials(payload: unknown): Promise<ListAddressBookCredentialsOutput>;
  createAddressBookCredential(payload: unknown): Promise<CreateAddressBookCredentialOutput>;
  rotateAddressBookCredential(payload: unknown): Promise<RotateAddressBookCredentialOutput>;
  revokeAddressBookCredential(payload: unknown): Promise<RevokeAddressBookCredentialOutput>;
}


