import { z } from "zod";
import { REMOTE_AGENT_ACK_REASON_CODES, type RemoteAgentAckReasonCode } from "./ack-reason-codes";

export const AGENT_DISCOVER_SCHEMA_VERSION = "discover.payload.v1" as const;
export const AGENT_SYNC_SCHEMA_VERSION = "sync.payload.v1" as const;
export const AGENT_ACK_SCHEMA_VERSION = "ack.payload.v1" as const;

export const sysproUpdateSchema = z.object({
  companyLabel: z.string().min(1),
  path: z.string().min(1),
  lastFileWriteAt: z.string().datetime().nullable().optional(),
  isServerHost: z.boolean().optional(),
  hasClientFolder: z.boolean().optional(),
  hasDllFolder: z.boolean().optional(),
  firebirdVersion: z.string().trim().nullable().optional(),
  firebirdPath: z.string().trim().nullable().optional(),
});

export const processHeartbeatInputSchema = z.object({
  agentToken: z.string().min(1),
  rustdeskId: z.string().trim().min(1).nullable().optional(),
  machineName: z.string().trim().min(1).nullable().optional(),
  agentVersion: z.string().trim().min(1).nullable().optional(),
  currentAlias: z.string().trim().min(1).nullable().optional(),
  currentVersion: z.string().trim().min(1).nullable().optional(),
  serverHost: z.string().trim().min(1).nullable().optional(),
  apiHost: z.string().trim().min(1).nullable().optional(),
  publicKey: z.string().trim().min(1).nullable().optional(),
  serviceStatus: z.string().trim().min(1).nullable().optional(),
  sysproUpdates: z.array(sysproUpdateSchema).default([]),
  metadata: z
    .object({
      ip: z.string().trim().min(1).nullable().optional(),
      userAgent: z.string().trim().min(1).nullable().optional(),
      correlationId: z.string().trim().min(1).nullable().optional(),
    })
    .optional(),
});

export const processBootstrapInputSchema = z
  .object({
    installToken: z.string().trim().min(1).optional(),
    discoveryToken: z.string().trim().min(1).optional(),
    discoveredHostId: z.string().trim().min(1).optional(),
    rustdeskId: z.string().trim().min(1).nullable().optional(),
    machineName: z.string().trim().min(1).nullable().optional(),
    agentVersion: z.string().trim().min(1).nullable().optional(),
    environment: z.string().trim().min(1).nullable().optional(),
    currentAlias: z.string().trim().min(1).nullable().optional(),
    currentVersion: z.string().trim().min(1).nullable().optional(),
    serverHost: z.string().trim().min(1).nullable().optional(),
    apiHost: z.string().trim().min(1).nullable().optional(),
    publicKey: z.string().trim().min(1).nullable().optional(),
    metadata: z
      .object({
        ip: z.string().trim().min(1).nullable().optional(),
        userAgent: z.string().trim().min(1).nullable().optional(),
        correlationId: z.string().trim().min(1).nullable().optional(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    const hasInstallToken = !!value.installToken?.trim();
    const hasDiscoveryBootstrap = !!value.discoveryToken?.trim() && !!value.discoveredHostId?.trim();

    if (!hasInstallToken && !hasDiscoveryBootstrap) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "installToken or discovery bootstrap credentials are required",
        path: ["installToken"],
      });
    }
  });

export const processAckInputSchema = z.object({
  schemaVersion: z.literal(AGENT_ACK_SCHEMA_VERSION),
  agentToken: z.string().trim().min(1),
  commandId: z.string().trim().min(1),
  status: z.enum(["ACKNOWLEDGED", "FAILED"]),
  reasonCode: z.enum(REMOTE_AGENT_ACK_REASON_CODES).nullable().optional(),
  message: z.string().trim().nullable().optional(),
  details: z.record(z.string(), z.unknown()).nullable().optional(),
  metadata: z
    .object({
      ip: z.string().trim().min(1).nullable().optional(),
      userAgent: z.string().trim().min(1).nullable().optional(),
      correlationId: z.string().trim().min(1).nullable().optional(),
    })
    .optional(),
});


