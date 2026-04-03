import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import {
  normalizeCompareValue,
  normalizeSysproUpdates,
  prisma,
  serializeSysproUpdatesSnapshot,
  syncRemoteHostSysproUpdates,
} from "@dosc-syspro/database";
import { getRemoteAgentTokenExpiresAt, isRemoteAgentTokenExpired } from "@dosc-syspro/remote-domain";
import type {
  RemoteAckPort,
  RemoteBootstrapPort,
  RemoteDiscoverPort,
  RemoteSyncPort,
} from "@dosc-syspro/remote-domain";
import { createRemoteSessionPort as createSharedRemoteSessionPort } from "./remote-session-port";
// Componentes de configuracao compartilhados (copiados do app-web)
const REMOTE_MODULE_SETTINGS_KEY = "remote.module.settings";

const DEFAULT_REMOTE_MODULE_SETTINGS = {
  rustDeskServerHost: "acesso.trilinksoftware.com.br",
  rustDeskServerConfig:
    "==Qfi0TVnZTc3YHT1EldidXbJhkbRBzTJ5Wc4BjR4hlN3FHMYBnYit0KIFlbwZkNiojI5V2aiwiIiojIpBXYiwiIyJmLt92YuUmchdHdm92cr5Waslmc05ybzNXZjFmI6ISehxWZyJCLiInYu02bj5SZyF2d0Z2bztmbpxWayRnLvN3clNWYiojI0N3boJye",
  rustDeskPublicKey: "",
  rustDeskVersion: "1.4.6",
  heartbeatIntervalMinutes: 5,
  defaultPassword: "Trilink098",
};

type RemoteLogger = {
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
};

function normalizeRustdeskId(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\s+/g, "");
  if (!/^[0-9]{7,12}$/.test(normalized)) return null;
  if (/^0+$/.test(normalized)) return null;
  return normalized;
}

function resolveRustDeskAlias(input: { hostName: string; machineName?: string | null; companyName?: string | null }) {
  const machineName = input.machineName?.trim();
  if (machineName) return machineName;
  if (input.companyName?.trim()) return `${input.companyName.trim()} | ${input.hostName}`;
  return input.hostName;
}

const resolveAlias = resolveRustDeskAlias;

function buildAgentToken() {
  return `ragent_${randomBytes(24).toString("hex")}`;
}

function hashAgentToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function hashRustDeskPublicKey(publicKey: string) {
  return createHash("sha256").update(publicKey.trim(), "utf8").digest("hex");
}

const isAgentTokenExpired = isRemoteAgentTokenExpired;
const getAgentTokenExpiresAt = getRemoteAgentTokenExpiresAt;

async function getRemoteModuleSettingsSnapshot() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: REMOTE_MODULE_SETTINGS_KEY },
      select: { value: true },
    });

    if (!setting?.value) {
      return DEFAULT_REMOTE_MODULE_SETTINGS;
    }

    const parsed = JSON.parse(setting.value);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.rustDeskServerHost === "string" &&
      typeof parsed.rustDeskServerConfig === "string" &&
      typeof parsed.rustDeskVersion === "string" &&
      typeof parsed.heartbeatIntervalMinutes === "number" &&
      typeof parsed.defaultPassword === "string"
    ) {
      return {
        rustDeskServerHost: parsed.rustDeskServerHost.trim() || DEFAULT_REMOTE_MODULE_SETTINGS.rustDeskServerHost,
        rustDeskServerConfig: parsed.rustDeskServerConfig.trim() || DEFAULT_REMOTE_MODULE_SETTINGS.rustDeskServerConfig,
        rustDeskPublicKey: (parsed.rustDeskPublicKey || "").trim(),
        rustDeskVersion: parsed.rustDeskVersion.trim() || DEFAULT_REMOTE_MODULE_SETTINGS.rustDeskVersion,
        heartbeatIntervalMinutes: Number(parsed.heartbeatIntervalMinutes) || DEFAULT_REMOTE_MODULE_SETTINGS.heartbeatIntervalMinutes,
        defaultPassword: parsed.defaultPassword.trim() || DEFAULT_REMOTE_MODULE_SETTINGS.defaultPassword,
      };
    }

    return DEFAULT_REMOTE_MODULE_SETTINGS;
  } catch {
    return DEFAULT_REMOTE_MODULE_SETTINGS;
  }
}

