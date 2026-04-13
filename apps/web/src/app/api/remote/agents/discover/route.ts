import { NextResponse } from "next/server";
import { consumeActionRateLimit } from "@dosc-syspro/shared/action-rate-limit";
import { createRequestLogger } from "@dosc-syspro/shared/logger";
import { createRemoteDiscoverPort } from "@/features/remote/infrastructure/gateways/remote-domain/discover-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";
import { remoteErrorResponse, toRemoteDomainErrorResponse } from "@/features/remote/application/remote-domain-error";

export const dynamic = "force-dynamic";

const DISCOVER_TRANSITIONS = {
  pending_link: {
    state: "DISCOVERY_PENDING_LINK",
    nextStep: "link_discovered_host_then_bootstrap",
    nextEndpoint: "/api/remote/discovered-hosts/:id/link",
    allowDiscoveryHeartbeat: true,
    requiresAuthenticatedBootstrap: false,
  },
  linked_host_detected: {
    state: "DISCOVERY_LINKED_HOST",
    nextStep: "host_already_linked_keep_bootstrap_sync_flow",
    nextEndpoint: "/api/remote/rustdesk/sync",
    allowDiscoveryHeartbeat: false,
    requiresAuthenticatedBootstrap: false,
  },
  host_bootstrap_required: {
    state: "DISCOVERY_LINKED_HOST_BOOTSTRAP_REQUIRED",
    nextStep: "run_authenticated_bootstrap",
    nextEndpoint: "/api/remote/rustdesk/bootstrap",
    allowDiscoveryHeartbeat: false,
    requiresAuthenticatedBootstrap: false,
  },
  token_invalid: {
    state: "DISCOVERY_LINKED_HOST_TOKEN_INVALID",
    nextStep: "run_authenticated_bootstrap",
    nextEndpoint: "/api/remote/rustdesk/bootstrap",
    allowDiscoveryHeartbeat: false,
    requiresAuthenticatedBootstrap: false,
  },
} as const;

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
    feature: "remote-agent-discover",
  });
  const ip = getRequestIp(request);
  const rateLimit = consumeActionRateLimit({
    action: "remote-agent-discover",
    ip,
    max: 5,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    logger.warn("remote.agent.discover.rate_limited", {
      ip,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });

    return remoteErrorResponse({
      code: "RATE_LIMIT",
      message: "Rate limit excedido para descoberta do agente.",
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
      message: "schemaVersion e obrigatorio no payload discover.",
      httpStatus: 400,
      headers: responseHeaders,
    });
  }
  if (schemaVersion !== "discover.payload.v1") {
    return remoteErrorResponse({
      code: "SCHEMA_VERSION_UNSUPPORTED",
      message: "schemaVersion discover nao suportado.",
      httpStatus: 400,
      headers: responseHeaders,
      data: { expected: "discover.payload.v1", received: schemaVersion },
    });
  }
  const discoveryToken = typeof body?.discoveryToken === "string" ? body.discoveryToken.trim() : "";
  if (!discoveryToken) {
    return remoteErrorResponse({
      code: "DISCOVERY_TOKEN_REQUIRED",
      message: "discoveryToken e obrigatorio.",
      httpStatus: 400,
      headers: responseHeaders,
    });
  }

  const discoverPort = createRemoteDiscoverPort({
    logger,
    transitions: DISCOVER_TRANSITIONS,
  });

  const trilinkRemote = createTrilinkRemote({
    discoverPort,
  });

  try {
    const data = await trilinkRemote.processDiscover({
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
    const response = toRemoteDomainErrorResponse(error, {
      headers: responseHeaders,
      validationMessage: "Payload de descoberta invalido.",
      defaultMessage: "Falha inesperada na descoberta do agente.",
    });

    if (response.status >= 500) {
      logger.error("remote.agent.discover.unexpected_error", error);
    }

    return response;
  }
}
