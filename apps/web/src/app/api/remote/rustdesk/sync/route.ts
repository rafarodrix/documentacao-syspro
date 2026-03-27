import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeActionRateLimit } from "@/lib/security/action-rate-limit";
import { createRequestLogger } from "@/lib/observability/logger";
import { getRemoteModuleSettingsSnapshot } from "@/features/remote/application/module-settings";
import { getRemoteAgentTokenExpiresAt, isRemoteAgentTokenExpired } from "@/features/remote/application/agent-token";
import {
  buildRustDeskConfigProfile,
  hashAgentToken,
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

  const actions: Array<"reapply_alias" | "reapply_config" | "upgrade_client" | "rotate_token_required"> = [];
  if (!compliance.aliasMatch) actions.push("reapply_alias");
  if (!compliance.serverHostMatch || !compliance.apiHostMatch || !compliance.publicKeyMatch) {
    actions.push("reapply_config");
  }
  if (!compliance.versionMatch) actions.push("upgrade_client");

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
      },
    });

    await syncRemoteHostSysproUpdates(tx, {
      hostId: host.id,
      hostCompanyId: host.companyId,
      hostCompanyNames: normalizedPrimaryNames,
      heartbeatAt,
      sysproUpdates,
    });

    return saved;
  });

  logger.info("remote.rustdesk.sync.succeeded", {
    hostId: host.id,
    actionCount: actions.length,
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        hostId: host.id,
        alias,
        rustdeskId: updatedHost.agentExternalId,
        machineName: updatedHost.machineName,
        currentAgentVersion: updatedHost.agentVersion,
        lastHeartbeatSuccessAt: updatedHost.lastHeartbeatSuccessAt?.toISOString() ?? null,
        agentTokenIssuedAt: updatedHost.agentTokenIssuedAt?.toISOString() ?? null,
        agentTokenLastUsedAt: updatedHost.agentTokenLastUsedAt?.toISOString() ?? null,
        agentTokenExpiresAt: getRemoteAgentTokenExpiresAt(updatedHost.agentTokenIssuedAt)?.toISOString() ?? null,
        expectedConfig: {
          serverHost: configProfile.serverHost,
          apiHost: configProfile.apiHost,
          publicKey: configProfile.publicKey,
          publicKeyHash: configProfile.publicKeyHash,
          serverConfig: configProfile.serverConfig,
          targetVersion: configProfile.targetVersion,
        },
        compliance,
        actions,
      },
    },
    { headers: responseHeaders }
  );
}