function buildRustDeskConfigProfile(settings: {
  rustDeskServerHost: string;
  rustDeskServerConfig: string;
  rustDeskPublicKey: string;
  rustDeskVersion: string;
  defaultPassword: string;
}) {
  const serverHost = settings.rustDeskServerHost.trim();
  const publicKey = settings.rustDeskPublicKey.trim();
  const upgradeDownloadUrl = process.env.REMOTE_RUSTDESK_UPGRADE_URL?.trim() || null;
  const upgradeChecksumSha256 = process.env.REMOTE_RUSTDESK_UPGRADE_SHA256?.trim().toLowerCase() || null;
  const upgradePackageType = process.env.REMOTE_RUSTDESK_UPGRADE_PACKAGE_TYPE?.trim().toLowerCase() || "binary";
  const upgradeSilentArgs = process.env.REMOTE_RUSTDESK_UPGRADE_SILENT_ARGS?.trim() || "/S";

  return {
    serverHost,
    apiHost: serverHost,
    publicKey,
    publicKeyHash: publicKey ? hashRustDeskPublicKey(publicKey) : null,
    serverConfig: settings.rustDeskServerConfig.trim(),
    targetVersion: settings.rustDeskVersion.trim(),
    defaultPassword: settings.defaultPassword,
    upgradeDownloadUrl,
    upgradeChecksumSha256,
    upgradePackageType,
    upgradeSilentArgs,
  };
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}

