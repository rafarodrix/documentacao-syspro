import { NextResponse } from "next/server";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { createRequestLogger } from "@dosc-syspro/api/observability/logger";
import { createRemoteSessionPort } from "@/features/remote/infrastructure/gateways/remote-domain/session-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";
import { remoteErrorResponse, toRemoteDomainErrorResponse } from "@/app/api/remote/_shared/remote-domain-error";
import { requireRemotePermission } from "@/app/api/remote/_shared/remote-access";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { logger, responseHeaders } = createRequestLogger(request, {
    area: "api",
    feature: "remote-session-start",
  });

  const access = await requireRemotePermission("tools:all", "Nao autorizado.");
  if (!access.ok) {
    logger.warn("remote.sessions.start.unauthorized");
    return remoteErrorResponse({
      code: "UNAUTHORIZED",
      message: "Nao autorizado.",
      httpStatus: 401,
      headers: responseHeaders,
    });
  }
  const session = access.session;

  const { id } = await context.params;
  const tenantScope = await getRemoteTenantScope();

  const sessionPort = createRemoteSessionPort({ logger });
  const trilinkRemote = createTrilinkRemote({ sessionPort });

  try {
    const data = await trilinkRemote.startSession({
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
      sessionId: id,
    });

    return NextResponse.json({ success: true, data: data.session }, { headers: responseHeaders });
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_NOT_FOUND") {
      logger.warn("remote.sessions.start.not_found", { sessionId: id });
    }

    logger.error("remote.sessions.start.unexpected_error", error);
    return toRemoteDomainErrorResponse(error, {
      headers: responseHeaders,
      validationMessage: "Sessao invalida.",
      defaultMessage: "Falha inesperada ao iniciar sessao.",
    });
  }
}

