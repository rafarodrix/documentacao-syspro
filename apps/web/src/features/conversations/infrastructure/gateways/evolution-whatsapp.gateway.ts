/**
 * Gateway para integracao com WhatsApp via Evolution API.
 * Gerencia o envio de mensagens e tratamento de respostas da API.
 */
import { hasEvolutionApiCredentials, readEvolutionConfig } from "@dosc-syspro/api/services/evolution-config";

interface EvolutionSendTextResponse {
  success?: boolean;
  message?: string;
  messageId?: string;
  key?: {
    id?: string;
  };
}

export class EvolutionWhatsAppGateway {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly instance: string;

  constructor() {
    const config = readEvolutionConfig(process.env);
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.instance = config.instance;
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
    if (!hasEvolutionApiCredentials({ apiUrl: this.apiUrl, apiKey: this.apiKey })) {
      return { success: false, error: "Configuracao Evolution API ausente no servidor" };
    }

    const number = this.normalizeNumber(to);
    const endpoint = `${this.apiUrl}/send/text`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": this.apiKey,
        },
        body: JSON.stringify({
          id: this.instance,
          number,
          text,
          delay: 1200,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Erro Evolution API:", errorData);
        return { success: false, error: `API Error: ${response.status} - ${JSON.stringify(errorData)}` };
      }

      const result = await response.json() as EvolutionSendTextResponse;
      return { success: true, messageId: result.messageId || result.key?.id };
    } catch (error) {
      console.error("Excecao ao enviar mensagem WhatsApp:", error);
      return { success: false, error: "Falha na comunicacao com Evolution API" };
    }
  }
}

export const evolutionWhatsApp = new EvolutionWhatsAppGateway();
