import { Injectable } from "@nestjs/common";
import { ConversationStatus } from "@prisma/client";
import { PrismaService } from "./prisma/prisma.service";
import { ZammadClient } from "./integrations/zammad.client";

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

@Injectable()
export class WhatsAppInboundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly zammadClient: ZammadClient
  ) {}

  async handleInboundMessage(input: WhatsAppInboundMessageInput): Promise<WhatsAppInboundResult> {
    try {
      const normalizedPhone = normalizePhone(input.phone);
      const text = input.text.trim();
      const externalMessageId = input.externalMessageId?.trim() || null;

      if (!text) {
        return { success: false, error: "Mensagem sem conteudo textual." };
      }

      if (externalMessageId) {
        const duplicated = await this.prisma.conversationMessage.findFirst({
          where: { externalMessageId },
          select: { id: true },
        });

        if (duplicated) {
          return { success: true, duplicate: true };
        }
      }

      const contact = await this.prisma.companyContact.findFirst({
        where: {
          OR: [
            { whatsapp: normalizedPhone },
            { phone: normalizedPhone },
            { whatsapp: { endsWith: normalizedPhone.substring(Math.max(0, normalizedPhone.length - 8)) } },
          ],
          status: "LINKED",
        },
        include: {
          company: true,
        },
      });

      const activeConversation = await this.prisma.conversation.findFirst({
        where: {
          contactWhatsappSnapshot: normalizedPhone,
          status: { in: ACTIVE_CONVERSATION_STATUSES },
        },
        orderBy: { lastMessageAt: "desc" },
      });

      const conversation = activeConversation
        ? activeConversation
        : await this.prisma.conversation.create({
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
        await this.prisma.conversationQueueEvent.create({
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

      await this.prisma.conversationMessage.create({
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

      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessagePreview: text.substring(0, 100),
          lastMessageAt: new Date(),
          lastInboundAt: new Date(),
        },
      });

      if (!contact) {
        return { success: false, error: "Contato nao identificado no portal." };
      }

      const clientEmail = contact.email || `${normalizedPhone}@whatsapp.trilink.com.br`;
      const isClosureCommand = text.toLowerCase().includes("#resolvido") || text.toLowerCase().includes("#fechar");

      if (isClosureCommand) {
        const activeTicketsForClosure = await this.zammadClient.getTicketsForCustomerEmailsPaged([clientEmail], 1);
        if (activeTicketsForClosure.length > 0) {
          const ticket = activeTicketsForClosure[0];
          await this.zammadClient.addTicketReply(
            ticket.id,
            "<b>Finalizacao via WhatsApp:</b> O cliente confirmou a resolucao do problema (#resolvido)."
          );
          await this.zammadClient.updateTicket(ticket.id, { state_id: 4 });
          return { success: true, ticketNumber: ticket.number };
        }
        return { success: false, error: "Nao foi encontrado chamado aberto para finalizar." };
      }

      const openTickets = await this.zammadClient.getTicketsForCustomerEmailsPaged([clientEmail], 1);
      if (openTickets.length > 0) {
        const existingTicket = openTickets[0];
        await this.zammadClient.addTicketReply(existingTicket.id, `<b>Mensagem via WhatsApp:</b><br/>${text}`);

        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            ticketId: String(existingTicket.id),
            ticketNumber: String(existingTicket.number),
            status: "IN_PROGRESS",
          },
        });

        return { success: true, ticketNumber: existingTicket.number };
      }

      const newTicketResponse = await this.zammadClient.createTicket({
        title: `Suporte WhatsApp: ${contact.company.nomeFantasia}`,
        group: "Users",
        customer: clientEmail,
        priority_id: 2,
        article: {
          subject: "Abertura via WhatsApp",
          body: `<b>Mensagem de abertura:</b><br/>${text}`,
          type: "note",
          internal: false,
        },
      }) as { id?: number; number?: string | number };

      if (newTicketResponse && newTicketResponse.number) {
        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            ticketId: newTicketResponse.id ? String(newTicketResponse.id) : null,
            ticketNumber: String(newTicketResponse.number),
            status: "IN_PROGRESS",
          },
        });
        return { success: true, ticketNumber: String(newTicketResponse.number) };
      }

      return { success: false, error: "Erro ao criar ticket no Zammad." };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}

