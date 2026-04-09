import { hasEvolutionApiCredentials, readEvolutionConfig } from "./evolution-config";

export class WhatsAppService {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly instance: string
  ) {}

  static fromEnv(env: NodeJS.ProcessEnv = process.env): WhatsAppService {
    const config = readEvolutionConfig(env);
    return new WhatsAppService(config.apiUrl, config.apiKey, config.instance);
  }

  async sendMessage(number: string, text: string): Promise<void> {
    if (!hasEvolutionApiCredentials({ apiUrl: this.baseUrl, apiKey: this.apiKey })) {
      console.warn("[WhatsAppService] Credenciais faltando. Pulo de envio de mensagem.");
      return;
    }

    const url = `${this.baseUrl}/send/text`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "apikey": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: this.instance,
        number: this.normalizeNumber(number),
        text,
        delay: 1200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao enviar WhatsApp: ${response.status} - ${errorText}`);
    }
  }

  private normalizeNumber(number: string): string {
    // Remove non-digits and ensure it has the correct format for Evolution Go
    let cleaned = number.replace(/\D/g, "");
    if (!cleaned.startsWith("55")) {
      cleaned = "55" + cleaned;
    }
    return cleaned;
  }
}
