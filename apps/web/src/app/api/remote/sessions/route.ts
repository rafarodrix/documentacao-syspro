import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getRemoteTenantScope } from "@/features/remote/application/scope";

export const dynamic = "force-dynamic";

function canCreateSession(role: string): boolean {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER" || role === "CLIENTE_ADMIN";
}

function buildTicketFilter(ticketId: string | null, ticketNumber: string | null) {
  if (ticketId) return { ticketId };
  if (ticketNumber) return { ticketNumber };
  return {};
}

export async function GET() {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
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

  return NextResponse.json({ success: true, data: sessions, tenantScope });
}

export async function POST(request: Request) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  if (!canCreateSession(session.role)) {
    return NextResponse.json({ success: false, error: "Sem permissao para abrir sessao." }, { status: 403 });
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
    return NextResponse.json({ success: false, error: "companyId e hostId sao obrigatorios." }, { status: 400 });
  }

  if (!tenantScope.isGlobalView && !tenantScope.companyIds.includes(companyId)) {
    return NextResponse.json({ success: false, error: "Empresa fora do escopo do usuario." }, { status: 403 });
  }

  const host = await prisma.remoteHost.findFirst({
    where: { id: hostId, companyId },
    select: { id: true, companyId: true },
  });

  if (!host) {
    return NextResponse.json({ success: false, error: "Host remoto nao encontrado para a empresa." }, { status: 404 });
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
      return NextResponse.json(
        { success: false, error: "Ja existe sessao aberta para este ticket e host.", data: existingOpenSession },
        { status: 409 }
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
    },
  });

  return NextResponse.json({ success: true, data: remoteSession }, { status: 201 });
}
