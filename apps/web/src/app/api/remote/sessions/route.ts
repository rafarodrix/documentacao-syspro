import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getProtectedSession } from "@/lib/auth-helpers";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { createRequestLogger } from "@/lib/observability/logger";
import { createRemoteSessionPort } from "@/features/remote/infrastructure/gateways/remote-domain/session-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { logger, responseHeaders } = createRequestLogger(request, {
    area: "api",
    feature: "remote-sessions",
  });

  const session = await getProtectedSession();
  if (!session) {
    logger.warn("remote.sessions.list.unauthorized");
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401, headers: responseHeaders });
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
    return NextResponse.json({ success: false, error: "Falha inesperada ao listar sessoes." }, { status: 500, headers: responseHeaders });
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
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401, headers: responseHeaders });
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
    if (error instanceof ZodError) {
      logger.warn("remote.sessions.create.invalid_payload");
      return NextResponse.json(
        { success: false, error: "companyId e hostId sao obrigatorios." },
        { status: 400, headers: responseHeaders },
      );
    }

    if (error instanceof Error && error.message === "SESSION_CREATE_FORBIDDEN") {
      logger.warn("remote.sessions.create.forbidden", {
        actorUserId: session.userId,
        actorRole: session.role,
      });
      return NextResponse.json(
        { success: false, error: "Sem permissao para abrir sessao." },
        { status: 403, headers: responseHeaders },
      );
    }

    if (error instanceof Error && error.message === "SESSION_COMPANY_OUT_OF_SCOPE") {
      return NextResponse.json(
        { success: false, error: "Empresa fora do escopo do usuario." },
        { status: 403, headers: responseHeaders },
      );
    }

    if (error instanceof Error && error.message === "SESSION_HOST_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: "Host remoto nao encontrado para a empresa." },
        { status: 404, headers: responseHeaders },
      );
    }

    if (error instanceof Error && error.message === "SESSION_HOST_MISCONFIGURED") {
      return NextResponse.json(
        { success: false, error: "Host ativo sem ID RustDesk configurado." },
        { status: 409, headers: responseHeaders },
      );
    }

    if (error instanceof Error && error.message === "SESSION_DUPLICATE_OPEN") {
      const duplicate = (error as Error & { data?: unknown }).data;
      return NextResponse.json(
        { success: false, error: "Ja existe sessao aberta para este ticket e host.", data: duplicate ?? null },
        { status: 409, headers: responseHeaders },
      );
    }

    logger.error("remote.sessions.create.unexpected_error", error);
    return NextResponse.json(
      { success: false, error: "Falha inesperada ao abrir sessao." },
      { status: 500, headers: responseHeaders },
    );
  }
}