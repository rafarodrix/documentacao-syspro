import { NextResponse } from "next/server";
import { createRequestLogger } from "@/lib/observability/logger";
import { consumeActionRateLimit } from "@/lib/security/action-rate-limit";
import { createRemoteAckPort } from "@/features/remote/infrastructure/gateways/remote-domain/ack-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";
import { remoteErrorResponse, toRemoteDomainErrorResponse } from "@/app/api/remote/_shared/remote-domain-error";

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
    return remoteErrorResponse({
      code: "RATE_LIMIT",
      message: "Rate limit excedido para ack remoto.",
      httpStatus: 429,
      headers: {
        ...responseHeaders,
        "Retry-After": String(rateLimit.retryAfterSeconds),
      },
    });
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
    logger.error("remote.rustdesk.ack.unexpected_error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return toRemoteDomainErrorResponse(error, {
      headers: responseHeaders,
      validationMessage: "agentToken, commandId e status validos sao obrigatorios.",
      defaultMessage: "Falha inesperada no ack remoto.",
    });
  }
}

