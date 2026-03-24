import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeActionRateLimit } from "@/lib/security/action-rate-limit";
import { createRequestLogger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

function normalizeRustdeskId(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\s+/g, "");
}

export async function POST(request: Request) {
  const { logger, responseHeaders, correlationId } = createRequestLogger(request, {
    area: "api",
    feature: "remote-agent-register",
  });
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");
  const rateLimit = consumeActionRateLimit({
    action: "remote-agent-register",
    ip,
    max: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    logger.warn("remote.agent.register.rate_limited", {
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
    return NextResponse.json(
      { success: false, error: "Rate limit excedido para registro do agente." },
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
  };

  const installToken = body.installToken?.trim();
  if (!installToken) {
    logger.warn("remote.agent.register.missing_install_token");
    return NextResponse.json({ success: false, error: "installToken e obrigatorio." }, { status: 400, headers: responseHeaders });
  }

  const host = await prisma.remoteHost.findFirst({
    where: { installToken },
  });

  if (!host) {
    logger.warn("remote.agent.register.invalid_install_token");
    return NextResponse.json({ success: false, error: "Token de instalacao invalido." }, { status: 404, headers: responseHeaders });
  }

  const updated = await prisma.remoteHost.update({
    where: { id: host.id },
    data: {
      agentExternalId: normalizeRustdeskId(body.rustdeskId) || host.agentExternalId,
      machineName: body.machineName?.trim() || host.machineName,
      agentVersion: body.agentVersion?.trim() || host.agentVersion,
      environment: body.environment?.trim() || host.environment,
      lastHeartbeatAt: new Date(),
      status: "ACTIVE",
    },
    select: {
      id: true,
      companyId: true,
      name: true,
      agentExternalId: true,
      installToken: true,
      machineName: true,
      agentVersion: true,
      lastHeartbeatAt: true,
      status: true,
    },
  });

  logger.info("remote.agent.register.succeeded", {
    hostId: updated.id,
    companyId: updated.companyId,
    machineName: updated.machineName,
    correlationId,
  });

  return NextResponse.json({ success: true, data: updated }, { headers: responseHeaders });
}
