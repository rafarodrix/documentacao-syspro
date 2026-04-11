"use server";

import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { sessionEvents } from "@/features/remote/infrastructure/events/session-events";
import { revalidatePath } from "next/cache";
import { evolutionWhatsApp } from "@/lib/integrations/evolution-whatsapp.gateway";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://suporte.trilink.com.br";

/**
 * Action do Next.js para solicitar o inicio de uma sessao remota.
 * Atua apenas como "Entry Point" (Controller) para o servico.
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

  if (!(await currentUserHasPermission("tools:all"))) {
    return { success: false, error: "Apenas operadores tecnicos podem iniciar sessoes" };
  }

  try {
    const remoteSession = await startRemoteSessionService({
      ...input,
      userId: session.userId,
      userName: session.name || "Tecnico Trilink",
      userEmail: session.email,
    });

    revalidatePath("/portal/plataforma-remota/sessoes");
    revalidatePath(`/portal/plataforma-remota/hosts/${input.hostId}`);

    return { 
      success: true, 
      data: remoteSession,
      deepLink: `rustdesk://${remoteSession.id}`
    };
  } catch (error) {
    console.error("Erro na requestRemoteSessionAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "Falha ao solicitar sessao" };
  }
}

/**
 * Action do Next.js para encerrar uma sessao remota.
 */
export async function stopRemoteSessionAction(sessionId: string) {
  const session = await getProtectedSession();
  if (!session) {
    return { success: false, error: "Nao autorizado" };
  }

  try {
    const result = await stopRemoteSessionService(sessionId, {
      userId: session.userId,
      userName: session.name || "Tecnico Trilink",
    });

    revalidatePath("/portal/plataforma-remota/sessoes");
    return { success: true };
  } catch (error) {
    console.error("Erro na stopRemoteSessionAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "Falha ao encerrar sessao" };
  }
}

// =========================================================================
// SERVICOS PUROS (PRONTOS PARA NESTJS)
// Estas funcoes nao usam cookies, headers ou next/navigation.
// =========================================================================

/**
 * Servico de inicio de sessao remota.
 * Realiza as integracoes de WhatsApp e auditoria interna.
 */
export async function startRemoteSessionService(input: {
  hostId: string;
  companyId: string;
  userId: string;
  userName: string;
  userEmail: string;
  ticketId?: string | null;
  ticketNumber?: string | null;
  reason?: string | null;
}) {
  // 1. Criar registro no banco
  const remoteSession = await prisma.remoteSession.create({
    data: {
      hostId: input.hostId,
      companyId: input.companyId,
      ticketId: input.ticketId ?? null,
      ticketNumber: input.ticketNumber ?? null,
      requestedByUserId: input.userId,
      status: "REQUESTED",
      reason: input.reason ?? "Acesso solicitado via portal",
    },
    include: {
      host: { select: { name: true } },
      company: { 
        select: { 
          nomeFantasia: true, 
          whatsapp: true,
        } 
      },
    },
  });

  const primaryContact = await prisma.companyContact.findFirst({
    where: {
      whatsapp: { not: null },
      companyLinks: {
        some: {
          companyId: input.companyId,
          isPrimary: true,
        },
      },
    },
    select: { whatsapp: true, name: true },
  });

  // 2. Notificacao WhatsApp
  const targetWhatsapp = primaryContact?.whatsapp || remoteSession.company.whatsapp;
  
  if (targetWhatsapp) {
    const techName = input.userName;
    const hostName = remoteSession.host.name;
    const ticketInfo = input.ticketNumber ? ` (Ticket #${input.ticketNumber})` : "";
    
    const message = 
      `*Acesso Remoto Trilink*\n\n` +
      `Ola! O tecnico *${techName}* iniciou um acesso remoto na maquina *${hostName}*${ticketInfo}.\n\n` +
      `Este acesso e auditado e faz parte do seu atendimento de suporte.`;

    evolutionWhatsApp.sendTextMessage(targetWhatsapp, message).then(async (result) => {
      await prisma.remoteSession.update({
        where: { id: remoteSession.id },
        data: {
          metadata: {
            ...(remoteSession.metadata as any || {}),
            whatsappNotification: result.success ? "SENT" : "FAILED",
            whatsappMessageId: result.messageId,
            whatsappError: result.error,
            whatsappTarget: targetWhatsapp,
          }
        }
      }).catch(err => console.error("Erro ao atualizar metadados WhatsApp:", err));
    });
  }

  // 3. Emitir evento SSE
  sessionEvents.emitSessionChange({
    sessionId: remoteSession.id,
    hostId: remoteSession.hostId,
    companyId: remoteSession.companyId,
    status: remoteSession.status,
    ticketNumber: remoteSession.ticketNumber,
    timestamp: new Date().toISOString(),
  });

  return remoteSession;
}

/**
 * Servico de encerramento de sessao remota.
 */
export async function stopRemoteSessionService(sessionId: string, context: { userId: string; userName: string }) {
  const current = await prisma.remoteSession.findUnique({
    where: { id: sessionId },
    select: { 
      id: true, 
      status: true, 
      hostId: true, 
      companyId: true, 
      ticketNumber: true, 
      ticketId: true, 
      startedAt: true,
      createdAt: true,
      host: { select: { name: true } } 
    }
  });

  if (!current) throw new Error("Sessao nao encontrada");
  if (current.status === "ENDED") return current;

  const now = new Date();
  const updated = await prisma.remoteSession.update({
    where: { id: sessionId },
    data: {
      status: "ENDED",
      endedAt: now,
    },
  });

  // Emitir evento de encerramento
  sessionEvents.emitSessionChange({
    sessionId: updated.id,
    hostId: updated.hostId,
    companyId: updated.companyId,
    status: updated.status,
    ticketNumber: updated.ticketNumber,
    timestamp: new Date().toISOString(),
  });

  return updated;
}


