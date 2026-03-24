import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { buildRequestedSessionExpiresAt } from "@/features/remote/application/session-policy";
import { createRequestLogger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

function canCreateSession(role: string): boolean {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER" || role === "CLIENTE_ADMIN";
}

function buildTicketFilter(ticketId: string | null, ticketNumber: string | null) {
  if (ticketId) return { ticketId };
  if (ticketNumber) return { ticketNumber };
  return {};
}

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
  const where = tenantScope.isGlobalView
    ? {}
    : { companyId: { in: tenantScope.companyIds.length ? tenantScope.companyIds : ["__none__"] } };

  const sessions = await prisma.remoteSession.findMany({
    where,
    include: {
      company: { select: { id: true, nomeFantasia: true, razaoSocial: true } },
      host: { select: { id: true, name: true } },
      requestedByUser: { select: { id: true, name: true, email: true } },
      startedByUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  logger.info("remote.sessions.list.succeeded", {
    count: sessions.length,
    tenantScope: tenantScope.isGlobalView ? "global" : "scoped",
  });

  return NextResponse.json({ success: true, data: sessions, tenantScope }, { headers: responseHeaders });
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

  if (!canCreateSession(session.role)) {
    logger.warn("remote.sessions.create.forbidden", {
      actorUserId: session.userId,
      actorRole: session.role,
    });
    return NextResponse.json({ success: false, error: "Sem permissao para abrir sessao." }, { status: 403, headers: responseHeaders });
  }

  const tenantScope = await getRemoteTenantScope();
  const body = (await request.json()) as {
    companyId?: string;
    hostId?: string;
    ticketId?: string | null;
    ticketNumber?: string | null;
    reason?: string | null;
  };

  const companyId = body.companyId?.trim();
  const hostId = body.hostId?.trim();

  if (!companyId || !hostId) {
    logger.warn("remote.sessions.create.invalid_payload");
    return NextResponse.json({ success: false, error: "companyId e hostId sao obrigatorios." }, { status: 400, headers: responseHeaders });
  }

  if (!tenantScope.isGlobalView && !tenantScope.companyIds.includes(companyId)) {
    logger.warn("remote.sessions.create.company_out_of_scope", {
      actorUserId: session.userId,
      companyId,
    });
    return NextResponse.json({ success: false, error: "Empresa fora do escopo do usuario." }, { status: 403, headers: responseHeaders });
  }

  const host = await prisma.remoteHost.findFirst({
    where: { id: hostId, companyId },
    select: { id: true, companyId: true, status: true, agentExternalId: true },
  });

  if (!host) {
    logger.warn("remote.sessions.create.host_not_found", { companyId, hostId });
    return NextResponse.json({ success: false, error: "Host remoto nao encontrado para a empresa." }, { status: 404, headers: responseHeaders });
  }

  if (host.status === "ACTIVE" && !host.agentExternalId) {
    logger.warn("remote.sessions.create.host_misconfigured", { companyId, hostId });
    return NextResponse.json(
      { success: false, error: "Host ativo sem ID RustDesk configurado." },
      { status: 409, headers: responseHeaders }
    );
  }

  const ticketId = body.ticketId?.trim() || null;
  const ticketNumber = body.ticketNumber?.trim() || null;

  if (ticketId || ticketNumber) {
    const existingOpenSession = await prisma.remoteSession.findFirst({
      where: {
        companyId,
        hostId,
        ...buildTicketFilter(ticketId, ticketNumber),
        status: { in: ["REQUESTED", "STARTED"] },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    if (existingOpenSession) {
      logger.warn("remote.sessions.create.duplicate_open_session", {
        companyId,
        hostId,
        ticketId,
        ticketNumber,
        existingSessionId: existingOpenSession.id,
      });
      return NextResponse.json(
        { success: false, error: "Ja existe sessao aberta para este ticket e host.", data: existingOpenSession },
        { status: 409, headers: responseHeaders }
      );
    }
  }

  const remoteSession = await prisma.remoteSession.create({
    data: {
      companyId,
      ticketId,
      ticketNumber,
      hostId,
      requestedByUserId: session.userId,
      reason: body.reason?.trim() || null,
      status: "REQUESTED",
      expiresAt: buildRequestedSessionExpiresAt(),
    },
  });

  logger.info("remote.sessions.create.succeeded", {
    sessionId: remoteSession.id,
    companyId,
    hostId,
    actorUserId: session.userId,
    ticketId,
    ticketNumber,
  });

  return NextResponse.json({ success: true, data: remoteSession }, { status: 201, headers: responseHeaders });
}