export const processSyncInputSchema = z.object({
  schemaVersion: z.literal(AGENT_SYNC_SCHEMA_VERSION),
  agentToken: z.string().trim().min(1),
  rustdeskId: z.string().trim().min(1).nullable().optional(),
  machineName: z.string().trim().min(1).nullable().optional(),
  agentVersion: z.string().trim().min(1).nullable().optional(),
  currentAlias: z.string().trim().min(1).nullable().optional(),
  currentVersion: z.string().trim().min(1).nullable().optional(),
  serverHost: z.string().trim().min(1).nullable().optional(),
  apiHost: z.string().trim().min(1).nullable().optional(),
  publicKey: z.string().trim().min(1).nullable().optional(),
  serviceStatus: z.string().trim().min(1).nullable().optional(),
  sysproUpdates: z.unknown().optional(),
  systemSnapshot: z.unknown().optional(),
  networkSnapshot: z.unknown().optional(),
  softwareSnapshot: z.unknown().optional(),
  hardwareIdentity: z.unknown().optional(),
  diskSnapshot: z.unknown().optional(),
  sysproProcesses: z.unknown().optional(),
  sysproVersions: z.unknown().optional(),
  sysproRuntimeProbes: z.unknown().optional(),
  windowsUpdateStatus: z.unknown().optional(),
  allServicesSnapshot: z.unknown().optional(),
  rebootPending: z.unknown().optional(),
  agentMetrics: z.unknown().optional(),
  criticalEvents: z.unknown().optional(),
  metadata: z
    .object({
      ip: z.string().trim().min(1).nullable().optional(),
      userAgent: z.string().trim().min(1).nullable().optional(),
      correlationId: z.string().trim().min(1).nullable().optional(),
    })
    .optional(),
});
export const processDiscoverInputSchema = z.object({
  schemaVersion: z.literal(AGENT_DISCOVER_SCHEMA_VERSION),
  discoveryToken: z.string().trim().min(1),
  rustdeskId: z.string().trim().min(1).nullable().optional(),
  machineName: z.string().trim().min(1).nullable().optional(),
  agentVersion: z.string().trim().min(1).nullable().optional(),
  serviceStatus: z.string().trim().min(1).nullable().optional(),
  environment: z.string().trim().min(1).nullable().optional(),
  provider: z.string().trim().min(1).nullable().optional(),
  description: z.string().trim().min(1).nullable().optional(),
  sysproUpdates: z.unknown().optional(),
  systemMetrics: z.unknown().optional(),
  metadata: z
    .object({
      ip: z.string().trim().min(1).nullable().optional(),
      userAgent: z.string().trim().min(1).nullable().optional(),
      correlationId: z.string().trim().min(1).nullable().optional(),
    })
    .optional(),
});


const sessionScopeSchema = z.object({
  isGlobalView: z.boolean(),
  companyIds: z.array(z.string().trim().min(1)).default([]),
});

const sessionActorSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.string().trim().min(1),
  name: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
});

export const listSessionsInputSchema = z.object({
  scope: sessionScopeSchema,
});

export const createSessionInputSchema = z.object({
  actor: sessionActorSchema,
  scope: sessionScopeSchema,
  companyId: z.string().trim().min(1),
  hostId: z.string().trim().min(1),
  ticketId: z.string().trim().nullable().optional(),
  ticketNumber: z.string().trim().nullable().optional(),
  reason: z.string().trim().nullable().optional(),
});

export const startSessionInputSchema = z.object({
  actor: sessionActorSchema,
  scope: sessionScopeSchema,
  sessionId: z.string().trim().min(1),
});

export const stopSessionInputSchema = z.object({
  actor: sessionActorSchema,
  scope: sessionScopeSchema,
  sessionId: z.string().trim().min(1),
});
export type ProcessHeartbeatInput = z.infer<typeof processHeartbeatInputSchema>;
export type ProcessBootstrapInput = z.infer<typeof processBootstrapInputSchema>;
export type ProcessAckInput = z.infer<typeof processAckInputSchema>;
export type ProcessSyncInput = z.infer<typeof processSyncInputSchema>;
export type ProcessDiscoverInput = z.infer<typeof processDiscoverInputSchema>;
export type ListSessionsInput = z.infer<typeof listSessionsInputSchema>;
export type CreateSessionInput = z.infer<typeof createSessionInputSchema>;
export type StartSessionInput = z.infer<typeof startSessionInputSchema>;
export type StopSessionInput = z.infer<typeof stopSessionInputSchema>;

