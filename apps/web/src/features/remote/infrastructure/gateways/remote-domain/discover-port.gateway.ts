import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  normalizeRustdeskId,
  normalizeSysproUpdates,
  serializeSysproUpdatesSnapshot,
} from "@/features/remote/application/agent-payload";
import type { RemoteDiscoverPort, RemoteDiscoverTransitionMap } from "@dosc-syspro/remote-domain";

type RemoteLogger = {
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
};

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}

export function createRemoteDiscoverPort(params: {
  logger: RemoteLogger;
  transitions: RemoteDiscoverTransitionMap;
}): RemoteDiscoverPort {
  const { logger, transitions } = params;

  return {
    getExpectedDiscoveryToken() {
      return process.env.REMOTE_DISCOVERY_TOKEN?.trim() || null;
    },
    normalizeRustdeskId(value: string | null | undefined) {
      return normalizeRustdeskId(value) ?? null;
    },
    normalizeSysproUpdates(value: unknown) {
      return normalizeSysproUpdates(value).map((entry) => ({
        companyLabel: entry.companyLabel,
        path: entry.path,
        lastFileWriteAt: entry.lastFileWriteAt?.toISOString() ?? null,
      }));
    },
    serializeSysproUpdatesSnapshot(updates) {
      const normalizedUpdates = normalizeSysproUpdates(updates);
      return serializeSysproUpdatesSnapshot(
        normalizedUpdates.map((entry) => ({
          companyLabel: entry.companyLabel,
          path: entry.path,
          lastFileWriteAt: entry.lastFileWriteAt ? new Date(entry.lastFileWriteAt) : null,
        })),
      );
    },
    getTransitions() {
      return transitions;
    },
    async findDiscoveredHost(input) {
      const discoveredHost = await prisma.remoteDiscoveredHost.findFirst({
        where: input.rustdeskId
          ? {
              OR: [{ agentExternalId: input.rustdeskId }, ...(input.machineName ? [{ machineName: input.machineName }] : [])],
            }
          : { machineName: input.machineName ?? undefined },
        orderBy: [{ updatedAt: "desc" }],
      });

      if (!discoveredHost) return null;

      return {
        id: discoveredHost.id,
        linkedHostId: discoveredHost.linkedHostId,
        linkedAt: discoveredHost.linkedAt,
      };
    },
    async findLinkedHost(linkedHostId: string) {
      const linkedHost = await prisma.remoteHost.findFirst({
        where: { id: linkedHostId },
        select: {
          id: true,
          name: true,
          agentTokenHash: true,
          lastHeartbeatErrorMessage: true,
        },
      });

      return linkedHost;
    },
    async updateDiscoveredHost(id, payload) {
      const record = await prisma.remoteDiscoveredHost.update({
        where: { id },
        data: {
          machineName: payload.machineName,
          agentExternalId: payload.agentExternalId,
          agentVersion: payload.agentVersion,
          environment: payload.environment,
          provider: payload.provider,
          description: payload.description,
          serviceStatus: payload.serviceStatus,
          installationsSnapshot: toJsonValue(payload.installationsSnapshot),
          lastHeartbeatAt: payload.lastHeartbeatAt,
          linkedAt: payload.linkedAt ?? undefined,
          status: payload.status,
        },
        select: { id: true },
      });

      return record;
    },
    async createDiscoveredHost(payload) {
      const record = await prisma.remoteDiscoveredHost.create({
        data: {
          machineName: payload.machineName,
          agentExternalId: payload.agentExternalId,
          agentVersion: payload.agentVersion,
          environment: payload.environment,
          provider: payload.provider,
          description: payload.description,
          serviceStatus: payload.serviceStatus,
          installationsSnapshot: toJsonValue(payload.installationsSnapshot),
          lastHeartbeatAt: payload.lastHeartbeatAt,
          status: payload.status,
        },
        select: { id: true },
      });

      return record;
    },
    async logInfo(event: string, fields: Record<string, unknown>) {
      logger.info(event, fields);
    },
    async logWarning(event: string, fields: Record<string, unknown>) {
      logger.warn(event, fields);
    },
    async logError(event: string, fields?: Record<string, unknown>) {
      logger.error(event, fields);
    },
  };
}
