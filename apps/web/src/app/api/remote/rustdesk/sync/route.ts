import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { consumeActionRateLimit } from "@/lib/security/action-rate-limit";
import { createRequestLogger } from "@/lib/observability/logger";
import { getRemoteModuleSettingsSnapshot } from "@/features/remote/application/module-settings";
import { getRemoteAgentTokenExpiresAt, isRemoteAgentTokenExpired } from "@/features/remote/application/agent-token";
import {
  buildRustDeskConfigProfile,
  hashAgentToken,
  hashRustDeskPublicKey,
  normalizeComparableValue,
  normalizeRustdeskId,
  resolveRustDeskAlias,
} from "@/features/remote/application/rustdesk-sync";
import {
  normalizeCompareValue,
  normalizeSysproUpdates,
  syncRemoteHostSysproUpdates,
} from "@/features/remote/application/agent-payload";

export const dynamic = "force-dynamic";

const COMMAND_TYPE_MAP = {
  reapply_alias: "REAPPLY_ALIAS",
  reapply_config: "REAPPLY_CONFIG",
  upgrade_client: "UPGRADE_CLIENT",
  rotate_token_required: "ROTATE_TOKEN_REQUIRED",
} as const;

const COMMAND_RESPONSE_MAP = {
  REAPPLY_ALIAS: "reapply_alias",
  REAPPLY_CONFIG: "reapply_config",
  UPGRADE_CLIENT: "upgrade_client",
  ROTATE_TOKEN_REQUIRED: "rotate_token_required",
} as const;

type RustDeskActionName = keyof typeof COMMAND_TYPE_MAP;

function getRequestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }

  return request.headers.get("cf-connecting-ip")?.trim() || null;
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
      }
    );
  }

  const body = (await request.json()) as {
    agentToken?: string;
    rustdeskId?: string | null;
    machineName?: string | null;
    agentVersion?: string | null;
    currentAlias?: string | null;
    currentVersion?: string | null;
    serverHost?: string | null;
    apiHost?: string | null;
    publicKey?: string | null;
    serviceStatus?: string | null;
    sysproUpdates?: unknown;
  };

  const agentToken = body.agentToken?.trim();
  if (!agentToken) {
    return NextResponse.json(
      { success: false, error: "agentToken e obrigatorio." },
      { status: 400, headers: responseHeaders }
    );
  }

  const agentTokenHash = hashAgentToken(agentToken);
  const [host, settings] = await Promise.all([
    prisma.remoteHost.findFirst({
      where: { agentTokenHash },
      include: {
        company: {
          select: {
            nomeFantasia: true,
            razaoSocial: true,
          },
        },
      },
    }),
    getRemoteModuleSettingsSnapshot(),
  ]);

  if (!host) {
    return NextResponse.json(
      { success: false, error: "agentToken invalido ou expirado.", code: "AGENT_TOKEN_INVALID" },
      { status: 401, headers: responseHeaders }
    );
  }

  if (isRemoteAgentTokenExpired(host.agentTokenIssuedAt)) {
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

    return NextResponse.json(
      { success: false, error: "agentToken expirado.", code: "AGENT_TOKEN_EXPIRED" },
      { status: 401, headers: responseHeaders }
    );
  }

  const configProfile = buildRustDeskConfigProfile(settings);
  const alias = resolveRustDeskAlias({
    hostName: host.name,
    machineName: body.machineName?.trim() || host.machineName,
    companyName: host.company.nomeFantasia ?? host.company.razaoSocial,
  });
  const heartbeatAt = new Date();
  const sysproUpdates = normalizeSysproUpdates(body.sysproUpdates);
  const normalizedPrimaryNames = [
    normalizeCompareValue(host.company.nomeFantasia),
    normalizeCompareValue(host.company.razaoSocial),
  ].filter(Boolean);

  const reported = {
    alias: normalizeComparableValue(body.currentAlias),
    version: normalizeComparableValue(body.currentVersion),
    serverHost: normalizeComparableValue(body.serverHost),
    apiHost: normalizeComparableValue(body.apiHost),
    publicKey: normalizeComparableValue(body.publicKey),
  };

  const expected = {
    alias: normalizeComparableValue(alias),
    version: normalizeComparableValue(configProfile.targetVersion),
    serverHost: normalizeComparableValue(configProfile.serverHost),
    apiHost: normalizeComparableValue(configProfile.apiHost),
    publicKey: normalizeComparableValue(configProfile.publicKey),
  };

  const compliance = {
    aliasMatch: !reported.alias || reported.alias === expected.alias,
    versionMatch: !reported.version || reported.version === expected.version,
    serverHostMatch: !reported.serverHost || reported.serverHost === expected.serverHost,
    apiHostMatch: !reported.apiHost || reported.apiHost === expected.apiHost,
    publicKeyMatch: !reported.publicKey || reported.publicKey === expected.publicKey,
  };
  const reportedPublicKeyHash = body.publicKey?.trim() ? hashRustDeskPublicKey(body.publicKey) : null;

  const desiredActions: RustDeskActionName[] = [];
  if (!compliance.aliasMatch) desiredActions.push("reapply_alias");
  if (!compliance.serverHostMatch || !compliance.apiHostMatch || !compliance.publicKeyMatch) {
    desiredActions.push("reapply_config");
  }
  if (!compliance.versionMatch) desiredActions.push("upgrade_client");

  const updatedHost = await prisma.$transaction(async (tx) => {
    const saved = await tx.remoteHost.update({
      where: { id: host.id },
      data: {
        agentExternalId: normalizeRustdeskId(body.rustdeskId) || host.agentExternalId,
        machineName: body.machineName?.trim() || host.machineName,
        agentVersion: body.agentVersion?.trim() || host.agentVersion,
        lastHeartbeatAt: heartbeatAt,
        lastHeartbeatSuccessAt: heartbeatAt,
        lastHeartbeatErrorAt: null,
        lastHeartbeatErrorMessage: null,
        lastKnownIp: ip || host.lastKnownIp,
        agentTokenLastUsedAt: heartbeatAt,
        serviceStatus: body.serviceStatus?.trim() || host.serviceStatus,
        lastKnownRustDeskAlias: body.currentAlias?.trim() || host.lastKnownRustDeskAlias,
        lastKnownRustDeskVersion: body.currentVersion?.trim() || host.lastKnownRustDeskVersion,
        lastKnownRustDeskServerHost: body.serverHost?.trim() || host.lastKnownRustDeskServerHost,
        lastKnownRustDeskApiHost: body.apiHost?.trim() || host.lastKnownRustDeskApiHost,
        lastKnownRustDeskPublicKeyHash: reportedPublicKeyHash ?? host.lastKnownRustDeskPublicKeyHash,
        lastRustDeskConfigSyncAt: heartbeatAt,
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
      hostId: host.id,
      hostCompanyId: host.companyId,
      hostCompanyNames: normalizedPrimaryNames,
      heartbeatAt,
      sysproUpdates,
    });

    const existingCommands = await tx.remoteAgentCommand.findMany({
      where: {
        hostId: host.id,
        status: {
          in: ["PENDING", "DELIVERED"],
        },
      },
    });
    const desiredTypes = new Set(desiredActions.map((action) => COMMAND_TYPE_MAP[action]));

    for (const command of existingCommands) {
      if (command.status === "PENDING" && !desiredTypes.has(command.type as (typeof COMMAND_TYPE_MAP)[RustDeskActionName])) {
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
      existingCommands.filter((command) => command.status === "PENDING").map((command) => command.type)
    );
    for (const action of desiredActions) {
      const type = COMMAND_TYPE_MAP[action];
      if (existingPendingTypes.has(type)) continue;

      const payload =
        action === "reapply_alias"
          ? {
              expectedAlias: alias,
              reportedAlias: body.currentAlias?.trim() || null,
            }
          : action === "reapply_config"
            ? {
                expectedServerHost: configProfile.serverHost,
                expectedApiHost: configProfile.apiHost,
                expectedPublicKeyHash: configProfile.publicKeyHash,
                reportedServerHost: body.serverHost?.trim() || null,
                reportedApiHost: body.apiHost?.trim() || null,
                reportedPublicKeyHash,
              }
            : action === "upgrade_client"
              ? {
                  targetVersion: configProfile.targetVersion,
                  reportedVersion: body.currentVersion?.trim() || null,
                }
              : Prisma.JsonNull;

      await tx.remoteAgentCommand.create({
        data: {
          hostId: host.id,
          type,
          status: "PENDING",
          reason:
            action === "reapply_alias"
              ? "Alias reportado pelo cliente diverge do alias esperado pelo portal."
              : action === "reapply_config"
                ? "Configuracao do cliente diverge do servidor, API ou key publica esperados."
                : action === "upgrade_client"
                  ? "Versao reportada do cliente diverge da versao alvo configurada no portal."
                  : "Acao remota pendente para este host.",
          payload,
        },
      });
    }

    const deliverableCommands = await tx.remoteAgentCommand.findMany({
      where: {
        hostId: host.id,
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
          deliveredAt: command.deliveredAt ?? heartbeatAt,
          attemptCount: {
            increment: 1,
          },
        },
      });
    }

    const returnedCommands = await tx.remoteAgentCommand.findMany({
      where: {
        hostId: host.id,
        status: {
          in: ["DELIVERED"],
        },
      },
      orderBy: [{ createdAt: "asc" }],
      take: 20,
    });

    return {
      host: saved,
      pendingCommands: returnedCommands,
    };
  });

  logger.info("remote.rustdesk.sync.succeeded", {
    hostId: host.id,
    actionCount: updatedHost.pendingCommands.length,
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        contractVersion: "rustdesk.sync.v1",
        hostId: host.id,
        alias,
        rustdeskId: updatedHost.host.agentExternalId,
        machineName: updatedHost.host.machineName,
        currentAgentVersion: updatedHost.host.agentVersion,
        lastHeartbeatSuccessAt: updatedHost.host.lastHeartbeatSuccessAt?.toISOString() ?? null,
        agentTokenIssuedAt: updatedHost.host.agentTokenIssuedAt?.toISOString() ?? null,
        agentTokenLastUsedAt: updatedHost.host.agentTokenLastUsedAt?.toISOString() ?? null,
        agentTokenExpiresAt: getRemoteAgentTokenExpiresAt(updatedHost.host.agentTokenIssuedAt)?.toISOString() ?? null,
        expectedConfig: {
          serverHost: configProfile.serverHost,
          apiHost: configProfile.apiHost,
          publicKey: configProfile.publicKey,
          publicKeyHash: configProfile.publicKeyHash,
          serverConfig: configProfile.serverConfig,
          targetVersion: configProfile.targetVersion,
        },
        reportedConfig: {
          alias: updatedHost.host.lastKnownRustDeskAlias,
          version: updatedHost.host.lastKnownRustDeskVersion,
          serverHost: updatedHost.host.lastKnownRustDeskServerHost,
          apiHost: updatedHost.host.lastKnownRustDeskApiHost,
          publicKeyHash: updatedHost.host.lastKnownRustDeskPublicKeyHash,
          lastSyncAt: updatedHost.host.lastRustDeskConfigSyncAt?.toISOString() ?? null,
        },
        compliance,
        actions: updatedHost.pendingCommands.map((command) => COMMAND_RESPONSE_MAP[command.type]),
        commandQueue: updatedHost.pendingCommands.map((command) => ({
          id: command.id,
          type: command.type,
          status: command.status,
          reason: command.reason,
          payload:
            command.payload && typeof command.payload === "object" && !Array.isArray(command.payload)
              ? command.payload
              : null,
          attemptCount: command.attemptCount,
          createdAt: command.createdAt.toISOString(),
          deliveredAt: command.deliveredAt?.toISOString() ?? null,
        })),
        flow: {
          stage: "SYNC_ACTIVE",
          discoverRole: "triage_only",
        },
      },
    },
    { headers: responseHeaders }
  );
}
