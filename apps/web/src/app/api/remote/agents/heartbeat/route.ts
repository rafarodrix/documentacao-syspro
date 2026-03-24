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

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { logger, responseHeaders } = createRequestLogger(request, {
    area: "api",
    feature: "remote-agent-heartbeat",
  });
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");
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
    installToken?: string;
    rustdeskId?: string | null;
    machineName?: string | null;
    agentVersion?: string | null;
    serviceStatus?: string | null;
    sysproUpdates?: unknown;
  };

  const installToken = body.installToken?.trim();
  if (!installToken) {
    logger.warn("remote.agent.heartbeat.missing_install_token");
    return NextResponse.json({ success: false, error: "installToken e obrigatorio." }, { status: 400, headers: responseHeaders });
  }

  const host = await prisma.remoteHost.findFirst({
    where: { installToken },
    select: {
      id: true,
      companyId: true,
      company: {
        select: {
          nomeFantasia: true,
          razaoSocial: true,
        },
      },
    },
  });

  if (!host) {
    logger.warn("remote.agent.heartbeat.invalid_install_token");
    return NextResponse.json({ success: false, error: "Token de instalacao invalido." }, { status: 404, headers: responseHeaders });
  }

  const heartbeatAt = new Date();
  const sysproUpdates = normalizeSysproUpdates(body.sysproUpdates);
  const hasServiceStatus = Object.prototype.hasOwnProperty.call(body, "serviceStatus");
  const normalizedServiceStatus = body.serviceStatus?.trim() || null;
  const normalizedPrimaryNames = [
    normalizeCompareValue(host.company.nomeFantasia),
    normalizeCompareValue(host.company.razaoSocial),
  ].filter(Boolean);

  const updated = await prisma.$transaction(async (tx) => {
    const remoteHost = await tx.remoteHost.update({
      where: { id: host.id },
      data: {
        agentExternalId: normalizeRustdeskId(body.rustdeskId),
        machineName: body.machineName?.trim() || undefined,
        agentVersion: body.agentVersion?.trim() || undefined,
        lastHeartbeatAt: heartbeatAt,
        status: "ACTIVE",
      },
      select: {
        id: true,
        lastHeartbeatAt: true,
        status: true,
        agentExternalId: true,
        machineName: true,
        agentVersion: true,
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

  logger.info("remote.agent.heartbeat.succeeded", {
    hostId: updated.id,
    machineName: updated.machineName,
    serviceStatus: hasServiceStatus ? normalizedServiceStatus : undefined,
    sysproUpdateCount: sysproUpdates.length,
  });

  return NextResponse.json({ success: true, data: updated }, { headers: responseHeaders });
}
