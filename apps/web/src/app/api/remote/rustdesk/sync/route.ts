import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { consumeActionRateLimit } from "@dosc-syspro/api/security/action-rate-limit";
import { createRequestLogger } from "@dosc-syspro/api/observability/logger";
import {
  createRemoteSyncPort,
  revokeExpiredSyncAgentToken,
} from "@/features/remote/infrastructure/gateways/remote-domain/sync-port.gateway";
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
    feature: "remote-rustdesk-sync",
  });
  const ip = getRequestIp(request);
  const rateLimit = consumeActionRateLimit({
    action: "remote-rustdesk-sync",
    ip,
    max: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return remoteErrorResponse({
      code: "RATE_LIMIT",
      message: "Rate limit excedido para sync remoto.",
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
      message: "schemaVersion e obrigatorio no payload sync.",
      httpStatus: 400,
      headers: responseHeaders,
    });
  }
  if (schemaVersion !== "sync.payload.v1") {
    return remoteErrorResponse({
      code: "SCHEMA_VERSION_UNSUPPORTED",
      message: "schemaVersion sync nao suportado.",
      httpStatus: 400,
      headers: responseHeaders,
      data: { expected: "sync.payload.v1", received: schemaVersion },
    });
  }
  const agentToken = typeof body?.agentToken === "string" ? body.agentToken.trim() : "";
  if (!agentToken) {
    return remoteErrorResponse({
      code: "AGENT_TOKEN_REQUIRED",
      message: "agentToken e obrigatorio no sync.",
      httpStatus: 400,
      headers: responseHeaders,
    });
  }

  const syncPort = createRemoteSyncPort({
    logger,
    requestIp: ip,
  });

  const trilinkRemote = createTrilinkRemote({
    syncPort,
  });

  try {
    const data = await trilinkRemote.processSync({
      ...(typeof body === "object" && body !== null ? body : {}),
      metadata: {
        ip,
        userAgent: request.headers.get("user-agent"),
        correlationId: responseHeaders["x-correlation-id"],
      },
    });

    logger.info("remote.rustdesk.sync.succeeded", {
      hostId: data.hostId,
      actionCount: data.commandQueue.length,
    });

    return NextResponse.json(
      {
        success: true,
        data,
      },
      { headers: responseHeaders },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "AGENT_TOKEN_EXPIRED") {
      await revokeExpiredSyncAgentToken((body as { agentToken?: string } | null)?.agentToken);
    }

    logger.error("remote.rustdesk.sync.unexpected_error", error);
    const missingAgentToken =
      error instanceof ZodError && error.issues.some((issue) => issue.path.join(".") === "agentToken");
    return toRemoteDomainErrorResponse(error, {
      headers: responseHeaders,
      validationMessage: missingAgentToken ? "agentToken e obrigatorio." : "Payload de sync invalido.",
      defaultMessage: "Falha inesperada no sync remoto.",
    });
  }
}