export type DailySnapshotPolicy = {
  dayStartIso: string;
  knownInstallations: number;
  lastFullSnapshotAtIso: string | null;
  requiresDailySnapshot: boolean;
};

export type BootstrapCompliance = {
  aliasMatch: boolean;
  versionMatch: boolean;
  serverHostMatch: boolean;
  apiHostMatch: boolean;
  publicKeyMatch: boolean;
};

export type SyncCompliance = BootstrapCompliance;

export type SyncCommandType = "REAPPLY_ALIAS" | "REAPPLY_CONFIG" | "UPGRADE_CLIENT" | "UPGRADE_RUSTDESK" | "UPGRADE_AGENT" | "SERVICE_CONTROL" | "ROTATE_TOKEN_REQUIRED";

export type SyncCommandQueueItem = {
  id: string;
  type: SyncCommandType;
  status: "DELIVERED";
  reason: string | null;
  payload: Record<string, unknown> | null;
  attemptCount: number;
  createdAt: string;
  deliveredAt: string | null;
};

export type ProcessHeartbeatOutput = {
  hostId: string;
  accepted: true;
  syncPolicy: DailySnapshotPolicy;
  warnings: string[];
};

export type ProcessBootstrapOutput = {
  contractVersion: "rustdesk.bootstrap.v1";
  bootstrapMode: "host" | "discovery";
  hostId: string | null;
  companyId: string | null;
  companyName: string | null;
  alias: string;
  rustdeskId: string | null;
  machineName: string | null;
  agentToken: string | null;
  agentTokenIssuedAt: string | null;
  agentTokenExpiresAt: string | null;
  serverHost: string | null;
  apiHost: string | null;
  publicKey: string | null;
  publicKeyHash: string | null;
  serverConfig: string | null;
  targetVersion: string | null;
  defaultPassword: string | null;
  autoInstall: boolean;
  autoUpgrade: boolean;
  installerUrl: string | null;
  installerChecksumSha256: string | null;
  installerPackageType: string | null;
  installerSilentArgs: string | null;
  restartServiceAfterApply: boolean;
  suppressTrayShortcuts: boolean;
  hideTray: boolean;
  hideStopService: boolean;
  allowRemoteConfigModification: boolean;
  allowD3DRender: boolean;
  enableDirectXCapture: boolean;
  compliance: BootstrapCompliance;
  flow: {
    stage: "BOOTSTRAPPED" | "AWAITING_LINK";
    nextStep: "call_sync_with_agent_token" | "continue_discover_until_linked";
    nextEndpoint: "/api/remote/rustdesk/sync" | "/api/remote/agents/discover";
    discoverRole: "triage_only";
  };
  actions: Array<"bootstrap_complete" | "await_link">;
};

export type ProcessAckOutput = {
  commandId: string;
  status: "ACKNOWLEDGED" | "FAILED";
  reasonCode: RemoteAgentAckReasonCode;
  executedAt: string;
};

export type DiscoverTransitionKey = "pending_link" | "linked_host_detected" | "host_bootstrap_required" | "token_invalid";

export type DiscoverTransition = {
  state: string;
  nextStep: string;
  nextEndpoint: string;
  allowDiscoveryHeartbeat: boolean;
  requiresAuthenticatedBootstrap: boolean;
};

export type ProcessDiscoverOutput = {
  contractVersion: "discover.v2";
  mode: "pending" | "linked";
  discoveredHostId: string;
  hostId?: string;
  hostName?: string;
  installToken?: string;
  heartbeatAuth: "discoveryToken" | "agentToken";
  bootstrapFlow: DiscoverTransitionKey;
  transition: DiscoverTransition;
  message: string;
};

