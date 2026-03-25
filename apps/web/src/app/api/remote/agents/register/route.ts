import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { consumeActionRateLimit } from "@/lib/security/action-rate-limit";
import { createRequestLogger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

function normalizeRustdeskId(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\s+/g, "");
  return /^\d{7,12}$/.test(normalized) ? normalized : null;
}

function buildAgentToken() {
  return `ragent_${randomBytes(24).toString("hex")}`;
}

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
  const { logger, responseHeaders, correlationId } = createRequestLogger(request, {
    area: "api",
    feature: "remote-agent-register",
  });
  const ip = getRequestIp(request);
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
    select: {
      id: true,
      companyId: true,
      name: true,
      agentExternalId: true,
      installToken: true,
      machineName: true,
      agentVersion: true,
      environment: true,
      lastKnownIp: true,
    },
  });

  if (!host) {
    logger.warn("remote.agent.register.invalid_install_token");
    return NextResponse.json({ success: false, error: "Token de instalacao invalido." }, { status: 404, headers: responseHeaders });
  }

  const agentToken = buildAgentToken();
  const agentTokenHash = hashAgentToken(agentToken);
  const registerAt = new Date();

  let updated: {
    id: string;
    companyId: string;
    name: string;
    agentExternalId: string | null;
    installToken: string | null;
    machineName: string | null;
    agentVersion: string | null;
    lastHeartbeatAt: Date | null;
    lastHeartbeatSuccessAt: Date | null;
    lastKnownIp: string | null;
    lastRegisterAt: Date | null;
    lastRegisterSource: string | null;
    status: string;
  };

  try {
    updated = await prisma.remoteHost.update({
      where: { id: host.id },
      data: {
        agentExternalId: normalizeRustdeskId(body.rustdeskId) || host.agentExternalId,
        machineName: body.machineName?.trim() || host.machineName,
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
        lastRegisterSource: "installToken",
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
        lastHeartbeatSuccessAt: true,
        lastKnownIp: true,
        lastRegisterAt: true,
        lastRegisterSource: true,
        status: true,
      },
    });
  } catch (error) {
    const prismaError = error instanceof Prisma.PrismaClientKnownRequestError ? error : null;
    const errorCode = prismaError?.code ?? "REMOTE_AGENT_REGISTER_FAILED";
    const errorMessage =
      prismaError?.message?.slice(0, 500) ??
      (error instanceof Error ? error.message.slice(0, 500) : "Falha desconhecida no registro do agente.");

    logger.error("remote.agent.register.failed", {
      hostId: host.id,
      companyId: host.companyId,
      correlationId,
      errorCode,
      errorMessage,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Falha ao registrar agente no host remoto.",
        code: errorCode,
        detail: errorMessage,
        correlationId,
      },
      { status: 500, headers: responseHeaders }
    );
  }

  logger.info("remote.agent.register.succeeded", {
    hostId: updated.id,
    companyId: updated.companyId,
    machineName: updated.machineName,
    lastKnownIp: updated.lastKnownIp,
    correlationId,
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        ...updated,
        agentToken,
      },
    },
    { headers: responseHeaders }
  );
}