export function createRemoteDiscoverPort(params: {
  logger: RemoteLogger;
  transitions: Record<string, unknown>;
}): RemoteDiscoverPort {
  const { logger, transitions } = params;

  return {
    getExpectedDiscoveryToken() {
      return process.env.REMOTE_DISCOVERY_TOKEN?.trim() || null;
    },
    normalizeRustdeskId,
    normalizeSysproUpdates,
    serializeSysproUpdatesSnapshot,
    getTransitions() {
      return transitions as any;
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
    async findLinkedHost(linkedHostId) {
      return prisma.remoteHost.findFirst({
        where: { id: linkedHostId },
        select: {
          id: true,
          name: true,
          agentTokenHash: true,
          lastHeartbeatErrorMessage: true,
        },
      });
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
    async logInfo(event, fields) {
      logger.info(event, fields);
    },
    async logWarning(event, fields) {
      logger.warn(event, fields);
    },
    async logError(event, fields) {
      logger.error(event, fields);
    },
  };
}

export function createRemoteBootstrapPort(params: { logger: RemoteLogger; requestIp: string | null }): RemoteBootstrapPort {
  const { logger, requestIp } = params;

  return {
    async resolveHostByInstallToken(installToken) {
      const host = await prisma.remoteHost.findFirst({
        where: { installToken },
        select: {
          id: true,
          name: true,
          companyId: true,
          agentExternalId: true,
          machineName: true,
          agentVersion: true,
          environment: true,
          lastKnownIp: true,
          company: {
            select: {
              nomeFantasia: true,
              razaoSocial: true,
            },
          },
        },
      });

      if (!host) return null;

      return {
        hostId: host.id,
        hostName: host.name,
        companyId: host.companyId,
        companyName: host.company.nomeFantasia || host.company.razaoSocial,
        agentExternalId: host.agentExternalId,
        machineName: host.machineName,
        agentVersion: host.agentVersion,
        environment: host.environment,
        lastKnownIp: host.lastKnownIp,
      };
    },
    async getConfigProfile() {
      const settings = await getRemoteModuleSettingsSnapshot();
      return buildRustDeskConfigProfile(settings);
    },
    async issueAgentToken() {
      const token = buildAgentToken();
      const issuedAt = new Date();
      return {
        token,
        tokenHash: hashAgentToken(token),
        issuedAt,
      };
    },
    hashPublicKey: hashRustDeskPublicKey,
    resolveAlias,
    getAgentTokenExpiresAt: getRemoteAgentTokenExpiresAt,
    async saveProcessedBootstrap({ host, input, rustdeskId, machineName, alias, configProfile, issuedToken, reportedPublicKeyHash }) {
      const persisted = await prisma.remoteHost.update({
        where: { id: host.hostId },
        data: {
          agentExternalId: rustdeskId,
          machineName,
          agentVersion: input.agentVersion || host.agentVersion,
          environment: input.environment || host.environment,
          agentTokenHash: issuedToken.tokenHash,
          agentTokenIssuedAt: issuedToken.issuedAt,
          lastKnownRustDeskAlias: alias,
          lastKnownRustDeskVersion: configProfile.targetVersion,
          lastKnownRustDeskServerHost: configProfile.serverHost,
          lastKnownRustDeskApiHost: configProfile.apiHost,
          lastKnownRustDeskPublicKeyHash: reportedPublicKeyHash,
          lastRustDeskConfigSyncAt: new Date(),
          status: "ACTIVE",
        },
      });

      return {
        id: persisted.id,
        companyId: host.companyId,
        agentExternalId: rustdeskId,
        machineName,
        agentVersion: input.agentVersion || host.agentVersion,
        environment: input.environment || host.environment,
        agentTokenIssuedAt: issuedToken.issuedAt,
        lastKnownRustDeskAlias: alias,
        lastKnownRustDeskVersion: configProfile.targetVersion,
        lastKnownRustDeskServerHost: configProfile.serverHost,
        lastKnownRustDeskApiHost: configProfile.apiHost,
        lastKnownRustDeskPublicKeyHash: reportedPublicKeyHash,
        lastRustDeskConfigSyncAt: persisted.lastRustDeskConfigSyncAt,
      };
    },
    async logInfo(event, fields) {
      logger.info(event, fields);
    },
  };
}

export async function revokeExpiredSyncAgentToken(agentToken?: string | null) {
  const token = agentToken?.trim();
  if (!token) return;

  const tokenHash = hashAgentToken(token);
  const host = await prisma.remoteHost.findFirst({ where: { agentTokenHash: tokenHash }, select: { id: true } });
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

  function mapDeliveredCommandType(value: string): "REAPPLY_ALIAS" | "REAPPLY_CONFIG" | "UPGRADE_CLIENT" | "ROTATE_TOKEN_REQUIRED" {
    if (["REAPPLY_ALIAS", "REAPPLY_CONFIG", "UPGRADE_CLIENT", "ROTATE_TOKEN_REQUIRED"].includes(value)) {
      return value as "REAPPLY_ALIAS" | "REAPPLY_CONFIG" | "UPGRADE_CLIENT" | "ROTATE_TOKEN_REQUIRED";
    }
    return "REAPPLY_CONFIG";
  }

  function toRecordPayload(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const normalized = JSON.parse(JSON.stringify(value));
    if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) return null;
    return normalized as Record<string, unknown>;
  }

  const COMMAND_TYPE_MAP = {
    reapply_alias: "REAPPLY_ALIAS",
    reapply_config: "REAPPLY_CONFIG",
    upgrade_client: "UPGRADE_CLIENT",
    rotate_token_required: "ROTATE_TOKEN_REQUIRED",
  } as const;

  return {
    async resolveSyncContextByAgentToken(agentToken) {
      const tokenHash = hashAgentToken(agentToken);
      const host = await prisma.remoteHost.findFirst({
        where: { agentTokenHash: tokenHash },
        include: {
          company: { select: { nomeFantasia: true, razaoSocial: true } },
        },
      });
      if (!host) return null;

      const companyName = host.company.nomeFantasia ?? host.company.razaoSocial;
      return {
        hostId: host.id,
        companyId: host.companyId,
        hostName: host.name,
        companyName,
        companyPrimaryNames: [normalizeCompareValue(host.company.nomeFantasia), normalizeCompareValue(host.company.razaoSocial)].filter(Boolean),
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
    isAgentTokenExpired,
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
        upgradeDownloadUrl: configProfile.upgradeDownloadUrl,
        upgradeChecksumSha256: configProfile.upgradeChecksumSha256,
        upgradePackageType: configProfile.upgradePackageType,
        upgradeSilentArgs: configProfile.upgradeSilentArgs,
      };
    },
    hashPublicKey: hashRustDeskPublicKey,
    normalizeRustdeskId,
    normalizeSysproUpdates,
    resolveAlias,
    getAgentTokenExpiresAt: getRemoteAgentTokenExpiresAt,
    async getInventorySnapshot(hostId) {
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
      logger.info("remote.domain.sync.inventory_ext_received", {
        hostId: record.context.hostId,
        hasHardwareIdentity: !!record.hardwareIdentity,
        diskSnapshotCount: record.diskSnapshot.length,
        sysproProcessCount: record.sysproProcesses.length,
        hasWindowsUpdateStatus: !!record.windowsUpdateStatus,
        rebootPending: record.rebootPending,
      });

      const result = await prisma.$transaction(async (tx) => {
        const saved = await tx.remoteHost.update({
          where: { id: record.context.hostId },
          data: {
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
            lastHardwareIdentity: record.hardwareIdentity ? toJsonValue(record.hardwareIdentity) : undefined,
            lastHardwareIdentityAt: record.hardwareIdentity ? record.heartbeatAt : undefined,
            lastDiskSnapshot: record.diskSnapshot.length ? toJsonValue(record.diskSnapshot) : undefined,
            lastDiskSnapshotAt: record.diskSnapshot.length ? record.heartbeatAt : undefined,
            lastSysproProcessSnapshot: record.sysproProcesses.length ? toJsonValue(record.sysproProcesses) : undefined,
            lastSysproProcessSnapshotAt: record.sysproProcesses.length ? record.heartbeatAt : undefined,
            lastWindowsUpdateStatus: record.windowsUpdateStatus ? toJsonValue(record.windowsUpdateStatus) : undefined,
            lastWindowsUpdateStatusAt: record.windowsUpdateStatus ? record.heartbeatAt : undefined,
            lastRebootPending: typeof record.rebootPending === "boolean" ? record.rebootPending : undefined,
            lastRebootPendingAt: typeof record.rebootPending === "boolean" ? record.heartbeatAt : undefined,
            lastAgentMetrics: record.agentMetrics ? toJsonValue(record.agentMetrics) : undefined,
            lastAgentMetricsAt: record.agentMetrics ? record.heartbeatAt : undefined,
            status: "ACTIVE",
          },
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
            status: { in: ["PENDING", "DELIVERED"] },
          },
        });

        const desiredTypes = record.syncDirectives.map((directive) => COMMAND_TYPE_MAP[directive.action]) as Array<"REAPPLY_ALIAS" | "REAPPLY_CONFIG" | "UPGRADE_CLIENT" | "ROTATE_TOKEN_REQUIRED">;
        for (const command of existingCommands) {
          if (
            command.status === "PENDING" &&
            (!Object.values(COMMAND_TYPE_MAP).includes(command.type as any) ||
              (command.type !== "ROTATE_TOKEN_REQUIRED" && !desiredTypes.includes(command.type as any)))
          ) {
            await tx.remoteAgentCommand.update({
              where: { id: command.id },
              data: { status: "CANCELLED", reason: "Comando cancelado porque a divergencia deixou de existir no ultimo sync." },
            });
          }
        }

        const existingPendingTypes = new Set(existingCommands.filter((command) => command.status === "PENDING").map((command) => command.type));

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
            status: { in: ["PENDING", "DELIVERED"] },
          },
          orderBy: [{ createdAt: "asc" }],
          take: 20,
        });

        for (const command of deliverableCommands) {
          if (command.status !== "PENDING") continue;
          await tx.remoteAgentCommand.update({
            where: { id: command.id },
            data: { status: "DELIVERED", deliveredAt: command.deliveredAt ?? record.heartbeatAt, attemptCount: { increment: 1 } },
          });
        }

        const returnedCommands = await tx.remoteAgentCommand.findMany({
          where: { hostId: record.context.hostId, status: { in: ["DELIVERED"] } },
          orderBy: [{ createdAt: "asc" }],
          take: 20,
        });

        const pendingCommands = returnedCommands.map((command) => ({
          id: command.id,
          type: mapDeliveredCommandType(command.type),
          status: "DELIVERED" as const,
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
    async logInfo(event, fields) {
      logger.info(event, fields);
    },
    async logWarning(event, fields) {
      logger.warn(event, fields);
    },
  };
}

export function createRemoteAckPort(params: { logger: RemoteLogger }): RemoteAckPort {
  const { logger } = params;

  return {
    async resolveHostByAgentToken(agentToken) {
      const tokenHash = hashAgentToken(agentToken);
      const host = await prisma.remoteHost.findFirst({
        where: { agentTokenHash: tokenHash },
        select: { id: true, agentTokenIssuedAt: true },
      });
      if (!host) return null;
      return { hostId: host.id, agentTokenIssuedAt: host.agentTokenIssuedAt };
    },
    isAgentTokenExpired,
    async findDeliverableCommand(hostId, commandId) {
      return prisma.remoteAgentCommand.findFirst({
        where: {
          hostId,
          id: commandId,
          status: { in: ["DELIVERED"] },
        },
        select: { id: true, type: true },
      });
    },
    async persistAck({ hostId, commandId, status, reasonCode, message, details, executedAt }) {
      await prisma.remoteAgentCommand.update({
        where: { id: commandId },
        data: {
          status,
          resultMessage: message,
          resultPayload: details ? toJsonValue(details) : Prisma.JsonNull,
          executedAt,
        },
      });
    },
    async logInfo(event, fields) {
      logger.info(event, fields);
    },
  };
}

type AddInternalTicketNoteFn = (input: { ticketId: string; body: string }) => Promise<void>;

let remoteSessionTicketNoteHandler: AddInternalTicketNoteFn | null = null;

export function configureRemoteSessionTicketNoteHandler(handler: AddInternalTicketNoteFn | null) {
  remoteSessionTicketNoteHandler = handler;
}

export function createRemoteSessionPort(params: { logger: RemoteLogger }) {
  return createSharedRemoteSessionPort({
    logger: params.logger,
    addInternalTicketNote: remoteSessionTicketNoteHandler ?? undefined,
  });
}
export { createRemoteHostAdminPort } from "./remote-host-admin-port";
export { createRemoteAddressBookPort } from "./remote-address-book-port";



