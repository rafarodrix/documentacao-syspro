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

    const normalizedNumber = this.normalizeNumber(number);
    const instance = this.resolveInstance();
    const baseUrl = this.baseUrl.replace(/\/+$/, "");

    const requestBody = {
      id: instance,
      number: normalizedNumber,
      text,
      delay: 1200,
    };

    const endpoints = [
      `${baseUrl}/send/text`,
      `${baseUrl}/message/sendText/${instance}`,
    ];

    let lastError: string | null = null;
    for (let index = 0; index < endpoints.length; index += 1) {
      const response = await fetch(endpoints[index], {
        method: "POST",
        headers: {
          apikey: this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        return;
      }

      const errorText = await response.text().catch(() => "unknown_error");
      lastError = `${response.status} - ${errorText}`;

      const isNotFound = response.status === 404;
      const hasFallback = index < endpoints.length - 1;
      if (!(isNotFound && hasFallback)) {
        break;
      }
    }

    throw new Error(`Evolution send failed: ${lastError ?? "unknown_error"}`);
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
