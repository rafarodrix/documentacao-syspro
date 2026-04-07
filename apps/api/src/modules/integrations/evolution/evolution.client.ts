import { readEvolutionRuntimeConfig } from "@dosc-syspro/config";

type EvolutionConfig = ReturnType<typeof readEvolutionRuntimeConfig>;

export function readEvolutionConfigFromRuntime(): EvolutionConfig {
  return readEvolutionRuntimeConfig();
}

export class EvolutionClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly instance: string,
  ) {}

  static fromRuntime(): EvolutionClient {
    const config = readEvolutionConfigFromRuntime();
    return new EvolutionClient(config.apiUrl, config.apiKey, config.instance);
  }

  async sendTextMessage(number: string, text: string): Promise<void> {
    if (!this.baseUrl || !this.apiKey) {
      console.warn("[EvolutionClient] Credenciais ausentes. Envio de mensagem ignorado.");
      return;
    }

    const response = await fetch(`${this.baseUrl}/message/sendText/${this.instance}`, {
      method: "POST",
      headers: {
        apikey: this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: this.normalizeNumber(number),
        text,
        delay: 1200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown_error");
      throw new Error(`Evolution send failed: ${response.status} - ${errorText}`);
    }
  }

  async findContacts(instanceOverride?: string): Promise<any[]> {
    if (!this.baseUrl || !this.apiKey) {
      console.warn("[EvolutionClient] Credenciais ausentes. Busca de contatos ignorada.");
      return [];
    }

    const instance = this.resolveInstance(instanceOverride);
    const response = await fetch(`${this.baseUrl}/chat/findContacts/${instance}`, {
      method: "GET",
      headers: {
        apikey: this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown_error");
      throw new Error(`Evolution contacts failed: ${response.status} - ${errorText}`);
    }

    const payload = await response.json().catch(() => []);
    return Array.isArray(payload) ? payload : [];
  }

  private resolveInstance(instanceOverride?: string): string {
    const resolved = instanceOverride?.trim() || this.instance?.trim();
    if (!resolved) {
      throw new Error("Evolution instance nao configurada.");
    }
    return resolved;
  }

  private normalizeNumber(number: string): string {
    const digits = number.replace(/\D/g, "");
    if (!digits) return digits;
    return digits.startsWith("55") ? digits : `55${digits}`;
  }
}
