import { ZammadGateway } from "@/features/tickets/infrastructure/gateways/zammad-gateway";
import { evolutionWhatsApp } from "@/features/conversations/infrastructure/gateways/evolution-whatsapp.gateway";
import { prisma } from "@/lib/prisma";

export type TicketNotificationType = "CREATED" | "UPDATED" | "RESOLVED";

export class TicketNotificationService {
  /**
   * Notifica um cliente via WhatsApp sobre uma mudanca no seu chamado.
   */
  async notifyClient(email: string, ticketNumber: string, type: TicketNotificationType): Promise<boolean> {
    try {
      let phone: string | null = null;

      // 1. Tenta resolver localmente primeiro (User.phone ou CompanyContact.whatsapp)
      const localUser = await prisma.user.findFirst({
        where: { email: email.toLowerCase(), isActive: true, deletedAt: null },
        select: { phone: true }
      });
      
      if (localUser?.phone) {
        phone = localUser.phone;
        console.log(`[Notification] Usando telefone local do usuario: ${phone}`);
      } else {
        const localContact = await prisma.companyContact.findFirst({
          where: { email: email.toLowerCase(), status: "LINKED" },
          select: { whatsapp: true }
        });
        
        if (localContact?.whatsapp) {
          phone = localContact.whatsapp;
          console.log(`[Notification] Usando WhatsApp local do contato: ${phone}`);
        }
      }

      // 2. Fallback: Busca o usuario no Zammad se nao tiver local
      if (!phone) {
        const zammadUser = await ZammadGateway.getUserByEmail(email);
        if (zammadUser) {
          phone = zammadUser.mobile || zammadUser.phone || null;
          if (phone) {
            console.log(`[Notification] Usando telefone do Zammad: ${phone}`);
          }
        }
      }
      
      if (!phone) {
        console.warn(`[Notification] Telefone nao encontrado para o e-mail: ${email} (Local/Zammad)`);
        return false;
      }

      // 3. Monta a mensagem baseada no tipo
      const message = this.buildMessage(ticketNumber, type);

      // 4. Envia via Evolution API
      const result = await evolutionWhatsApp.sendTextMessage(phone, message);
      
      if (!result.success) {
        console.error(`[Notification] Falha ao enviar WhatsApp para ${phone}: ${result.error}`);
        return false;
      }

      console.log(`[Notification] WhatsApp enviado com sucesso para ${email} (Ticket #${ticketNumber})`);
      return true;
    } catch (error) {
      console.error("[Notification] Erro ao processar notificacao de ticket:", error);
      return false;
    }
  }

  private buildMessage(ticketNumber: string, type: TicketNotificationType): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://portal.syspro.com.br";
    
    switch (type) {
      case "CREATED":
        return `âœ… *Novo Chamado Aberto*\n\nOlÃ¡! Seu chamado *#${ticketNumber}* foi registrado com sucesso em nossa central.\n\nVocÃª pode acompanhar o andamento pelo portal:\n${baseUrl}/portal/tickets`;
      
      case "UPDATED":
        return `ðŸ“© *Nova Resposta no Chamado*\n\nOlÃ¡! HÃ¡ uma nova atualizaÃ§Ã£o no seu chamado *#${ticketNumber}*.\n\nConfira os detalhes no portal:\n${baseUrl}/portal/tickets`;
      
      case "RESOLVED":
        return `ðŸŽ‰ *Chamado Finalizado*\n\nOlÃ¡! O seu chamado *#${ticketNumber}* foi marcado como resolvido.\n\nCaso precise de mais ajuda, vocÃª pode reabri-lo pelo portal:\n${baseUrl}/portal/tickets`;
      
      default:
        return `â„¹ï¸ *AtualizaÃ§Ã£o de Chamado*\n\nO chamado *#${ticketNumber}* teve uma atualizaÃ§Ã£o de status.\n\nConfira no portal: ${baseUrl}/portal/tickets`;
    }
  }
}

export const ticketNotificationService = new TicketNotificationService();

