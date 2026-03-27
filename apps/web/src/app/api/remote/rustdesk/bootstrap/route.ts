import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { consumeActionRateLimit } from "@/lib/security/action-rate-limit";
import { createRequestLogger } from "@/lib/observability/logger";
import { createRemoteBootstrapPort } from "@/features/remote/infrastructure/gateways/remote-domain/bootstrap-port.gateway";
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
    feature: "remote-rustdesk-bootstrap",
  });
  const ip = getRequestIp(request);
  const rateLimit = consumeActionRateLimit({
    action: "remote-rustdesk-bootstrap",
    ip,
    max: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit excedido para bootstrap remoto." },
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

  const bootstrapPort = createRemoteBootstrapPort({
    logger,
    requestIp: ip,
  });

  const trilinkRemote = createTrilinkRemote({
    bootstrapPort,
  });

  try {
    const data = await trilinkRemote.processBootstrap({
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
      const installTokenIssue = error.issues.find((issue) => issue.path.join(".") === "installToken");
      if (installTokenIssue) {
        return NextResponse.json(
          { success: false, error: "installToken e obrigatorio." },
          { status: 400, headers: responseHeaders },
        );
      }

      return NextResponse.json(
        { success: false, error: "Payload de bootstrap invalido." },
        { status: 400, headers: responseHeaders },
      );
    }

    if (error instanceof Error && error.message === "INSTALL_TOKEN_INVALID") {
      logger.warn("remote.rustdesk.bootstrap.invalid_install_token");
      return NextResponse.json(
        { success: false, error: "Token de instalacao invalido." },
        { status: 404, headers: responseHeaders },
      );
    }

    logger.error("remote.rustdesk.bootstrap.unexpected_error", {
      error: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json(
      { success: false, error: "Falha inesperada no bootstrap remoto." },
      { status: 500, headers: responseHeaders },
    );
  }
}
