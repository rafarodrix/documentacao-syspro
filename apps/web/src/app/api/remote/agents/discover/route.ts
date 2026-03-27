import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { consumeActionRateLimit } from "@/lib/security/action-rate-limit";
import { createRequestLogger } from "@/lib/observability/logger";
import { createRemoteDiscoverPort } from "@/features/remote/infrastructure/gateways/remote-domain/discover-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";

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

    return NextResponse.json(
      { success: false, error: "Rate limit excedido para descoberta do agente." },
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
    if (error instanceof ZodError) {
      const hasDiscoveryTokenIssue = error.issues.some((issue) => issue.path.join(".") === "discoveryToken");
      if (hasDiscoveryTokenIssue) {
        logger.warn("remote.agent.discover.invalid_token");
        return NextResponse.json(
          { success: false, error: "Token de descoberta invalido." },
          { status: 403, headers: responseHeaders },
        );
      }

      return NextResponse.json(
        { success: false, error: "Payload de descoberta invalido." },
        { status: 400, headers: responseHeaders },
      );
    }

    if (error instanceof Error && error.message === "DISCOVERY_TOKEN_NOT_CONFIGURED") {
      logger.error("remote.agent.discover.token_missing");
      return NextResponse.json(
        { success: false, error: "REMOTE_DISCOVERY_TOKEN nao configurado." },
        { status: 503, headers: responseHeaders },
      );
    }

    if (error instanceof Error && error.message === "DISCOVERY_TOKEN_INVALID") {
      logger.warn("remote.agent.discover.invalid_token");
      return NextResponse.json(
        { success: false, error: "Token de descoberta invalido." },
        { status: 403, headers: responseHeaders },
      );
    }

    if (error instanceof Error && error.message === "DISCOVERY_ID_OR_MACHINE_REQUIRED") {
      return NextResponse.json(
        { success: false, error: "machineName ou rustdeskId e obrigatorio." },
        { status: 400, headers: responseHeaders },
      );
    }

    logger.error("remote.agent.discover.unexpected_error", {
      error: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json(
      { success: false, error: "Falha inesperada na descoberta do agente." },
      { status: 500, headers: responseHeaders },
    );
  }
}

