import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createRequestLogger } from "@/lib/observability/logger";
import { consumeActionRateLimit } from "@/lib/security/action-rate-limit";
import { createRemoteAckPort } from "@/features/remote/infrastructure/gateways/remote-domain/ack-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";

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

  const ackPort = createRemoteAckPort({ logger });

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
