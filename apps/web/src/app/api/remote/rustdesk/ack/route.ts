import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRequestLogger } from "@/lib/observability/logger";
import { consumeActionRateLimit } from "@/lib/security/action-rate-limit";
import { hashAgentToken } from "@/features/remote/application/rustdesk-sync";
import { isRemoteAgentTokenExpired } from "@/features/remote/application/agent-token";
import { Prisma } from "@prisma/client";

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
    feature: "remote-rustdesk-ack",
  });
  const ip = getRequestIp(request);
  const rateLimit = consumeActionRateLimit({
    action: "remote-rustdesk-ack",
    ip,
    max: 60,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit excedido para ack remoto." },
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
    commandId?: string;
    status?: "ACKNOWLEDGED" | "FAILED";
    message?: string | null;
    details?: Record<string, unknown> | null;
  };

  const agentToken = body.agentToken?.trim();
  const commandId = body.commandId?.trim();
  const status = body.status;

  if (!agentToken || !commandId || (status !== "ACKNOWLEDGED" && status !== "FAILED")) {
    return NextResponse.json(
      { success: false, error: "agentToken, commandId e status validos sao obrigatorios." },
      { status: 400, headers: responseHeaders }
    );
  }

  const host = await prisma.remoteHost.findFirst({
    where: {
      agentTokenHash: hashAgentToken(agentToken),
    },
    select: {
      id: true,
      agentTokenIssuedAt: true,
    },
  });

  if (!host) {
    return NextResponse.json(
      { success: false, error: "agentToken invalido ou expirado.", code: "AGENT_TOKEN_INVALID" },
      { status: 401, headers: responseHeaders }
    );
  }

  if (isRemoteAgentTokenExpired(host.agentTokenIssuedAt)) {
    return NextResponse.json(
      { success: false, error: "agentToken expirado.", code: "AGENT_TOKEN_EXPIRED" },
      { status: 401, headers: responseHeaders }
    );
  }

  const command = await prisma.remoteAgentCommand.findFirst({
    where: {
      id: commandId,
      hostId: host.id,
      status: {
        in: ["PENDING", "DELIVERED"],
      },
    },
    select: {
      id: true,
      type: true,
    },
  });

  if (!command) {
    return NextResponse.json(
      { success: false, error: "Comando nao encontrado para este host." },
      { status: 404, headers: responseHeaders }
    );
  }

  const now = new Date();
  const jsonDetails =
    body.details && typeof body.details === "object" && !Array.isArray(body.details)
      ? (body.details as Prisma.InputJsonValue)
      : undefined;

  await prisma.remoteAgentCommand.update({
    where: { id: command.id },
    data: {
      status,
      executedAt: now,
      resultMessage: body.message?.trim() || null,
      resultPayload: jsonDetails,
      failedAt: status === "FAILED" ? now : null,
    },
  });

  logger.info("remote.rustdesk.ack.succeeded", {
    hostId: host.id,
    commandId: command.id,
    commandType: command.type,
    status,
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        commandId: command.id,
        status,
        executedAt: now.toISOString(),
      },
    },
    { headers: responseHeaders }
  );
}