export type ProcessSyncOutput = {
  contractVersion: "rustdesk.sync.v1";
  hostId: string;
  companyId: string;
  companyName: string;
  alias: string;
  rustdeskId: string | null;
  machineName: string | null;
  currentAgentVersion: string | null;
  lastHeartbeatSuccessAt: string | null;
  agentTokenIssuedAt: string | null;
  agentTokenLastUsedAt: string | null;
  agentTokenExpiresAt: string | null;
  expectedConfig: {
    serverHost: string | null;
    apiHost: string | null;
    publicKey: string | null;
    publicKeyHash: string | null;
      serverConfig: string | null;
      targetVersion: string | null;
      autoInstall: boolean;
      autoUpgrade: boolean;
      installerUrl: string | null;
      installerChecksumSha256: string | null;
      installerPackageType: string | null;
      installerSilentArgs: string | null;
      restartServiceAfterApply: boolean;
      suppressTrayShortcuts: boolean;
      hideTray: boolean;
      hideStopService: boolean;
      allowRemoteConfigModification: boolean;
      allowD3DRender: boolean;
      enableDirectXCapture: boolean;
    };
  reportedConfig: {
    alias: string | null;
    version: string | null;
    serverHost: string | null;
    apiHost: string | null;
    publicKeyHash: string | null;
    lastSyncAt: string | null;
  };
  compliance: SyncCompliance;
  syncPolicy: {
    dailySysproSnapshotRequired: boolean;
    dayStart: string;
    lastFullSysproSnapshotAt: string | null;
  };
  warnings: string[];
  actions: Array<"reapply_alias" | "reapply_config" | "upgrade_client" | "upgrade_agent" | "rotate_token_required">;
  commandQueue: SyncCommandQueueItem[];
  flow: {
    stage: "SYNC_ACTIVE";
    discoverRole: "triage_only";
  };
};



export type SessionSerializedRecord = Record<string, unknown>;

export type ListSessionsOutput = {
  sessions: SessionSerializedRecord[];
};

export type CreateSessionOutput = {
  session: SessionSerializedRecord;
};

export type StartSessionOutput = {
  session: SessionSerializedRecord;
};

export type StopSessionOutput = {
  session: SessionSerializedRecord;
};

// -----------------------------------------------------------------------------
// Host/Admin + Address Book (INFRA-027D)
// -----------------------------------------------------------------------------

const hostStatusSchema = z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]);
const hostMachineProfileSchema = z.enum(["SERVER", "WORKSTATION", "TERMINAL", "BACKUP_NODE"]);

export const linkDiscoveredHostInputSchema = z.object({
  scope: sessionScopeSchema,
  discoveredHostId: z.string().trim().min(1),
  companyId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
});

export const createHostInputSchema = z.object({
  scope: sessionScopeSchema,
  companyId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  machineName: z.string().trim().nullable().optional(),
  machineProfile: hostMachineProfileSchema.nullable().optional(),
  environment: z.string().trim().nullable().optional(),
  provider: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  agentExternalId: z.string().trim().nullable().optional(),
  status: hostStatusSchema.optional(),
});

export const updateHostInputSchema = z.object({
  scope: sessionScopeSchema,
  hostId: z.string().trim().min(1),
  companyId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  machineName: z.string().trim().nullable().optional(),
  machineProfile: hostMachineProfileSchema.nullable().optional(),
  environment: z.string().trim().nullable().optional(),
  provider: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  agentExternalId: z.string().trim().nullable().optional(),
  status: hostStatusSchema.optional(),
});

export const deleteHostInputSchema = z.object({
  scope: sessionScopeSchema,
  hostId: z.string().trim().min(1),
});

export const ignoreDiscoveredHostInputSchema = z.object({
  scope: sessionScopeSchema,
  discoveredHostId: z.string().trim().min(1),
});

export const reactivateDiscoveredHostInputSchema = z.object({
  scope: sessionScopeSchema,
  discoveredHostId: z.string().trim().min(1),
});

export const hostAgentTokenInputSchema = z.object({
  scope: sessionScopeSchema,
  hostId: z.string().trim().min(1),
});

