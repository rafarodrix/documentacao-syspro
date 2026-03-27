import {
  processHeartbeatInputSchema,
  type ProcessHeartbeatInput,
  type ProcessHeartbeatOutput,
} from "../contracts";
import type { RemoteHeartbeatPort } from "../ports";

function getStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function normalizeInput(input: ProcessHeartbeatInput): ProcessHeartbeatInput {
  return {
    ...input,
    agentToken: input.agentToken.trim(),
    rustdeskId: input.rustdeskId?.trim() || null,
    machineName: input.machineName?.trim() || null,
    agentVersion: input.agentVersion?.trim() || null,
    currentAlias: input.currentAlias?.trim() || null,
    currentVersion: input.currentVersion?.trim() || null,
    serverHost: input.serverHost?.trim() || null,
    apiHost: input.apiHost?.trim() || null,
    publicKey: input.publicKey?.trim() || null,
    serviceStatus: input.serviceStatus?.trim() || null,
    sysproUpdates: input.sysproUpdates,
  };
}

export async function processHeartbeat(
  payload: unknown,
  deps: {
    port: RemoteHeartbeatPort;
    now?: () => Date;
  },
): Promise<ProcessHeartbeatOutput> {
  const parsed = processHeartbeatInputSchema.parse(payload);
  const input = normalizeInput(parsed);
  const heartbeatAt = deps.now ? deps.now() : new Date();

  const host = await deps.port.resolveHostByAgentToken(input.agentToken);
  if (!host) {
    throw new Error("AGENT_TOKEN_INVALID");
  }

  const snapshot = await deps.port.getInventorySnapshot(host.hostId);
  const dayStart = getStartOfDay(heartbeatAt);
  const requiresDailySnapshot =
    snapshot.knownInstallations > 0 &&
    (!snapshot.lastFullSnapshotAt || snapshot.lastFullSnapshotAt < dayStart);
  const dailySnapshotMissing = requiresDailySnapshot && input.sysproUpdates.length === 0;

  if (dailySnapshotMissing) {
    await deps.port.logWarning("remote.domain.heartbeat.daily_snapshot_missing", {
      hostId: host.hostId,
      knownInstallations: snapshot.knownInstallations,
      dayStart: dayStart.toISOString(),
      lastFullSnapshotAt: snapshot.lastFullSnapshotAt?.toISOString() ?? null,
    });
  }

  await deps.port.saveProcessedHeartbeat({
    hostId: host.hostId,
    heartbeatAt,
    payload: input,
    dailySnapshotMissing,
  });

  return {
    hostId: host.hostId,
    accepted: true,
    syncPolicy: {
      dayStartIso: dayStart.toISOString(),
      knownInstallations: snapshot.knownInstallations,
      lastFullSnapshotAtIso: snapshot.lastFullSnapshotAt?.toISOString() ?? null,
      requiresDailySnapshot,
    },
    warnings: dailySnapshotMissing ? ["DAILY_SYSPRO_SNAPSHOT_MISSING"] : [],
  };
}
