import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { createRequestLogger } from "@/lib/observability/logger";
import { consumeActionRateLimit } from "@/lib/security/action-rate-limit";
import { hashAgentToken } from "@/features/remote/application/rustdesk-sync";
import { isRemoteAgentTokenExpired } from "@/features/remote/application/agent-token";
import { createTrilinkRemote, type RemoteAckPort } from "@dosc-syspro/remote-domain";

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
      },
    );
  }

  const body = await request.json();

  const ackPort: RemoteAckPort = {
    async resolveHostByAgentToken(agentToken: string) {
      const host = await prisma.remoteHost.findFirst({
        where: {
          agentTokenHash: hashAgentToken(agentToken),
        },
        select: {
          id: true,
          agentTokenIssuedAt: true,
        },
      });

      if (!host) return null;
      return {
        hostId: host.id,
        agentTokenIssuedAt: host.agentTokenIssuedAt,
      };
    },
    isAgentTokenExpired(issuedAt: Date | null) {
      return isRemoteAgentTokenExpired(issuedAt);
    },
    async findDeliverableCommand(hostId: string, commandId: string) {
      const command = await prisma.remoteAgentCommand.findFirst({
        where: {
          id: commandId,
          hostId,
          status: {
            in: ["PENDING", "DELIVERED"],
          },
        },
        select: {
          id: true,
          type: true,
        },
      });

      return command;
    },
    async persistAck(record) {
      await prisma.remoteAgentCommand.update({
        where: { id: record.commandId },
        data: {
          status: record.status,
          executedAt: record.executedAt,
          resultMessage: record.message,
          resultPayload: record.details ? (record.details as Prisma.InputJsonValue) : undefined,
          failedAt: record.status === "FAILED" ? record.executedAt : null,
        },
      });
    },
    async logInfo(event: string, fields: Record<string, unknown>) {
      logger.info(event, fields);
    },
  };

  const trilinkRemote = createTrilinkRemote({
    ackPort,
  });

  try {
    const data = await trilinkRemote.processAck({
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
      return NextResponse.json(
        { success: false, error: "agentToken, commandId e status validos sao obrigatorios." },
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
      return NextResponse.json(
        { success: false, error: "agentToken expirado.", code: "AGENT_TOKEN_EXPIRED" },
        { status: 401, headers: responseHeaders },
      );
    }

    if (error instanceof Error && error.message === "COMMAND_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: "Comando nao encontrado para este host." },
        { status: 404, headers: responseHeaders },
      );
    }

    logger.error("remote.rustdesk.ack.unexpected_error", {
      error: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json(
      { success: false, error: "Falha inesperada no ack remoto." },
      { status: 500, headers: responseHeaders },
    );
  }
}
