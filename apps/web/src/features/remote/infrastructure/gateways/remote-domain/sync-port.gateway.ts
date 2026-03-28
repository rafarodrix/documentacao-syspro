import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRemoteModuleSettingsSnapshot } from "@/features/remote/application/module-settings-server";
import { getRemoteAgentTokenExpiresAt, isRemoteAgentTokenExpired } from "@/features/remote/application/agent-token";
import {
  buildRustDeskConfigProfile,
  hashAgentToken,
  hashRustDeskPublicKey,
  normalizeRustdeskId,
  resolveRustDeskAlias,
} from "@/features/remote/application/rustdesk-sync";
import {
  normalizeCompareValue,
  normalizeSysproUpdates,
  syncRemoteHostSysproUpdates,
} from "@/features/remote/application/agent-payload";
import type { PersistedSyncResult, RemoteSyncPort } from "@dosc-syspro/remote-domain";

type RemoteLogger = {
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
};

const COMMAND_TYPE_MAP = {
  reapply_alias: "REAPPLY_ALIAS",
  reapply_config: "REAPPLY_CONFIG",
  upgrade_client: "UPGRADE_CLIENT",
  rotate_token_required: "ROTATE_TOKEN_REQUIRED",
} as const;

type CommandTypeValue = (typeof COMMAND_TYPE_MAP)[keyof typeof COMMAND_TYPE_MAP];

function isCommandTypeValue(value: string): value is CommandTypeValue {
  return (
    value === "REAPPLY_ALIAS" ||
    value === "REAPPLY_CONFIG" ||
    value === "UPGRADE_CLIENT" ||
    value === "ROTATE_TOKEN_REQUIRED"
  );
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}

function mapDeliveredCommandType(value: string): "REAPPLY_ALIAS" | "REAPPLY_CONFIG" | "UPGRADE_CLIENT" | "ROTATE_TOKEN_REQUIRED" {
  if (value === "REAPPLY_ALIAS" || value === "REAPPLY_CONFIG" || value === "UPGRADE_CLIENT" || value === "ROTATE_TOKEN_REQUIRED") {
    return value;
  }

  return "REAPPLY_CONFIG";
}

function toRecordPayload(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const normalized = JSON.parse(JSON.stringify(value));
  if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) return null;
  return normalized as Record<string, unknown>;
}
export async function revokeExpiredSyncAgentToken(agentToken: string | null | undefined) {
  const token = agentToken?.trim();
  if (!token) return;

  const tokenHash = hashAgentToken(token);
  const host = await prisma.remoteHost.findFirst({
    where: { agentTokenHash: tokenHash },
    select: { id: true },
  });

  if (!host) return;

  await prisma.remoteHost.update({
    where: { id: host.id },
    data: {
      agentTokenHash: null,
      agentTokenIssuedAt: null,
      agentTokenLastUsedAt: null,
      lastHeartbeatErrorAt: new Date(),
      lastHeartbeatErrorMessage: "agentToken expirado durante sync. Execute o bootstrap novamente.",
    },
  });
}

