import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { buildStartedSessionExpiresAt } from "@/features/remote/application/session-policy";
import { ZammadGateway } from "@/features/tickets/infrastructure/gateways/zammad-gateway";
import { createRequestLogger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

function buildStartNote(input: {
  sessionId: string;
  ticketNumber: string | null;
  hostName: string;
  companyName: string;
  operatorName: string;
}) {
  const ticketLine = input.ticketNumber ? `<strong>Ticket:</strong> #${input.ticketNumber}<br />` : "";
  return [
    "<p><strong>Sessao remota iniciada</strong></p>",
    `<p>${ticketLine}<strong>Host:</strong> ${input.hostName}<br /><strong>Empresa:</strong> ${input.companyName}<br /><strong>Operador:</strong> ${input.operatorName}<br /><strong>Sessao:</strong> ${input.sessionId}</p>`,
  ].join("");
}

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

  const remoteSession = await prisma.remoteSession.findFirst({
    where: tenantScope.isGlobalView
      ? { id }
      : { id, companyId: { in: tenantScope.companyIds.length ? tenantScope.companyIds : ["__none__"] } },
    select: {
      id: true,
      status: true,
      ticketId: true,
      ticketNumber: true,
      host: { select: { id: true, name: true, agentExternalId: true, status: true } },
      company: { select: { nomeFantasia: true, razaoSocial: true } },
    },
  });

  if (!remoteSession) {
    logger.warn("remote.sessions.start.not_found", { sessionId: id });
    return NextResponse.json({ success: false, error: "Sessao nao encontrada." }, { status: 404, headers: responseHeaders });
  }

  if (remoteSession.status !== "REQUESTED") {
    logger.warn("remote.sessions.start.invalid_status", {
      sessionId: id,
      status: remoteSession.status,
    });
    return NextResponse.json({ success: false, error: "Apenas sessoes REQUESTED podem ser iniciadas." }, { status: 409, headers: responseHeaders });
  }

  if (remoteSession.host.status === "ACTIVE" && !remoteSession.host.agentExternalId) {
    logger.warn("remote.sessions.start.host_misconfigured", {
      sessionId: id,
      hostId: remoteSession.host.id,
    });
    return NextResponse.json(
      { success: false, error: "Host ativo sem ID RustDesk configurado." },
      { status: 409, headers: responseHeaders }
    );
  }

  const existingStartedSession = await prisma.remoteSession.findFirst({
    where: {
      hostId: remoteSession.host.id,
      status: "STARTED",
      id: { not: remoteSession.id },
    },
    select: { id: true, ticketNumber: true },
  });

  if (existingStartedSession) {
    logger.warn("remote.sessions.start.concurrent_blocked", {
      sessionId: id,
      hostId: remoteSession.host.id,
      existingSessionId: existingStartedSession.id,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Ja existe sessao iniciada para este host.",
        data: existingStartedSession,
      },
      { status: 409, headers: responseHeaders }
    );
  }

  const updated = await prisma.remoteSession.update({
    where: { id },
    data: {
      status: "STARTED",
      startedAt: new Date(),
      expiresAt: buildStartedSessionExpiresAt(),
      startedByUserId: session.userId,
    },
  });

  if (remoteSession.ticketId) {
    try {
      await ZammadGateway.addInternalTicketNote(
        remoteSession.ticketId,
        buildStartNote({
          sessionId: updated.id,
          ticketNumber: remoteSession.ticketNumber,
          hostName: remoteSession.host.name,
          companyName: remoteSession.company.nomeFantasia ?? remoteSession.company.razaoSocial ?? "Empresa sem nome",
          operatorName: session.name ?? session.email ?? session.userId,
        })
      );
    } catch (error) {
      logger.error("remote.sessions.start.zammad_note_failed", error, {
        sessionId: updated.id,
        ticketId: remoteSession.ticketId,
      });
    }
  }

  logger.info("remote.sessions.start.succeeded", {
    sessionId: updated.id,
    actorUserId: session.userId,
    hostId: remoteSession.host.id,
    ticketId: remoteSession.ticketId,
    ticketNumber: remoteSession.ticketNumber,
  });

  return NextResponse.json({ success: true, data: updated }, { headers: responseHeaders });
}
