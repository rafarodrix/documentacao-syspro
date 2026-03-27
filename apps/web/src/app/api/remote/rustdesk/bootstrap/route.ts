import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeActionRateLimit } from "@/lib/security/action-rate-limit";
import { createRequestLogger } from "@/lib/observability/logger";
import { getRemoteModuleSettingsSnapshot } from "@/features/remote/application/module-settings";
import {
  buildAgentToken,
  buildRustDeskConfigProfile,
  hashRustDeskPublicKey,
  hashAgentToken,
  normalizeRustdeskId,
  resolveRustDeskAlias,
} from "@/features/remote/application/rustdesk-sync";
import { getRemoteAgentTokenExpiresAt } from "@/features/remote/application/agent-token";

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
    feature: "remote-rustdesk-bootstrap",
  });
  const ip = getRequestIp(request);
  const rateLimit = consumeActionRateLimit({
    action: "remote-rustdesk-bootstrap",
    ip,
    max: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit excedido para bootstrap remoto." },
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
    installToken?: string;
    rustdeskId?: string | null;
    machineName?: string | null;
    agentVersion?: string | null;
    environment?: string | null;
    currentAlias?: string | null;
    currentVersion?: string | null;
    serverHost?: string | null;
    apiHost?: string | null;
    publicKey?: string | null;
  };

  const installToken = body.installToken?.trim();
  if (!installToken) {
    return NextResponse.json(
      { success: false, error: "installToken e obrigatorio." },
      { status: 400, headers: responseHeaders }
    );
  }

  const [host, settings] = await Promise.all([
    prisma.remoteHost.findFirst({
      where: { installToken },
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
    logger.warn("remote.rustdesk.bootstrap.invalid_install_token");
    return NextResponse.json(
      { success: false, error: "Token de instalacao invalido." },
      { status: 404, headers: responseHeaders }
    );
  }

  const agentToken = buildAgentToken();
  const agentTokenHash = hashAgentToken(agentToken);
  const registerAt = new Date();
  const rustdeskId = normalizeRustdeskId(body.rustdeskId) || host.agentExternalId;
  const machineName = body.machineName?.trim() || host.machineName;
  const configProfile = buildRustDeskConfigProfile(settings);
  const alias = resolveRustDeskAlias({
    hostName: host.name,
    machineName,
    companyName: host.company.nomeFantasia ?? host.company.razaoSocial,
  });
  const reportedPublicKeyHash = body.publicKey?.trim() ? hashRustDeskPublicKey(body.publicKey) : null;

  const updatedHost = await prisma.remoteHost.update({
    where: { id: host.id },
    data: {
      agentExternalId: rustdeskId,
      machineName,
      agentVersion: body.agentVersion?.trim() || host.agentVersion,
      environment: body.environment?.trim() || host.environment,
      agentTokenHash,
      agentTokenIssuedAt: registerAt,
      agentTokenLastUsedAt: registerAt,
      lastHeartbeatAt: registerAt,
      lastHeartbeatSuccessAt: registerAt,
      lastHeartbeatErrorAt: null,
      lastHeartbeatErrorMessage: null,
      lastKnownIp: ip || host.lastKnownIp,
      lastRegisterAt: registerAt,
      lastRegisterSource: "rustdesk.bootstrap",
      lastKnownRustDeskAlias: body.currentAlias?.trim() || alias,
      lastKnownRustDeskVersion: body.currentVersion?.trim() || configProfile.targetVersion,
      lastKnownRustDeskServerHost: body.serverHost?.trim() || configProfile.serverHost,
      lastKnownRustDeskApiHost: body.apiHost?.trim() || configProfile.apiHost,
      lastKnownRustDeskPublicKeyHash: reportedPublicKeyHash ?? configProfile.publicKeyHash,
      lastRustDeskConfigSyncAt: registerAt,
      status: "ACTIVE",
    },
    select: {
      id: true,
      companyId: true,
      name: true,
      agentExternalId: true,
      machineName: true,
      agentVersion: true,
      environment: true,
      agentTokenIssuedAt: true,
      lastKnownRustDeskAlias: true,
      lastKnownRustDeskVersion: true,
      lastKnownRustDeskServerHost: true,
      lastKnownRustDeskApiHost: true,
      lastKnownRustDeskPublicKeyHash: true,
      lastRustDeskConfigSyncAt: true,
    },
  });

  logger.info("remote.rustdesk.bootstrap.succeeded", {
    hostId: updatedHost.id,
    companyId: updatedHost.companyId,
    rustdeskId: updatedHost.agentExternalId,
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        bootstrapMode: "host",
        hostId: updatedHost.id,
        companyId: updatedHost.companyId,
        alias,
        rustdeskId: updatedHost.agentExternalId,
        machineName: updatedHost.machineName,
        agentToken,
        agentTokenIssuedAt: updatedHost.agentTokenIssuedAt?.toISOString() ?? null,
        agentTokenExpiresAt: getRemoteAgentTokenExpiresAt(updatedHost.agentTokenIssuedAt)?.toISOString() ?? null,
        serverHost: configProfile.serverHost,
        apiHost: configProfile.apiHost,
        publicKey: configProfile.publicKey,
        publicKeyHash: configProfile.publicKeyHash,
        serverConfig: configProfile.serverConfig,
        targetVersion: configProfile.targetVersion,
        defaultPassword: configProfile.defaultPassword,
        compliance: {
          aliasMatch: updatedHost.lastKnownRustDeskAlias?.trim().toLowerCase() === alias.trim().toLowerCase(),
          versionMatch:
            (updatedHost.lastKnownRustDeskVersion ?? "").trim().toLowerCase() ===
            configProfile.targetVersion.trim().toLowerCase(),
          serverHostMatch:
            (updatedHost.lastKnownRustDeskServerHost ?? "").trim().toLowerCase() ===
            configProfile.serverHost.trim().toLowerCase(),
          apiHostMatch:
            (updatedHost.lastKnownRustDeskApiHost ?? "").trim().toLowerCase() ===
            configProfile.apiHost.trim().toLowerCase(),
          publicKeyMatch:
            (updatedHost.lastKnownRustDeskPublicKeyHash ?? "") === (configProfile.publicKeyHash ?? ""),
        },
        actions: ["bootstrap_complete"],
      },
    },
    { headers: responseHeaders }
  );
}
