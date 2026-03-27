import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getProtectedSession } from "@/lib/auth-helpers";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { createRequestLogger } from "@/lib/observability/logger";
import { createRemoteSessionPort } from "@/features/remote/infrastructure/gateways/remote-domain/session-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { logger, responseHeaders } = createRequestLogger(request, {
    area: "api",
    feature: "remote-session-start",
  });

  const session = await getProtectedSession();
  if (!session) {
    logger.warn("remote.sessions.start.unauthorized");
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401, headers: responseHeaders });
  }

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
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: "Sessao invalida." }, { status: 400, headers: responseHeaders });
    }

    if (error instanceof Error && error.message === "SESSION_NOT_FOUND") {
      logger.warn("remote.sessions.start.not_found", { sessionId: id });
      return NextResponse.json({ success: false, error: "Sessao nao encontrada." }, { status: 404, headers: responseHeaders });
    }

    if (error instanceof Error && error.message === "SESSION_START_INVALID_STATUS") {
      return NextResponse.json(
        { success: false, error: "Apenas sessoes REQUESTED podem ser iniciadas." },
        { status: 409, headers: responseHeaders },
      );
    }

    if (error instanceof Error && error.message === "SESSION_HOST_MISCONFIGURED") {
      return NextResponse.json(
        { success: false, error: "Host ativo sem ID RustDesk configurado." },
        { status: 409, headers: responseHeaders },
      );
    }

    if (error instanceof Error && error.message === "SESSION_START_CONCURRENT") {
      return NextResponse.json(
        {
          success: false,
          error: "Ja existe sessao iniciada para este host.",
          data: (error as Error & { data?: unknown }).data ?? null,
        },
        { status: 409, headers: responseHeaders },
      );
    }

    logger.error("remote.sessions.start.unexpected_error", error);
    return NextResponse.json(
      { success: false, error: "Falha inesperada ao iniciar sessao." },
      { status: 500, headers: responseHeaders },
    );
  }
}