"use server";

import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { sessionEvents } from "@/features/remote/infrastructure/events/session-events";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { evolutionWhatsApp } from "@/features/conversations/infrastructure/gateways/evolution-whatsapp.gateway";
import { TicketGateway } from "@/features/tickets/infrastructure/gateways/ticket-gateway";

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

  // Permissao: Apenas perfis tecnicos
  if (session.role === Role.CLIENTE_USER) {
    return { success: false, error: "Apenas administradores ou suporte podem iniciar sessoes" };
  }

  try {
    const remoteSession = await startRemoteSessionService({
      ...input,
      userId: session.userId,
      userName: session.name || "Técnico Trilink",
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
      userName: session.name || "Técnico Trilink",
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
 * Realiza as integracoes de WhatsApp, Zammad e Auditoria.
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
          contacts: {
            where: { isPrimary: true, whatsapp: { not: null } },
            take: 1,
            select: { whatsapp: true, name: true }
          }
        } 
      },
    },
  });

  // 2. Integracao Zammad: Adicionar nota interna de inicio e Sincronizar Owner (Fase 7)
  if (input.ticketId || input.ticketNumber) {
    const ticketExternalId = input.ticketId || input.ticketNumber;
    const zammadNote = `<b>Portal Trilink:</b> Sessão remota iniciada no host <b>${remoteSession.host.name}</b> pelo técnico <b>${input.userName}</b>. Acesso auditado iniciado.`;
    
    // Dispara em background para nao travar o retorno
    (async () => {
      try {
        // Encontra o ID do usuario no Zammad pelo email
        const zammadUserId = await TicketGateway.getUserIdByEmail(input.userEmail);
        
        // Adiciona a nota interna
        await TicketGateway.addInternalTicketNote(ticketExternalId!, zammadNote);
        
        // Se encontramos o usuario, definimos ele como dono do chamado
        if (zammadUserId) {
          await TicketGateway.updateTicket(ticketExternalId!, { owner_id: zammadUserId });
          console.log(`Ticket ${ticketExternalId} atribuido ao tecnico ${input.userEmail} (ID: ${zammadUserId})`);
        }
      } catch (err) {
        console.error(`Erro na integracao Zammad para ticket ${ticketExternalId}:`, err);
      }
    })();
  }

  // 3. Notificacao WhatsApp (Fase 6)
  const primaryContact = remoteSession.company.contacts[0];
  const targetWhatsapp = primaryContact?.whatsapp || remoteSession.company.whatsapp;
  
  if (targetWhatsapp) {
    const techName = input.userName;
    const hostName = remoteSession.host.name;
    const ticketInfo = input.ticketNumber ? ` (Ticket #${input.ticketNumber})` : "";
    
    const message = 
      `💻 *Acesso Remoto Trilink*\n\n` +
      `Olá! O técnico *${techName}* iniciou um acesso remoto na máquina *${hostName}*${ticketInfo}.\n\n` +
      `Este acesso é auditado e faz parte do seu atendimento de suporte.`;

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

  // 4. Emitir evento SSE
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

  // Integracao Zammad: Adicionar nota interna de encerramento
  if (current.ticketId || current.ticketNumber) {
    const ticketExternalId = current.ticketId || current.ticketNumber;
    
    // Calcula duracao se a sessao foi iniciada
    let durationText = "";
    const start = current.startedAt || current.createdAt;
    if (start) {
      const diffMs = now.getTime() - new Date(start).getTime();
      const diffMins = Math.round(diffMs / 60000);
      durationText = ` Duração aproximada: <b>${diffMins} minutos</b>.`;
    }

    // 3. Technical Snapshot (Fase 7)
    let technicalSnapshotText = "";
    try {
      const host = await prisma.remoteHost.findUnique({
        where: { id: current.hostId },
        select: { 
          machineName: true, 
          agentVersion: true, 
          lastKnownIp: true, 
          lastSystemSnapshot: true,
          lastAgentMetrics: true
        }
      });
      
      if (host) {
        const sys = host.lastSystemSnapshot as any || {};
        const cpu = sys.cpuBrand || "N/A";
        const ram = sys.memTotalGb ? `${sys.memTotalGb}GB` : "N/A";
        const os = sys.osRelease || "Windows";
        const ip = host.lastKnownIp || "N/A";
        
        technicalSnapshotText = `<br/><br/><b>Snapshot Técnico (Encerramento):</b><br/>
          • Host: ${host.machineName || current.host.name}<br/>
          • IP: ${ip}<br/>
          • OS: ${os}<br/>
          • CPU: ${cpu}<br/>
          • RAM: ${ram}<br/>
          • Agente: ${host.agentVersion || "v1"}`;
      }
    } catch (err) {
      console.error("Erro ao gerar snapshot técnico para Zammad:", err);
    }

    const zammadNote = `<b>Portal Trilink:</b> Sessão remota encerrada no host <b>${current.host.name}</b> pelo técnico <b>${context.userName}</b>.${durationText}${technicalSnapshotText}`;
    
    TicketGateway.addInternalTicketNote(ticketExternalId!, zammadNote).catch(err => 
      console.error(`Falha ao registrar nota de fim no Zammad para ticket ${ticketExternalId}:`, err)
    );
  }

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


