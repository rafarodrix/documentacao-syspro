import { ZammadGateway } from "@/features/tickets/infrastructure/gateways/zammad-gateway";
import { prisma } from "@/lib/prisma";
import { ConversationStatus } from "@prisma/client";

type WhatsAppInboundMessageInput = {
  phone: string;
  text: string;
  contactName?: string;
  externalMessageId?: string | null;
  providerPayload?: unknown;
};

type WhatsAppInboundResult = {
  success: boolean;
  ticketNumber?: string;
  error?: string;
  duplicate?: boolean;
};

const ACTIVE_CONVERSATION_STATUSES: ConversationStatus[] = [
  "NEW",
  "UNASSIGNED",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
];

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export class WhatsAppInboundService {
  /**
   * Processa uma mensagem recebida via WhatsApp (Evolution API).
   * 1. Identifica o contato pelo telefone.
   * 2. Garante que existe um usuario no Zammad.
   * 3. Abre um novo ticket ou atualiza um existente.
   */
  async handleInboundMessage(input: WhatsAppInboundMessageInput): Promise<WhatsAppInboundResult> {
    try {
      const normalizedPhone = normalizePhone(input.phone);
      const text = input.text.trim();
      const externalMessageId = input.externalMessageId?.trim() || null;

      console.log(`[WhatsAppInbound] Recebida mensagem de ${normalizedPhone}: ${text.substring(0, 50)}...`);

      if (!text) {
        return { success: false, error: "Mensagem sem conteudo textual." };
      }

      if (externalMessageId) {
        const duplicated = await prisma.conversationMessage.findFirst({
          where: { externalMessageId },
          select: { id: true },
        });

        if (duplicated) {
          return { success: true, duplicate: true };
        }
      }

      // 1. Identifica o contato localmente
      const contact = await prisma.companyContact.findFirst({
        where: {
          OR: [
            { whatsapp: normalizedPhone },
            { phone: normalizedPhone },
            { whatsapp: { endsWith: normalizedPhone.substring(normalizedPhone.length - 8) } }
          ],
          status: "LINKED"
        },
        include: {
          company: true
        }
      });

      const activeConversation = await prisma.conversation.findFirst({
        where: {
          contactWhatsappSnapshot: normalizedPhone,
          status: { in: ACTIVE_CONVERSATION_STATUSES },
        },
        orderBy: { lastMessageAt: "desc" },
      });

      const conversation = activeConversation
        ? activeConversation
        : await prisma.conversation.create({
            data: {
              channel: "WHATSAPP",
              status: contact ? "NEW" : "UNASSIGNED",
              entryPoint: "INBOUND",
              companyId: contact?.companyId ?? null,
              companyContactId: contact?.id ?? null,
              contactNameSnapshot: input.contactName || contact?.name || "Contato WhatsApp",
              contactWhatsappSnapshot: normalizedPhone,
              lastMessagePreview: text.substring(0, 100),
              lastMessageAt: new Date(),
              lastInboundAt: new Date(),
              metadata: {
                source: "evolution-webhook",
              },
            },
          });

      if (!activeConversation) {
        await prisma.conversationQueueEvent.create({
          data: {
            conversationId: conversation.id,
            queueKey: "new",
            metadata: {
              source: "evolution-webhook",
              reason: "first-inbound-message",
            },
          },
        });
      }

      await prisma.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          direction: "INBOUND",
          type: "TEXT",
          authorKind: "EXTERNAL",
          body: text,
          externalMessageId,
          status: "DELIVERED",
          deliveredAt: new Date(),
          metadata: {
            source: "evolution-webhook",
            unresolvedContact: !contact,
            providerPayload: input.providerPayload ?? null,
          },
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessagePreview: text.substring(0, 100),
          lastMessageAt: new Date(),
          lastInboundAt: new Date(),
        },
      });

      if (!contact) {
        console.warn(`[WhatsAppInbound] Contato nao identificado para o telefone: ${normalizedPhone}`);
        return { success: false, error: "Contato nao identificado no portal." };
      }

      const clientEmail = contact.email || `${normalizedPhone}@whatsapp.trilink.com.br`;

      // --- TRATAMENTO DE COMANDOS (Fase 7) ---
      const isClosureCommand = text.toLowerCase().includes("#resolvido") || text.toLowerCase().includes("#fechar");
      
      if (isClosureCommand) {
        const activeTicketsForClosure = await ZammadGateway.getTicketsForCustomerEmailsPaged([clientEmail], {
          stateIds: [1, 2, 4], // new, open, pending
          limit: 1
        });

        if (activeTicketsForClosure.length > 0) {
          const ticket = activeTicketsForClosure[0];
          console.log(`[WhatsAppInbound] Comando de fechamento detectado para ticket #${ticket.number}`);
          
          await ZammadGateway.addTicketReply(ticket.id, "<b>Finalização via WhatsApp:</b> O cliente confirmou a resolução do problema (#resolvido).");
          await ZammadGateway.updateTicket(ticket.id, { state_id: 4 }); // 4 = closed

          return { success: true, ticketNumber: ticket.number };
        } else {
          return { success: false, error: "Não foi encontrado nenhum chamado aberto para finalizar com este comando." };
        }
      }

      // 2. Garante usuario no Zammad
      let zammadUserId = await ZammadGateway.getUserIdByEmail(clientEmail);
      
      if (!zammadUserId) {
        console.log(`[WhatsAppInbound] Criando usuario no Zammad para ${clientEmail}`);
        // Se nao existe, o Zammad cria automaticamente ao abrir o ticket se enviarmos os dados do customer
      }

      // 3. Busca tickets ABERTOS para este usuario
      // OPERATIONAL_STATE_IDS: [1, 2, 4] (new, open, pending)
      const openTickets = await ZammadGateway.getTicketsForCustomerEmailsPaged([clientEmail], {
        stateIds: [1, 2, 4],
        limit: 1
      });

      if (openTickets.length > 0) {
        const existingTicket = openTickets[0];
        console.log(`[WhatsAppInbound] Atualizando ticket existente #${existingTicket.number}`);
        
        await ZammadGateway.addTicketReply(
          existingTicket.id,
          `<b>Mensagem via WhatsApp:</b><br/>${text}`
        );

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            ticketId: String(existingTicket.id),
            ticketNumber: String(existingTicket.number),
            status: "IN_PROGRESS",
          },
        });

        return { success: true, ticketNumber: existingTicket.number };
      }

      // 4. Cria NOVO ticket
      console.log(`[WhatsAppInbound] Abrindo NOVO ticket para ${contact.company.nomeFantasia}`);
      
      const ticketPayload = {
        title: `Suporte WhatsApp: ${contact.company.nomeFantasia}`,
        group: "Users", // TODO: Tornar configuravel ou buscar do catalogo
        customer: clientEmail,
        priority_id: 2, // 2 = normal
        article: {
          subject: "Abertura via WhatsApp",
          body: `<b>Mensagem de abertura:</b><br/>${text}`,
          type: "note",
          internal: false,
        },
      };

      const newTicketResponse = await ZammadGateway.createTicket(ticketPayload) as any;
      
      if (newTicketResponse && newTicketResponse.number) {
        console.log(`[WhatsAppInbound] Novo ticket criado: #${newTicketResponse.number}`);

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            ticketId: newTicketResponse.id ? String(newTicketResponse.id) : null,
            ticketNumber: String(newTicketResponse.number),
            status: "IN_PROGRESS",
          },
        });

        return { success: true, ticketNumber: newTicketResponse.number };
      }

      return { success: false, error: "Erro ao criar ticket no Zammad." };
    } catch (error) {
      console.error("[WhatsAppInbound] Erro critico ao processar mensagem:", error);
      return { success: false, error: String(error) };
    }
  }
}

export const whatsAppInboundService = new WhatsAppInboundService();
