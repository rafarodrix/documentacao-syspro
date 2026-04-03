import { ZammadGateway } from "@/features/tickets/infrastructure/gateways/zammad-gateway";
import { prisma } from "@/lib/prisma";

export class WhatsAppInboundService {
  /**
   * Processa uma mensagem recebida via WhatsApp (Evolution API).
   * 1. Identifica o contato pelo telefone.
   * 2. Garante que existe um usuario no Zammad.
   * 3. Abre um novo ticket ou atualiza um existente.
   */
  async handleInboundMessage(phone: string, message: string, contactName?: string): Promise<{ success: boolean; ticketNumber?: string; error?: string }> {
    try {
      console.log(`[WhatsAppInbound] Recebida mensagem de ${phone}: ${message.substring(0, 50)}...`);

      // 1. Identifica o contato localmente
      // Remove prefixos comuns (ex: 55) se necessario, mas a Evolution ja envia limpo ou com DDI
      const normalizedPhone = phone.replace(/\D/g, "");
      
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

      if (!contact) {
        console.warn(`[WhatsAppInbound] Contato nao identificado para o telefone: ${phone}`);
        return { success: false, error: "Contato nao identificado no portal." };
      }

      const clientEmail = contact.email || `${normalizedPhone}@whatsapp.trilink.com.br`;
      const clientName = contactName || contact.name;

      // --- TRATAMENTO DE COMANDOS (Fase 7) ---
      const isClosureCommand = message.toLowerCase().includes("#resolvido") || message.toLowerCase().includes("#fechar");
      
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
          `<b>Mensagem via WhatsApp:</b><br/>${message}`
        );

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
          body: `<b>Mensagem de abertura:</b><br/>${message}`,
          type: "note",
          internal: false,
        },
      };

      const newTicketResponse = await ZammadGateway.createTicket(ticketPayload) as any;
      
      if (newTicketResponse && newTicketResponse.number) {
        console.log(`[WhatsAppInbound] Novo ticket criado: #${newTicketResponse.number}`);
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
