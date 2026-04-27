import { processSyncInputSchema, type ProcessSyncOutput } from "../remote-domain.contracts";
import type { RemoteSyncPort, SyncCommandDirective } from "../remote-domain.port";

const COMMAND_RESPONSE_MAP: Record<string, "reapply_alias" | "reapply_config" | "upgrade_client" | "rotate_token_required"> = {
  REAPPLY_ALIAS: "reapply_alias",
  REAPPLY_CONFIG: "reapply_config",
  UPGRADE_CLIENT: "upgrade_client",
  ROTATE_TOKEN_REQUIRED: "rotate_token_required",
};

function normalizeComparable(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const normalized = JSON.parse(JSON.stringify(value));
  if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) return null;
  return normalized as Record<string, unknown>;
}

function normalizeRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  const list: Array<Record<string, unknown>> = [];
  for (const entry of value) {
    const normalized = normalizeRecord(entry);
    if (!normalized) continue;
    list.push(normalized);
    if (list.length >= 200) break;
  }
  return list;
}

function normalizeOptionalRecordWithWarning(
  value: unknown,
  warningCode: string,
  warnings: string[],
): Record<string, unknown> | null {
  if (typeof value === "undefined" || value === null) return null;
  const normalized = normalizeRecord(value);
  if (normalized) return normalized;
  warnings.push(warningCode);
  return null;
}

function normalizeOptionalRecordArrayWithWarning(
  value: unknown,
  warningCode: string,
  warnings: string[],
): Array<Record<string, unknown>> {
  if (typeof value === "undefined" || value === null) return [];
  if (!Array.isArray(value)) {
    warnings.push(warningCode);
    return [];
  }
  return normalizeRecordArray(value);
}

function normalizeOptionalBooleanWithWarning(value: unknown, warningCode: string, warnings: string[]): boolean | null {
  if (typeof value === "undefined" || value === null) return null;
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
  warnings.push(warningCode);
  return null;
}

function getStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export async function processSync(
  payload: unknown,
  deps: {
    port: RemoteSyncPort;
    now?: () => Date;
  },
): Promise<ProcessSyncOutput> {
  const input = processSyncInputSchema.parse(payload);

  const context = await deps.port.resolveSyncContextByAgentToken(input.agentToken);
  if (!context) {
    throw new Error("AGENT_TOKEN_INVALID");
  }

  if (deps.port.isAgentTokenExpired(context.agentTokenIssuedAt)) {
    throw new Error("AGENT_TOKEN_EXPIRED");
  }

  const heartbeatAt = deps.now ? deps.now() : new Date();
  const configProfile = await deps.port.getConfigProfile();

  const machineName = input.machineName ?? context.machineName;
  const alias = deps.port.resolveAlias({
    hostName: context.hostName,
    machineName,
    companyName: context.companyName,
  });

  const reportedPublicKeyHash = input.publicKey ? deps.port.hashPublicKey(input.publicKey) : null;

  const reported = {
    alias: normalizeComparable(input.currentAlias),
    version: normalizeComparable(input.currentVersion),
    serverHost: normalizeComparable(input.serverHost),
    apiHost: normalizeComparable(input.apiHost),
    publicKey: normalizeComparable(input.publicKey),
  };

  const expected = {
    alias: normalizeComparable(alias),
    version: normalizeComparable(configProfile.targetVersion),
    serverHost: normalizeComparable(configProfile.serverHost),
    apiHost: normalizeComparable(configProfile.apiHost),
    publicKey: normalizeComparable(configProfile.publicKey),
  };

  const compliance = {
    aliasMatch: !reported.alias || reported.alias === expected.alias,
    versionMatch: !reported.version || reported.version === expected.version,
    serverHostMatch: !reported.serverHost || reported.serverHost === expected.serverHost,
    apiHostMatch: !reported.apiHost || reported.apiHost === expected.apiHost,
    publicKeyMatch: !reported.publicKey || reported.publicKey === expected.publicKey,
  };

  const directives: SyncCommandDirective[] = [];

  if (!compliance.aliasMatch) {
    directives.push({
      action: "reapply_alias",
      reason: "Alias reportado pelo cliente diverge do alias esperado pelo portal.",
      payload: {
        expectedAlias: alias,
        reportedAlias: input.currentAlias ?? null,
      },
    });
  }

  if (!compliance.serverHostMatch || !compliance.apiHostMatch || !compliance.publicKeyMatch) {
    directives.push({
      action: "reapply_config",
      reason: "Configuracao do cliente diverge do servidor, API ou key publica esperados.",
      payload: {
        expectedServerHost: configProfile.serverHost,
        expectedApiHost: configProfile.apiHost,
        expectedPublicKeyHash: configProfile.publicKeyHash,
        reportedServerHost: input.serverHost ?? null,
        reportedApiHost: input.apiHost ?? null,
        reportedPublicKeyHash,
      },
    });
  }

  const warnings: string[] = [];

  if (!compliance.versionMatch) {
    if (!configProfile.autoUpgrade) {
      warnings.push("SYNC_AUTO_UPGRADE_DISABLED");
    } else {
      const hasUpgradeMetadata =
        !!configProfile.upgradeDownloadUrl &&
        !!configProfile.upgradeChecksumSha256;

      if (!hasUpgradeMetadata) {
        warnings.push("SYNC_UPGRADE_METADATA_MISSING");
        await deps.port.logWarning("remote.domain.sync.upgrade_metadata_missing", {
          hostId: context.hostId,
          targetVersion: configProfile.targetVersion,
        });
      } else {
        directives.push({
          action: "upgrade_client",
          reason: "Versao reportada do cliente diverge da versao alvo configurada no portal.",
          payload: {
            targetVersion: configProfile.targetVersion,
            reportedVersion: input.currentVersion ?? null,
            downloadUrl: configProfile.upgradeDownloadUrl,
            checksumSha256: configProfile.upgradeChecksumSha256,
            packageType: configProfile.upgradePackageType ?? "binary",
            silentArgs: configProfile.upgradeSilentArgs ?? "/S",
          },
        });
      }
    }
  }

  const normalizedSysproUpdates = deps.port.normalizeSysproUpdates(input.sysproUpdates);
  const systemSnapshot = normalizeOptionalRecordWithWarning(input.systemSnapshot, "SYNC_INVALID_SYSTEM_SNAPSHOT", warnings);
  const networkSnapshot = normalizeOptionalRecordWithWarning(input.networkSnapshot, "SYNC_INVALID_NETWORK_SNAPSHOT", warnings);
  const softwareSnapshot = normalizeOptionalRecordArrayWithWarning(input.softwareSnapshot, "SYNC_INVALID_SOFTWARE_SNAPSHOT", warnings);
  const hardwareIdentity = normalizeOptionalRecordWithWarning(input.hardwareIdentity, "SYNC_INVALID_HARDWARE_IDENTITY", warnings);
  const diskSnapshot = normalizeOptionalRecordArrayWithWarning(input.diskSnapshot, "SYNC_INVALID_DISK_SNAPSHOT", warnings);
  const sysproProcesses = normalizeOptionalRecordArrayWithWarning(input.sysproProcesses, "SYNC_INVALID_SYSPRO_PROCESSES", warnings);
  const windowsUpdateStatus = normalizeOptionalRecordWithWarning(input.windowsUpdateStatus, "SYNC_INVALID_WINDOWS_UPDATE_STATUS", warnings);
  const rebootPending = normalizeOptionalBooleanWithWarning(input.rebootPending, "SYNC_INVALID_REBOOT_PENDING", warnings);
  const agentMetrics = normalizeOptionalRecordWithWarning(input.agentMetrics, "SYNC_INVALID_AGENT_METRICS", warnings);

  const inventory = await deps.port.getInventorySnapshot(context.hostId);
  const dayStart = getStartOfDay(heartbeatAt);
  const requiresDailySnapshot =
    inventory.knownInstallations > 0 &&
    (!inventory.lastFullSnapshotAt || inventory.lastFullSnapshotAt < dayStart);
  const dailySnapshotMissing = requiresDailySnapshot && normalizedSysproUpdates.length === 0;

  if (dailySnapshotMissing) {
    await deps.port.logWarning("remote.domain.sync.daily_snapshot_missing", {
      hostId: context.hostId,
      knownInstallations: inventory.knownInstallations,
      dayStart: dayStart.toISOString(),
      lastFullSnapshotAt: inventory.lastFullSnapshotAt?.toISOString() ?? null,
    });
  }

  if (requiresDailySnapshot && !dailySnapshotMissing && normalizedSysproUpdates.length > 0) {
    await deps.port.logInfo("remote.domain.sync.daily_snapshot_received", {
      hostId: context.hostId,
      knownInstallations: inventory.knownInstallations,
      dayStart: dayStart.toISOString(),
      sysproUpdatesCount: normalizedSysproUpdates.length,
    });
  }

  if (warnings.length > 0) {
    await deps.port.logWarning("remote.domain.sync.payload_warnings", {
      hostId: context.hostId,
      warnings,
    });
  }

  const persisted = await deps.port.persistSync({
    context,
    heartbeatAt,
    ip: input.metadata?.ip ?? null,
    rustdeskId: deps.port.normalizeRustdeskId(input.rustdeskId),
    machineName,
    agentVersion: input.agentVersion ?? null,
    serviceStatus: input.serviceStatus ?? null,
    reportedAlias: input.currentAlias ?? null,
    reportedVersion: input.currentVersion ?? null,
    reportedServerHost: input.serverHost ?? null,
    reportedApiHost: input.apiHost ?? null,
    reportedPublicKeyHash,
    systemSnapshot,
    networkSnapshot,
    softwareSnapshot,
    hardwareIdentity,
    diskSnapshot,
    sysproProcesses,
    windowsUpdateStatus,
    rebootPending,
    agentMetrics,
    normalizedSysproUpdates,
    syncDirectives: directives,
    compliance,
  });

  return {
    contractVersion: "rustdesk.sync.v1",
    hostId: persisted.host.id,
    companyName: context.companyName,
    alias,
    rustdeskId: persisted.host.agentExternalId,
    machineName: persisted.host.machineName,
    currentAgentVersion: persisted.host.agentVersion,
    lastHeartbeatSuccessAt: persisted.host.lastHeartbeatSuccessAt?.toISOString() ?? null,
    agentTokenIssuedAt: persisted.host.agentTokenIssuedAt?.toISOString() ?? null,
    agentTokenLastUsedAt: persisted.host.agentTokenLastUsedAt?.toISOString() ?? null,
    agentTokenExpiresAt: deps.port.getAgentTokenExpiresAt(persisted.host.agentTokenIssuedAt)?.toISOString() ?? null,
    expectedConfig: {
      serverHost: configProfile.serverHost,
      apiHost: configProfile.apiHost,
      publicKey: configProfile.publicKey,
      publicKeyHash: configProfile.publicKeyHash,
      serverConfig: configProfile.serverConfig,
      targetVersion: configProfile.targetVersion,
      autoInstall: configProfile.autoInstall,
      autoUpgrade: configProfile.autoUpgrade,
      installerUrl: configProfile.installerUrl ?? null,
      installerChecksumSha256: configProfile.installerChecksumSha256 ?? null,
      installerPackageType: configProfile.installerPackageType ?? null,
      installerSilentArgs: configProfile.installerSilentArgs ?? null,
      restartServiceAfterApply: configProfile.restartServiceAfterApply,
      suppressTrayShortcuts: configProfile.suppressTrayShortcuts,
      hideTray: configProfile.hideTray,
      hideStopService: configProfile.hideStopService,
      allowRemoteConfigModification: configProfile.allowRemoteConfigModification,
      allowD3DRender: configProfile.allowD3DRender,
      enableDirectXCapture: configProfile.enableDirectXCapture,
    },
    reportedConfig: {
      alias: persisted.host.lastKnownRustDeskAlias,
      version: persisted.host.lastKnownRustDeskVersion,
      serverHost: persisted.host.lastKnownRustDeskServerHost,
      apiHost: persisted.host.lastKnownRustDeskApiHost,
      publicKeyHash: persisted.host.lastKnownRustDeskPublicKeyHash,
      lastSyncAt: persisted.host.lastRustDeskConfigSyncAt?.toISOString() ?? null,
    },
    compliance,
    syncPolicy: {
      dailySysproSnapshotRequired: dailySnapshotMissing,
      dayStart: dayStart.toISOString(),
      lastFullSysproSnapshotAt: inventory.lastFullSnapshotAt?.toISOString() ?? null,
    },
    warnings,
    actions: persisted.pendingCommands.map((command) => COMMAND_RESPONSE_MAP[command.type]),
    commandQueue: persisted.pendingCommands.map((command) => ({
      id: command.id,
      type: command.type,
      status: command.status,
      reason: command.reason,
      payload: command.payload,
      attemptCount: command.attemptCount,
      createdAt: command.createdAt.toISOString(),
      deliveredAt: command.deliveredAt?.toISOString() ?? null,
    })),
    flow: {
      stage: "SYNC_ACTIVE",
      discoverRole: "triage_only",
    },
  };
}


