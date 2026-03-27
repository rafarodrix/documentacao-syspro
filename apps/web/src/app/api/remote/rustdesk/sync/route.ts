import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { consumeActionRateLimit } from "@/lib/security/action-rate-limit";
import { createRequestLogger } from "@/lib/observability/logger";
import { getRemoteModuleSettingsSnapshot } from "@/features/remote/application/module-settings";
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
import { createTrilinkRemote, type RemoteSyncPort } from "@dosc-syspro/remote-domain";

export const dynamic = "force-dynamic";

const COMMAND_TYPE_MAP = {
  reapply_alias: "REAPPLY_ALIAS",
  reapply_config: "REAPPLY_CONFIG",
  upgrade_client: "UPGRADE_CLIENT",
} as const;

function getRequestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }

  return request.headers.get("cf-connecting-ip")?.trim() || null;
}

async function revokeExpiredAgentToken(agentToken: string | null | undefined) {
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

export async function POST(request: Request) {
  const { logger, responseHeaders } = createRequestLogger(request, {
    area: "api",
    feature: "remote-rustdesk-sync",
  });
  const ip = getRequestIp(request);
  const rateLimit = consumeActionRateLimit({
    action: "remote-rustdesk-sync",
    ip,
    max: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit excedido para sync remoto." },
      {
        status: 429,
        headers: {
          ...responseHeaders,
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const body = await request.json();

  const syncPort: RemoteSyncPort = {
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
          Boolean,
        ) as string[],
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
      return normalizeRustdeskId(value);
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
            lastKnownIp: record.ip || record.context.lastKnownIp,
            agentTokenLastUsedAt: record.heartbeatAt,
            serviceStatus: record.serviceStatus || record.context.serviceStatus,
            lastKnownRustDeskAlias: record.reportedAlias || record.context.lastKnownRustDeskAlias,
            lastKnownRustDeskVersion: record.reportedVersion || record.context.lastKnownRustDeskVersion,
            lastKnownRustDeskServerHost: record.reportedServerHost || record.context.lastKnownRustDeskServerHost,
            lastKnownRustDeskApiHost: record.reportedApiHost || record.context.lastKnownRustDeskApiHost,
            lastKnownRustDeskPublicKeyHash: record.reportedPublicKeyHash || record.context.lastKnownRustDeskPublicKeyHash,
            lastRustDeskConfigSyncAt: record.heartbeatAt,
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
            status: {
              in: ["PENDING", "DELIVERED"],
            },
          },
        });

        const desiredTypeByAction = new Map(
          record.syncDirectives.map((directive) => [directive.action, COMMAND_TYPE_MAP[directive.action]]),
        );
        const desiredTypes = new Set(Array.from(desiredTypeByAction.values()));

        for (const command of existingCommands) {
          if (command.status === "PENDING" && !desiredTypes.has(command.type as (typeof COMMAND_TYPE_MAP)[keyof typeof COMMAND_TYPE_MAP])) {
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
              payload: directive.payload ? (directive.payload as Prisma.InputJsonValue) : Prisma.JsonNull,
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

        return {
          host: saved,
          pendingCommands: returnedCommands.map((command) => ({
            id: command.id,
            type: command.type as "REAPPLY_ALIAS" | "REAPPLY_CONFIG" | "UPGRADE_CLIENT" | "ROTATE_TOKEN_REQUIRED",
            status: command.status as "DELIVERED",
            reason: command.reason,
            payload:
              command.payload && typeof command.payload === "object" && !Array.isArray(command.payload)
                ? (command.payload as Record<string, unknown>)
                : null,
            attemptCount: command.attemptCount,
            createdAt: command.createdAt,
            deliveredAt: command.deliveredAt,
          })),
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

  const trilinkRemote = createTrilinkRemote({
    syncPort,
  });

  try {
    const data = await trilinkRemote.processSync({
      ...(typeof body === "object" && body !== null ? body : {}),
      metadata: {
        ip,
        userAgent: request.headers.get("user-agent"),
        correlationId: responseHeaders["x-correlation-id"],
      },
    });

    logger.info("remote.rustdesk.sync.succeeded", {
      hostId: data.hostId,
      actionCount: data.commandQueue.length,
    });

    return NextResponse.json(
      {
        success: true,
        data,
      },
      { headers: responseHeaders },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      const missingAgentToken = error.issues.some((issue) => issue.path.join(".") === "agentToken");
      return NextResponse.json(
        { success: false, error: missingAgentToken ? "agentToken e obrigatorio." : "Payload de sync invalido." },
        { status: 400, headers: responseHeaders },
      );
    }

    if (error instanceof Error && error.message === "AGENT_TOKEN_INVALID") {
      return NextResponse.json(
        { success: false, error: "agentToken invalido ou expirado.", code: "AGENT_TOKEN_INVALID" },
        { status: 401, headers: responseHeaders },
      );
    }

    if (error instanceof Error && error.message === "AGENT_TOKEN_EXPIRED") {
      await revokeExpiredAgentToken((body as { agentToken?: string } | null)?.agentToken);
      return NextResponse.json(
        { success: false, error: "agentToken expirado.", code: "AGENT_TOKEN_EXPIRED" },
        { status: 401, headers: responseHeaders },
      );
    }

    logger.error("remote.rustdesk.sync.unexpected_error", {
      error: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json(
      { success: false, error: "Falha inesperada no sync remoto." },
      { status: 500, headers: responseHeaders },
    );
  }
}
