import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { consumeActionRateLimit } from "@/lib/security/action-rate-limit";
import { createRequestLogger } from "@/lib/observability/logger";
import { getRemoteModuleSettingsSnapshot } from "@/features/remote/application/module-settings";
import {
  buildAgentToken,
  buildRustDeskConfigProfile,
  hashAgentToken,
  hashRustDeskPublicKey,
  normalizeRustdeskId,
  resolveRustDeskAlias,
} from "@/features/remote/application/rustdesk-sync";
import { getRemoteAgentTokenExpiresAt } from "@/features/remote/application/agent-token";
import { createTrilinkRemote, type RemoteBootstrapPort } from "@dosc-syspro/remote-domain";

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
      },
    );
  }

  const body = await request.json();

  const bootstrapPort: RemoteBootstrapPort = {
    async resolveHostByInstallToken(installToken: string) {
      const host = await prisma.remoteHost.findFirst({
        where: { installToken },
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

      return {
        hostId: host.id,
        hostName: host.name,
        companyId: host.companyId,
        companyName: host.company.nomeFantasia ?? host.company.razaoSocial,
        agentExternalId: host.agentExternalId,
        machineName: host.machineName,
        agentVersion: host.agentVersion,
        environment: host.environment,
        lastKnownIp: host.lastKnownIp,
      };
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
        defaultPassword: configProfile.defaultPassword,
      };
    },
    async issueAgentToken() {
      const token = buildAgentToken();
      return {
        token,
        tokenHash: hashAgentToken(token),
        issuedAt: new Date(),
      };
    },
    hashPublicKey(publicKey: string) {
      return hashRustDeskPublicKey(publicKey);
    },
    resolveAlias(input) {
      return resolveRustDeskAlias({
        hostName: input.hostName,
        machineName: input.machineName,
        companyName: input.companyName,
      });
    },
    getAgentTokenExpiresAt(issuedAt: Date | null) {
      return getRemoteAgentTokenExpiresAt(issuedAt);
    },
    async saveProcessedBootstrap(record) {
      const updatedHost = await prisma.remoteHost.update({
        where: { id: record.host.hostId },
        data: {
          agentExternalId: normalizeRustdeskId(record.rustdeskId) || record.host.agentExternalId,
          machineName: record.machineName,
          agentVersion: record.input.agentVersion ?? record.host.agentVersion,
          environment: record.input.environment ?? record.host.environment,
          agentTokenHash: record.issuedToken.tokenHash,
          agentTokenIssuedAt: record.issuedToken.issuedAt,
          agentTokenLastUsedAt: record.issuedToken.issuedAt,
          lastHeartbeatAt: record.issuedToken.issuedAt,
          lastHeartbeatSuccessAt: record.issuedToken.issuedAt,
          lastHeartbeatErrorAt: null,
          lastHeartbeatErrorMessage: null,
          lastKnownIp: record.requestIp || record.host.lastKnownIp,
          lastRegisterAt: record.issuedToken.issuedAt,
          lastRegisterSource: "rustdesk.bootstrap",
          lastKnownRustDeskAlias: record.input.currentAlias ?? record.alias,
          lastKnownRustDeskVersion: record.input.currentVersion ?? record.configProfile.targetVersion,
          lastKnownRustDeskServerHost: record.input.serverHost ?? record.configProfile.serverHost,
          lastKnownRustDeskApiHost: record.input.apiHost ?? record.configProfile.apiHost,
          lastKnownRustDeskPublicKeyHash: record.reportedPublicKeyHash ?? record.configProfile.publicKeyHash,
          lastRustDeskConfigSyncAt: record.issuedToken.issuedAt,
          status: "ACTIVE",
        },
        select: {
          id: true,
          companyId: true,
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

      return updatedHost;
    },
    async logInfo(event: string, fields: Record<string, unknown>) {
      logger.info(event, fields);
    },
  };

  const trilinkRemote = createTrilinkRemote({
    bootstrapPort,
  });

  try {
    const data = await trilinkRemote.processBootstrap({
      ...(typeof body === "object" && body !== null ? body : {}),
      metadata: {
        ip,
        userAgent: request.headers.get("user-agent"),
        correlationId: responseHeaders["x-correlation-id"],
      },
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
      const installTokenIssue = error.issues.find((issue) => issue.path.join(".") === "installToken");
      if (installTokenIssue) {
        return NextResponse.json(
          { success: false, error: "installToken e obrigatorio." },
          { status: 400, headers: responseHeaders },
        );
      }

      return NextResponse.json(
        { success: false, error: "Payload de bootstrap invalido." },
        { status: 400, headers: responseHeaders },
      );
    }

    if (error instanceof Error && error.message === "INSTALL_TOKEN_INVALID") {
      logger.warn("remote.rustdesk.bootstrap.invalid_install_token");
      return NextResponse.json(
        { success: false, error: "Token de instalacao invalido." },
        { status: 404, headers: responseHeaders },
      );
    }

    logger.error("remote.rustdesk.bootstrap.unexpected_error", {
      error: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json(
      { success: false, error: "Falha inesperada no bootstrap remoto." },
      { status: 500, headers: responseHeaders },
    );
  }
}
