import { evolutionWhatsApp } from "@/lib/integrations/evolution-whatsapp.gateway";
import { prisma } from "@/lib/prisma";

export type TicketNotificationType = "CREATED" | "UPDATED" | "RESOLVED";

export class TicketNotificationService {
  async notifyClient(email: string, ticketNumber: string, type: TicketNotificationType): Promise<boolean> {
    try {
      let phone: string | null = null;

      const localUser = await prisma.user.findFirst({
        where: { email: email.toLowerCase(), isActive: true, deletedAt: null },
        select: { phone: true },
      });

      if (localUser?.phone) {
        phone = localUser.phone;
      } else {
        const localContact = await prisma.companyContact.findFirst({
          where: { email: email.toLowerCase(), status: "LINKED" },
          select: { whatsapp: true },
        });
        if (localContact?.whatsapp) {
          phone = localContact.whatsapp;
        }
      }

      if (!phone) {
        console.warn(`[Notification] Telefone nao encontrado para o e-mail: ${email} (base local).`);
        return false;
      }

      const message = this.buildMessage(ticketNumber, type);
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
        return `Novo chamado aberto\n\nSeu chamado #${ticketNumber} foi registrado com sucesso.\n\nAcompanhe no portal:\n${baseUrl}/portal/tickets`;
      case "UPDATED":
        return `Nova resposta no chamado\n\nHa uma atualizacao no chamado #${ticketNumber}.\n\nVeja os detalhes no portal:\n${baseUrl}/portal/tickets`;
      case "RESOLVED":
        return `Chamado finalizado\n\nSeu chamado #${ticketNumber} foi marcado como resolvido.\n\nSe precisar, abra um novo chamado em:\n${baseUrl}/portal/tickets`;
      default:
        return `Atualizacao de chamado\n\nO chamado #${ticketNumber} teve alteracao de status.\n\nPortal: ${baseUrl}/portal/tickets`;
    }
  }
}

export const ticketNotificationService = new TicketNotificationService();
