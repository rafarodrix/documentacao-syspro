import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeActionRateLimit } from "@/lib/security/action-rate-limit";
import { createRequestLogger } from "@/lib/observability/logger";
import {
  normalizeCompareValue,
  normalizeRustdeskId,
  normalizeSysproUpdates,
  syncRemoteHostSysproUpdates,
} from "@/features/remote/application/agent-payload";
import { getRemoteAgentTokenExpiresAt, isRemoteAgentTokenExpired } from "@/features/remote/application/agent-token";

export const dynamic = "force-dynamic";

function hashAgentToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

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
    feature: "remote-agent-heartbeat",
  });
  const ip = getRequestIp(request);
  const rateLimit = consumeActionRateLimit({
    action: "remote-agent-heartbeat",
    ip,
    max: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    logger.warn("remote.agent.heartbeat.rate_limited", {
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
    return NextResponse.json(
      { success: false, error: "Rate limit excedido para heartbeat do agente." },
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
    serviceStatus?: string | null;
    sysproUpdates?: unknown;
  };

  const agentToken = body.agentToken?.trim();
  if (!agentToken) {
    logger.warn("remote.agent.heartbeat.missing_agent_credentials");
    return NextResponse.json(
      { success: false, error: "agentToken e obrigatorio." },
      { status: 400, headers: responseHeaders }
    );
  }

  const agentTokenHash = hashAgentToken(agentToken);
  const host = await prisma.remoteHost.findFirst({
    where: { agentTokenHash },
    select: {
      id: true,
      companyId: true,
      agentTokenHash: true,
      agentTokenIssuedAt: true,
      company: {
        select: {
          nomeFantasia: true,
          razaoSocial: true,
        },
      },
    },
  });

  if (!host) {
    logger.warn("remote.agent.heartbeat.invalid_agent_credentials", {
      credentialType: "agentToken",
    });
    return NextResponse.json(
      { success: false, error: "agentToken invalido ou expirado.", code: "AGENT_TOKEN_INVALID" },
      { status: 401, headers: responseHeaders }
    );
  }

  const tokenExpired = isRemoteAgentTokenExpired(host.agentTokenIssuedAt);
  if (tokenExpired) {
    const heartbeatAt = new Date();
    const expiresAt = getRemoteAgentTokenExpiresAt(host.agentTokenIssuedAt);
    const errorMessage = expiresAt
      ? `agentToken expirado em ${expiresAt.toISOString()}. Execute o bootstrap novamente para emitir nova credencial.`
      : "agentToken expirado. Execute o bootstrap novamente para emitir nova credencial.";

    await prisma.remoteHost.update({
      where: { id: host.id },
      data: {
        agentTokenHash: null,
        agentTokenIssuedAt: null,
        agentTokenLastUsedAt: null,
        lastHeartbeatErrorAt: heartbeatAt,
        lastHeartbeatErrorMessage: errorMessage,
      },
    });

    logger.warn("remote.agent.heartbeat.expired_agent_token", {
      hostId: host.id,
      expiresAt: expiresAt?.toISOString() ?? null,
    });

    return NextResponse.json(
      { success: false, error: "agentToken expirado.", code: "AGENT_TOKEN_EXPIRED" },
      { status: 401, headers: responseHeaders }
    );
  }

  const heartbeatAt = new Date();
  const sysproUpdates = normalizeSysproUpdates(body.sysproUpdates);
  const hasServiceStatus = Object.prototype.hasOwnProperty.call(body, "serviceStatus");
  const normalizedServiceStatus = body.serviceStatus?.trim() || null;
  const normalizedPrimaryNames = [
    normalizeCompareValue(host.company.nomeFantasia),
    normalizeCompareValue(host.company.razaoSocial),
  ].filter(Boolean);

  let updated: {
    id: string;
    lastHeartbeatAt: Date | null;
    lastHeartbeatSuccessAt: Date | null;
    status: string;
    agentExternalId: string | null;
    machineName: string | null;
    agentVersion: string | null;
    lastKnownIp: string | null;
  };
  try {
    updated = await prisma.$transaction(async (tx) => {
      const remoteHost = await tx.remoteHost.update({
        where: { id: host.id },
        data: {
          agentExternalId: normalizeRustdeskId(body.rustdeskId),
          machineName: body.machineName?.trim() || undefined,
          agentVersion: body.agentVersion?.trim() || undefined,
          lastHeartbeatAt: heartbeatAt,
          lastHeartbeatSuccessAt: heartbeatAt,
          lastHeartbeatErrorAt: null,
          lastHeartbeatErrorMessage: null,
          lastKnownIp: ip || undefined,
          agentTokenLastUsedAt: heartbeatAt,
          status: "ACTIVE",
        },
        select: {
          id: true,
          lastHeartbeatAt: true,
          lastHeartbeatSuccessAt: true,
          status: true,
          agentExternalId: true,
          machineName: true,
          agentVersion: true,
          lastKnownIp: true,
        },
      });

      if (hasServiceStatus) {
        await tx.$executeRaw`
          UPDATE "remote_host"
          SET "serviceStatus" = ${normalizedServiceStatus}
          WHERE "id" = ${host.id}
        `;
      }

      await syncRemoteHostSysproUpdates(tx, {
        hostId: host.id,
        hostCompanyId: host.companyId,
        hostCompanyNames: normalizedPrimaryNames,
        heartbeatAt,
        sysproUpdates,
      });

      return remoteHost;
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message.slice(0, 2000) : "Falha desconhecida ao processar heartbeat.";
    await prisma.remoteHost.update({
      where: { id: host.id },
      data: {
        lastHeartbeatErrorAt: heartbeatAt,
        lastHeartbeatErrorMessage: errorMessage,
      },
    });

    logger.error("remote.agent.heartbeat.failed", {
      hostId: host.id,
      authMode: "agentToken",
      errorMessage,
    });

    return NextResponse.json(
      { success: false, error: "Falha ao processar heartbeat do agente." },
      { status: 500, headers: responseHeaders }
    );
  }

  logger.info("remote.agent.heartbeat.succeeded", {
    hostId: updated.id,
    machineName: updated.machineName,
    authMode: "agentToken",
    serviceStatus: hasServiceStatus ? normalizedServiceStatus : undefined,
    sysproUpdateCount: sysproUpdates.length,
  });

  return NextResponse.json({ success: true, data: updated }, { headers: responseHeaders });
}
