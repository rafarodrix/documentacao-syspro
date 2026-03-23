import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { ZammadGateway } from "@/features/tickets/infrastructure/gateways/zammad-gateway";

export const dynamic = "force-dynamic";

function formatDuration(startedAt: Date | null) {
  if (!startedAt) return null;
  const diffMs = Date.now() - startedAt.getTime();
  const totalMinutes = Math.max(1, Math.round(diffMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

function buildStopNote(input: {
  sessionId: string;
  ticketNumber: string | null;
  hostName: string;
  companyName: string;
  operatorName: string;
  duration: string | null;
}) {
  const ticketLine = input.ticketNumber ? `<strong>Ticket:</strong> #${input.ticketNumber}<br />` : "";
  const durationLine = input.duration ? `<strong>Duracao:</strong> ${input.duration}<br />` : "";
  return [
    "<p><strong>Sessao remota encerrada</strong></p>",
    `<p>${ticketLine}<strong>Host:</strong> ${input.hostName}<br /><strong>Empresa:</strong> ${input.companyName}<br /><strong>Operador:</strong> ${input.operatorName}<br />${durationLine}<strong>Sessao:</strong> ${input.sessionId}</p>`,
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
      startedAt: true,
      ticketId: true,
      ticketNumber: true,
      host: { select: { name: true } },
      company: { select: { nomeFantasia: true, razaoSocial: true } },
    },
  });

  if (!remoteSession) {
    return NextResponse.json({ success: false, error: "Sessao nao encontrada." }, { status: 404 });
  }

  if (remoteSession.status !== "STARTED") {
    return NextResponse.json({ success: false, error: "Apenas sessoes STARTED podem ser encerradas." }, { status: 409 });
  }

  const updated = await prisma.remoteSession.update({
    where: { id },
    data: {
      status: "ENDED",
      endedAt: new Date(),
    },
  });

  if (remoteSession.ticketId) {
    try {
      await ZammadGateway.addInternalTicketNote(
        remoteSession.ticketId,
        buildStopNote({
          sessionId: updated.id,
          ticketNumber: remoteSession.ticketNumber,
          hostName: remoteSession.host.name,
          companyName: remoteSession.company.nomeFantasia ?? remoteSession.company.razaoSocial ?? "Empresa sem nome",
          operatorName: session.name ?? session.email ?? session.userId,
          duration: formatDuration(remoteSession.startedAt),
        })
      );
    } catch (error) {
      console.error("Falha ao registrar nota interna no Zammad ao encerrar sessao remota:", error);
    }
  }

  return NextResponse.json({ success: true, data: updated });
}
