import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { ZammadGateway } from "@/features/tickets/infrastructure/gateways/zammad-gateway";

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

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
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
      host: { select: { name: true } },
      company: { select: { nomeFantasia: true, razaoSocial: true } },
    },
  });

  if (!remoteSession) {
    return NextResponse.json({ success: false, error: "Sessao nao encontrada." }, { status: 404 });
  }

  if (remoteSession.status !== "REQUESTED") {
    return NextResponse.json({ success: false, error: "Apenas sessoes REQUESTED podem ser iniciadas." }, { status: 409 });
  }

  const updated = await prisma.remoteSession.update({
    where: { id },
    data: {
      status: "STARTED",
      startedAt: new Date(),
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
      console.error("Falha ao registrar nota interna no Zammad ao iniciar sessao remota:", error);
    }
  }

  return NextResponse.json({ success: true, data: updated });
}
