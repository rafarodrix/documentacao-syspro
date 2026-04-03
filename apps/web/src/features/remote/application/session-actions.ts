"use server";

import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { sessionEvents } from "@/features/remote/infrastructure/events/session-events";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";

/**
 * Solicita o inicio de uma sessao remota.
 * Cria o registro de auditoria e emite evento para o barramento SSE.
 */
export async function requestRemoteSessionAction(input: {
  hostId: string;
  companyId: string;
  ticketId?: string | null;
  ticketNumber?: string | null;
  reason?: string | null;
}) {
  const session = await getProtectedSession();
  if (!session) {
    return { success: false, error: "Nao autorizado" };
  }

  // Apenas perfis tecnicos podem solicitar sessoes por enquanto
  if (session.role === Role.CLIENTE_USER) {
    return { success: false, error: "Apenas administradores ou suporte podem iniciar sessoes" };
  }

  try {
    const remoteSession = await prisma.remoteSession.create({
      data: {
        hostId: input.hostId,
        companyId: input.companyId,
        ticketId: input.ticketId ?? null,
        ticketNumber: input.ticketNumber ?? null,
        requestedByUserId: session.userId,
        status: "REQUESTED",
        reason: input.reason ?? "Acesso solicitado via portal",
      },
      include: {
        host: { select: { name: true } },
      },
    });

    // Emite evento para os interessados (contadores, dashboards live)
    sessionEvents.emitSessionChange({
      sessionId: remoteSession.id,
      hostId: remoteSession.hostId,
      companyId: remoteSession.companyId,
      status: remoteSession.status,
      ticketNumber: remoteSession.ticketNumber,
      timestamp: new Date().toISOString(),
    });

    revalidatePath("/portal/plataforma-remota/sessoes");
    revalidatePath(`/portal/plataforma-remota/hosts/${input.hostId}`);

    return { 
      success: true, 
      data: remoteSession,
      // Retorna o deep link que o RustDesk deve usar
      deepLink: `rustdesk://${remoteSession.id}` // Aqui o RustDesk deve saber resolver o ID da sessao ou do host?
      // Nota: Na arquitetura atual, o RustDesk conecta no ID da maquina. 
      // Mas para auditoria, queremos que ele registre o ID da sessao.
    };
  } catch (error) {
    console.error("Erro ao solicitar sessao remota:", error);
    return { success: false, error: "Falha ao registrar solicitacao de sessao" };
  }
}

/**
 * Encerra uma sessao remota manualmente ou via webhook.
 */
export async function stopRemoteSessionAction(sessionId: string) {
  const session = await getProtectedSession();
  if (!session) {
    return { success: false, error: "Nao autorizado" };
  }

  try {
    const current = await prisma.remoteSession.findUnique({
      where: { id: sessionId },
      select: { status: true, hostId: true, companyId: true, ticketNumber: true }
    });

    if (!current) {
      return { success: false, error: "Sessao nao encontrada" };
    }

    if (current.status === "ENDED") {
      return { success: true, message: "Sessao ja encerrada" };
    }

    const updated = await prisma.remoteSession.update({
      where: { id: sessionId },
      data: {
        status: "ENDED",
        endedAt: new Date(),
      },
    });

    // Emite evento de encerramento
    sessionEvents.emitSessionChange({
      sessionId: updated.id,
      hostId: updated.hostId,
      companyId: updated.companyId,
      status: updated.status,
      ticketNumber: updated.ticketNumber,
      timestamp: new Date().toISOString(),
    });

    revalidatePath("/portal/plataforma-remota/sessoes");
    revalidatePath(`/portal/plataforma-remota/hosts/${updated.hostId}`);

    return { success: true };
  } catch (error) {
    console.error("Erro ao encerrar sessao remota:", error);
    return { success: false, error: "Falha ao encerrar sessao" };
  }
}