export function createRemoteSyncPort(params: { logger: RemoteLogger; requestIp: string | null }): RemoteSyncPort {
  const { logger, requestIp } = params;

  return {
    async resolveSyncContextByAgentToken(agentToken: string) {
      const tokenHash = hashAgentToken(agentToken);
      const host = await prisma.remoteHost.findFirst({
        where: { agentTokenHash: tokenHash },
        include: {
          company: {
            select: {
              nomeFantasia: true,
              razaoSocial: true,
            },
          },
        },
      });

      if (!host) return null;

      const companyName = host.company.nomeFantasia ?? host.company.razaoSocial;

      return {
        hostId: host.id,
        companyId: host.companyId,
        hostName: host.name,
        companyName,
        companyPrimaryNames: [normalizeCompareValue(host.company.nomeFantasia), normalizeCompareValue(host.company.razaoSocial)].filter(
          (name): name is string => Boolean(name),
        ),
        agentExternalId: host.agentExternalId,
        machineName: host.machineName,
        agentVersion: host.agentVersion,
        serviceStatus: host.serviceStatus,
        lastKnownIp: host.lastKnownIp,
        lastKnownRustDeskAlias: host.lastKnownRustDeskAlias,
        lastKnownRustDeskVersion: host.lastKnownRustDeskVersion,
        lastKnownRustDeskServerHost: host.lastKnownRustDeskServerHost,
        lastKnownRustDeskApiHost: host.lastKnownRustDeskApiHost,
        lastKnownRustDeskPublicKeyHash: host.lastKnownRustDeskPublicKeyHash,
        agentTokenIssuedAt: host.agentTokenIssuedAt,
        agentTokenLastUsedAt: host.agentTokenLastUsedAt,
      };
    },
    isAgentTokenExpired(issuedAt: Date | null) {
      return isRemoteAgentTokenExpired(issuedAt);
    },
    getAgentTokenExpiresAt(issuedAt: Date | null) {
      return getRemoteAgentTokenExpiresAt(issuedAt);
    },
    async getConfigProfile() {
      const settings = await getRemoteModuleSettingsSnapshot();
      const configProfile = buildRustDeskConfigProfile(settings);
      return {
        serverHost: configProfile.serverHost,
        apiHost: configProfile.apiHost,
        publicKey: configProfile.publicKey,
        publicKeyHash: configProfile.publicKeyHash,
        serverConfig: configProfile.serverConfig,
        targetVersion: configProfile.targetVersion,
      };
    },
    hashPublicKey(publicKey: string) {
      return hashRustDeskPublicKey(publicKey);
    },
    normalizeRustdeskId(value: string | null | undefined) {
      return normalizeRustdeskId(value) ?? null;
    },
    normalizeSysproUpdates(value: unknown) {
      return normalizeSysproUpdates(value).map((entry) => ({
        companyLabel: entry.companyLabel,
        path: entry.path,
        lastFileWriteAt: entry.lastFileWriteAt,
      }));
    },
    resolveAlias(input) {
      return resolveRustDeskAlias({
        hostName: input.hostName,
        machineName: input.machineName,
        companyName: input.companyName,
      });
    },
    async getInventorySnapshot(hostId: string) {
      const [inventorySnapshot] = await prisma.$queryRaw<Array<{ lastFullSyncAt: Date | null; knownInstallations: bigint }>>`
        SELECT
          MAX("lastHeartbeatAt") AS "lastFullSyncAt",
          COUNT(*)::bigint AS "knownInstallations"
        FROM "remote_host_syspro_update"
        WHERE "hostId" = ${hostId}
      `;

      return {
        knownInstallations: Number(inventorySnapshot?.knownInstallations ?? 0),
        lastFullSnapshotAt: inventorySnapshot?.lastFullSyncAt ?? null,
      };
    },
    async persistSync(record) {
      const result = await prisma.$transaction(async (tx) => {
        const hostUpdateData: Prisma.RemoteHostUpdateInput & Record<string, unknown> = {
          agentExternalId: record.rustdeskId || record.context.agentExternalId,
          machineName: record.machineName || record.context.machineName,
          agentVersion: record.agentVersion || record.context.agentVersion,
          lastHeartbeatAt: record.heartbeatAt,
          lastHeartbeatSuccessAt: record.heartbeatAt,
          lastHeartbeatErrorAt: null,
          lastHeartbeatErrorMessage: null,
          lastKnownIp: requestIp || record.context.lastKnownIp,
          agentTokenLastUsedAt: record.heartbeatAt,
          serviceStatus: record.serviceStatus || record.context.serviceStatus,
          lastKnownRustDeskAlias: record.reportedAlias || record.context.lastKnownRustDeskAlias,
          lastKnownRustDeskVersion: record.reportedVersion || record.context.lastKnownRustDeskVersion,
          lastKnownRustDeskServerHost: record.reportedServerHost || record.context.lastKnownRustDeskServerHost,
          lastKnownRustDeskApiHost: record.reportedApiHost || record.context.lastKnownRustDeskApiHost,
          lastKnownRustDeskPublicKeyHash: record.reportedPublicKeyHash || record.context.lastKnownRustDeskPublicKeyHash,
          lastRustDeskConfigSyncAt: record.heartbeatAt,
          lastSystemSnapshot: record.systemSnapshot ? toJsonValue(record.systemSnapshot) : undefined,
          lastSystemSnapshotAt: record.systemSnapshot ? record.heartbeatAt : undefined,
          lastNetworkSnapshot: record.networkSnapshot ? toJsonValue(record.networkSnapshot) : undefined,
          lastNetworkSnapshotAt: record.networkSnapshot ? record.heartbeatAt : undefined,
          lastSoftwareSnapshot: record.softwareSnapshot.length ? toJsonValue(record.softwareSnapshot) : undefined,
          lastSoftwareSnapshotAt: record.softwareSnapshot.length ? record.heartbeatAt : undefined,
          lastAgentMetrics: record.agentMetrics ? toJsonValue(record.agentMetrics) : undefined,
          lastAgentMetricsAt: record.agentMetrics ? record.heartbeatAt : undefined,
          status: "ACTIVE",
        };

        const saved = await tx.remoteHost.update({
          where: { id: record.context.hostId },
          data: hostUpdateData,
          select: {
            id: true,
            agentExternalId: true,
            machineName: true,
            agentVersion: true,
            lastHeartbeatSuccessAt: true,
            agentTokenIssuedAt: true,
            agentTokenLastUsedAt: true,
            lastKnownRustDeskAlias: true,
            lastKnownRustDeskVersion: true,
            lastKnownRustDeskServerHost: true,
            lastKnownRustDeskApiHost: true,
            lastKnownRustDeskPublicKeyHash: true,
            lastRustDeskConfigSyncAt: true,
          },
        });

        await syncRemoteHostSysproUpdates(tx, {
          hostId: record.context.hostId,
          hostCompanyId: record.context.companyId,
          hostCompanyNames: record.context.companyPrimaryNames,
          heartbeatAt: record.heartbeatAt,
          sysproUpdates: record.normalizedSysproUpdates,
        });

        const existingCommands = await tx.remoteAgentCommand.findMany({
          where: {
            hostId: record.context.hostId,
            status: {
              in: ["PENDING", "DELIVERED"],
            },
          },
        });

        const desiredTypes = record.syncDirectives.map((directive) => COMMAND_TYPE_MAP[directive.action]) as CommandTypeValue[];

        for (const command of existingCommands) {
          if (
            command.status === "PENDING" &&
            (!isCommandTypeValue(command.type) ||
              (command.type !== "ROTATE_TOKEN_REQUIRED" && !desiredTypes.includes(command.type as CommandTypeValue)))
          ) {
            await tx.remoteAgentCommand.update({
              where: { id: command.id },
              data: {
                status: "CANCELLED",
                reason: "Comando cancelado porque a divergencia deixou de existir no ultimo sync.",
              },
            });
          }
        }

        const existingPendingTypes = new Set(
          existingCommands.filter((command) => command.status === "PENDING").map((command) => command.type),
        );

        for (const directive of record.syncDirectives) {
          const type = COMMAND_TYPE_MAP[directive.action];
          if (existingPendingTypes.has(type)) continue;

          await tx.remoteAgentCommand.create({
            data: {
              hostId: record.context.hostId,
              type,
              status: "PENDING",
              reason: directive.reason,
              payload: directive.payload ? toJsonValue(directive.payload) : Prisma.JsonNull,
            },
          });
        }

        const deliverableCommands = await tx.remoteAgentCommand.findMany({
          where: {
            hostId: record.context.hostId,
            status: {
              in: ["PENDING", "DELIVERED"],
            },
          },
          orderBy: [{ createdAt: "asc" }],
          take: 20,
        });

        for (const command of deliverableCommands) {
          if (command.status !== "PENDING") continue;
          await tx.remoteAgentCommand.update({
            where: { id: command.id },
            data: {
              status: "DELIVERED",
              deliveredAt: command.deliveredAt ?? record.heartbeatAt,
              attemptCount: {
                increment: 1,
              },
            },
          });
        }

        const returnedCommands = await tx.remoteAgentCommand.findMany({
          where: {
            hostId: record.context.hostId,
            status: {
              in: ["DELIVERED"],
            },
          },
          orderBy: [{ createdAt: "asc" }],
          take: 20,
        });

        const pendingCommands: PersistedSyncResult["pendingCommands"] = returnedCommands.map((command) => ({
          id: command.id,
          type: mapDeliveredCommandType(command.type),
          status: "DELIVERED",
          reason: command.reason,
          payload: toRecordPayload(command.payload),
          attemptCount: command.attemptCount,
          createdAt: command.createdAt,
          deliveredAt: command.deliveredAt,
        }));

        return {
          host: saved,
          pendingCommands,
        };
      });

      return result;
    },
    async logInfo(event: string, fields: Record<string, unknown>) {
      logger.info(event, fields);
    },
    async logWarning(event: string, fields: Record<string, unknown>) {
      logger.warn(event, fields);
    },
  };
}