export const relinkHostSysproUpdateInputSchema = z.object({
  scope: sessionScopeSchema,
  hostId: z.string().trim().min(1),
  updateId: z.string().trim().min(1),
  companyId: z.string().trim().nullable().optional(),
  mode: z.enum(["replace", "add"]).optional(),
});

export const listAddressBookInputSchema = z.object({
  scope: sessionScopeSchema,
});

export const listAddressBookCredentialsInputSchema = z.object({});

export const createAddressBookCredentialInputSchema = z.object({
  label: z.string().trim().min(1),
  integrationKey: z.string().trim().nullable().optional(),
  scope: z.enum(["GLOBAL", "COMPANY"]).optional(),
  companyId: z.string().trim().nullable().optional(),
  expiresInDays: z.number().nullable().optional(),
  actorUserId: z.string().trim().min(1),
});

export const rotateAddressBookCredentialInputSchema = z.object({
  credentialId: z.string().trim().min(1),
  actorUserId: z.string().trim().min(1),
});

export const revokeAddressBookCredentialInputSchema = z.object({
  credentialId: z.string().trim().min(1),
  actorUserId: z.string().trim().min(1),
});

export type LinkDiscoveredHostInput = z.infer<typeof linkDiscoveredHostInputSchema>;
export type CreateHostInput = z.infer<typeof createHostInputSchema>;
export type UpdateHostInput = z.infer<typeof updateHostInputSchema>;
export type DeleteHostInput = z.infer<typeof deleteHostInputSchema>;
export type IgnoreDiscoveredHostInput = z.infer<typeof ignoreDiscoveredHostInputSchema>;
export type ReactivateDiscoveredHostInput = z.infer<typeof reactivateDiscoveredHostInputSchema>;
export type HostAgentTokenInput = z.infer<typeof hostAgentTokenInputSchema>;
export type RelinkHostSysproUpdateInput = z.infer<typeof relinkHostSysproUpdateInputSchema>;
export type ListAddressBookInput = z.infer<typeof listAddressBookInputSchema>;
export type ListAddressBookCredentialsInput = z.infer<typeof listAddressBookCredentialsInputSchema>;
export type CreateAddressBookCredentialInput = z.infer<typeof createAddressBookCredentialInputSchema>;
export type RotateAddressBookCredentialInput = z.infer<typeof rotateAddressBookCredentialInputSchema>;
export type RevokeAddressBookCredentialInput = z.infer<typeof revokeAddressBookCredentialInputSchema>;

export type HostSerializedRecord = Record<string, unknown>;
export type SysproUpdateSerializedRecord = Record<string, unknown>;
export type AddressBookItem = Record<string, unknown>;
export type AddressBookCredentialSerializedRecord = Record<string, unknown>;

export type LinkDiscoveredHostOutput = {
  hostId: string;
  discoveredHostId: string;
  created: boolean;
};

export type CreateHostOutput = {
  host: HostSerializedRecord;
};

export type UpdateHostOutput = {
  host: HostSerializedRecord;
};

export type DeleteHostOutput = {
  deleted: true;
};

export type IgnoreDiscoveredHostOutput = {
  ignored: true;
  discoveredHostId: string;
};

export type ReactivateDiscoveredHostOutput = {
  reactivated: true;
  discoveredHostId: string;
};

export type RotateHostAgentTokenOutput = {
  host: HostSerializedRecord;
  message: string;
};

export type RotateHostInstallTokenOutput = {
  host: HostSerializedRecord;
  message: string;
};

export type RevokeHostAgentTokenOutput = {
  host: HostSerializedRecord;
  message: string;
};

export type RelinkHostSysproUpdateOutput = {
  update: SysproUpdateSerializedRecord;
};

export type ListAddressBookOutput = {
  items: AddressBookItem[];
  total: number;
};

export type ListAddressBookCredentialsOutput = {
  credentials: AddressBookCredentialSerializedRecord[];
};

export type CreateAddressBookCredentialOutput = {
  credential: AddressBookCredentialSerializedRecord;
};

export type RotateAddressBookCredentialOutput = {
  credential: AddressBookCredentialSerializedRecord;
};

export type RevokeAddressBookCredentialOutput = {
  revoked: boolean;
  alreadyRevoked: boolean;
  message: string;
};
