import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getProtectedSession } from "@/lib/auth-helpers";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { createRequestLogger } from "@/lib/observability/logger";
import { createRemoteSessionPort } from "@/features/remote/infrastructure/gateways/remote-domain/session-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";
import { remoteErrorResponse, toRemoteDomainErrorResponse } from "@/app/api/remote/_shared/remote-domain-error";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { logger, responseHeaders } = createRequestLogger(request, {
    area: "api",
    feature: "remote-sessions",
  });

  const session = await getProtectedSession();
  if (!session) {
    logger.warn("remote.sessions.list.unauthorized");
    return remoteErrorResponse({
      code: "UNAUTHORIZED",
      message: "Nao autorizado.",
      httpStatus: 401,
      headers: responseHeaders,
    });
  }

  const tenantScope = await getRemoteTenantScope();
  const sessionPort = createRemoteSessionPort({ logger });
  const trilinkRemote = createTrilinkRemote({ sessionPort });

  try {
    const data = await trilinkRemote.listSessions({
      scope: {
        isGlobalView: tenantScope.isGlobalView,
        companyIds: tenantScope.companyIds,
      },
    });

    logger.info("remote.sessions.list.succeeded", {
      count: data.sessions.length,
      tenantScope: tenantScope.isGlobalView ? "global" : "scoped",
    });

    return NextResponse.json({ success: true, data: data.sessions, tenantScope }, { headers: responseHeaders });
  } catch (error) {
    logger.error("remote.sessions.list.unexpected_error", error);
    return remoteErrorResponse({
      code: "INTERNAL_ERROR",
      message: "Falha inesperada ao listar sessoes.",
      httpStatus: 500,
      headers: responseHeaders,
    });
  }
}

export async function POST(request: Request) {
  const { logger, responseHeaders } = createRequestLogger(request, {
    area: "api",
    feature: "remote-sessions",
  });

  const session = await getProtectedSession();
  if (!session) {
    logger.warn("remote.sessions.create.unauthorized");
    return remoteErrorResponse({
      code: "UNAUTHORIZED",
      message: "Nao autorizado.",
      httpStatus: 401,
      headers: responseHeaders,
    });
  }

  const tenantScope = await getRemoteTenantScope();
  const body = (await request.json()) as {
    companyId?: string;
    hostId?: string;
    ticketId?: string | null;
    ticketNumber?: string | null;
    reason?: string | null;
  };

  const sessionPort = createRemoteSessionPort({ logger });
  const trilinkRemote = createTrilinkRemote({ sessionPort });

  try {
    const data = await trilinkRemote.createSession({
      actor: {
        userId: session.userId,
        role: session.role,
        name: session.name ?? null,
        email: session.email ?? null,
      },
      scope: {
        isGlobalView: tenantScope.isGlobalView,
        companyIds: tenantScope.companyIds,
      },
      companyId: body.companyId,
      hostId: body.hostId,
      ticketId: body.ticketId ?? null,
      ticketNumber: body.ticketNumber ?? null,
      reason: body.reason ?? null,
    });

    return NextResponse.json({ success: true, data: data.session }, { status: 201, headers: responseHeaders });
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_CREATE_FORBIDDEN") {
      logger.warn("remote.sessions.create.forbidden", {
        actorUserId: session.userId,
        actorRole: session.role,
      });
    }

    logger.error("remote.sessions.create.unexpected_error", error);
    if (error instanceof ZodError) {
      logger.warn("remote.sessions.create.invalid_payload");
    }
    return toRemoteDomainErrorResponse(error, {
      headers: responseHeaders,
      validationMessage: "companyId e hostId sao obrigatorios.",
      defaultMessage: "Falha inesperada ao abrir sessao.",
    });
  }
}
