/**
 * Gateway para envio de mensagens WhatsApp via apps/api.
 * O apps/web nao deve acessar Evolution API diretamente.
 */
import { getBackendApiBaseUrl, withInternalApiHeaders } from "@/lib/backend-api";

export class EvolutionWhatsAppGateway {
  async sendTextMessage(to: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(`${getBackendApiBaseUrl()}/integrations/evolution/messages/send`, {
        method: "POST",
        headers: withInternalApiHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ to, text }),
        cache: "no-store",
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
