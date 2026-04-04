import { NextResponse } from "next/server";
import { createRequestLogger } from "@dosc-syspro/api/observability/logger";
import { consumeActionRateLimit } from "@dosc-syspro/api/security/action-rate-limit";
import { createRemoteAckPort } from "@/features/remote/infrastructure/gateways/remote-domain/ack-port.gateway";
import { createTrilinkRemote, isRemoteAgentAckReasonCode } from "@dosc-syspro/remote-domain";
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
  const schemaVersion = typeof body?.schemaVersion === "string" ? body.schemaVersion.trim() : "";
  if (!schemaVersion) {
    return remoteErrorResponse({
      code: "SCHEMA_VERSION_REQUIRED",
      message: "schemaVersion e obrigatorio no payload ack.",
      httpStatus: 400,
      headers: responseHeaders,
    });
  }
  if (schemaVersion !== "ack.payload.v1") {
    return remoteErrorResponse({
      code: "SCHEMA_VERSION_UNSUPPORTED",
      message: "schemaVersion ack nao suportado.",
      httpStatus: 400,
      headers: responseHeaders,
      data: { expected: "ack.payload.v1", received: schemaVersion },
    });
  }
  const agentToken = typeof body?.agentToken === "string" ? body.agentToken.trim() : "";
  const commandId = typeof body?.commandId === "string" ? body.commandId.trim() : "";
  const status = typeof body?.status === "string" ? body.status.trim() : "";
  if (!agentToken || !commandId || !status) {
    return remoteErrorResponse({
      code: "ACK_CRITICAL_FIELDS_REQUIRED",
      message: "agentToken, commandId e status sao obrigatorios no ack.",
      httpStatus: 400,
      headers: responseHeaders,
    });
  }
  const reasonCode = typeof body?.reasonCode === "string" ? body.reasonCode.trim().toUpperCase() : "";
  if (status === "FAILED" && !reasonCode) {
    return remoteErrorResponse({
      code: "ACK_REASON_CODE_REQUIRED",
      message: "reasonCode e obrigatorio quando status=FAILED.",
      httpStatus: 400,
      headers: responseHeaders,
    });
  }
  if (status === "FAILED" && !isRemoteAgentAckReasonCode(reasonCode)) {
    return remoteErrorResponse({
      code: "ACK_REASON_CODE_INVALID",
      message: "reasonCode invalido para status=FAILED.",
      httpStatus: 400,
      headers: responseHeaders,
      data: { received: reasonCode },
    });
  }

  const ackPort = createRemoteAckPort({ logger });

  const trilinkRemote = createTrilinkRemote({
    ackPort,
  });

  try {
    const data = await trilinkRemote.processAck({
      ...(typeof body === "object" && body !== null ? body : {}),
      ...(reasonCode ? { reasonCode } : {}),
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
    logger.error("remote.rustdesk.ack.unexpected_error", error);
    return toRemoteDomainErrorResponse(error, {
      headers: responseHeaders,
      validationMessage: "agentToken, commandId e status validos sao obrigatorios.",
      defaultMessage: "Falha inesperada no ack remoto.",
    });
  }
}
