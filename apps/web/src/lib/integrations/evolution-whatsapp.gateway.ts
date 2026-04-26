/**
 * Gateway para envio de mensagens WhatsApp via apps/api.
 * O apps/web nao deve acessar Evolution API diretamente.
 */
import { callWebApi } from "@/lib/web-api";

export class EvolutionWhatsAppGateway {
  async sendTextMessage(to: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await callWebApi("/api/platform/integrations/evolution/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to, text }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        return {
          success: false,
          error: payload?.error || "BACKEND_ERROR",
        };
      }

      return {
        success: true,
        messageId: payload?.messageId,
      };
    } catch (error) {
      console.error("Excecao ao enviar mensagem WhatsApp:", error);
      return { success: false, error: "BACKEND_ERROR" };
    }
  }
}

export const evolutionWhatsApp = new EvolutionWhatsAppGateway();
