/**
 * Gateway para integracao com WhatsApp via Evolution API.
 * Gerencia o envio de mensagens e tratamento de respostas da API.
 */

interface EvolutionSendTextResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    conversation: string;
  };
  status: string;
}

export class EvolutionWhatsAppGateway {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly instance: string;

  constructor() {
    this.apiUrl = process.env.EVOLUTION_API_URL || "";
    this.apiKey = process.env.EVOLUTION_API_KEY || "";
    this.instance = process.env.EVOLUTION_INSTANCE || "Main";
  }

  /**
   * Normaliza o numero de telefone para o formato exigido pela API (com DDI).
   */
  private normalizeNumber(phone: string): string {
    // Remove tudo que nao for numero
    let cleaned = phone.replace(/\D/g, "");
    
    // Se nao tem DDI (Brasil detectado por tamanho), adiciona 55
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = `55${cleaned}`;
    }
    
    return cleaned;
  }

  /**
   * Envia uma mensagem de texto simples.
   */
  async sendTextMessage(to: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.apiUrl || !this.apiKey) {
      return { success: false, error: "Configuracao Evolution API ausente no servidor" };
    }

    const number = this.normalizeNumber(to);
    const endpoint = `${this.apiUrl}/message/sendText/${this.instance}`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": this.apiKey,
        },
        body: JSON.stringify({
          number: number,
          text: text,
          options: {
            delay: 1200,
            presence: "composing",
            linkPreview: true,
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Erro Evolution API:", errorData);
        return { success: false, error: `API Error: ${response.status} - ${JSON.stringify(errorData)}` };
      }

      const result = await response.json() as EvolutionSendTextResponse;
      return { success: true, messageId: result.key.id };
    } catch (error) {
      console.error("Excecao ao enviar mensagem WhatsApp:", error);
      return { success: false, error: "Falha na comunicacao com Evolution API" };
    }
  }
}

export const evolutionWhatsApp = new EvolutionWhatsAppGateway();
