import { ZammadGateway } from "@/features/tickets/infrastructure/gateways/zammad-gateway";
import { evolutionWhatsApp } from "@/features/conversations/infrastructure/gateways/evolution-whatsapp.gateway";

export type TicketNotificationType = "CREATED" | "UPDATED" | "RESOLVED";

export class TicketNotificationService {
  /**
   * Notifica um cliente via WhatsApp sobre uma mudanca no seu chamado.
   */
  async notifyClient(email: string, ticketNumber: string, type: TicketNotificationType): Promise<boolean> {
    try {
      // 1. Busca o usuario no Zammad para obter o telefone
      const user = await ZammadGateway.getUserByEmail(email);
      
      if (!user) {
        console.warn(`[Notification] Usuario nao encontrado para o e-mail: ${email}`);
        return false;
      }

      // 2. Resolve o numero de telefone (prioriza mobile)
      const phone = user.mobile || user.phone;
      
      if (!phone) {
        console.warn(`[Notification] Usuario ${email} nao possui telefone cadastrado no Zammad.`);
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
        return `✅ *Novo Chamado Aberto*\n\nOlá! Seu chamado *#${ticketNumber}* foi registrado com sucesso em nossa central.\n\nVocê pode acompanhar o andamento pelo portal:\n${baseUrl}/portal/chamados`;
      
      case "UPDATED":
        return `📩 *Nova Resposta no Chamado*\n\nOlá! Há uma nova atualização no seu chamado *#${ticketNumber}*.\n\nConfira os detalhes no portal:\n${baseUrl}/portal/chamados`;
      
      case "RESOLVED":
        return `🎉 *Chamado Finalizado*\n\nOlá! O seu chamado *#${ticketNumber}* foi marcado como resolvido.\n\nCaso precise de mais ajuda, você pode reabri-lo pelo portal:\n${baseUrl}/portal/chamados`;
      
      default:
        return `ℹ️ *Atualização de Chamado*\n\nO chamado *#${ticketNumber}* teve uma atualização de status.\n\nConfira no portal: ${baseUrl}/portal/chamados`;
    }
  }
}

export const ticketNotificationService = new TicketNotificationService();
