type EvolutionConfig = {
  apiUrl: string;
  apiKey: string;
  instance: string;
  webhookSecret: string;
};

function readRuntimeEnv(): Record<string, string | undefined> {
  const runtime = globalThis as Record<string, unknown>;
  const processLike = runtime["process"] as { env?: Record<string, string | undefined> } | undefined;
  return processLike?.env ?? {};
}

export function readEvolutionConfigFromRuntime(): EvolutionConfig {
  const env = readRuntimeEnv();
  return {
    apiUrl: env.EVOLUTION_API_URL?.trim() ?? "",
    apiKey: env.EVOLUTION_API_KEY?.trim() ?? "",
    instance: env.EVOLUTION_INSTANCE?.trim() || "Syspro",
    webhookSecret: env.EVOLUTION_WEBHOOK_SECRET?.trim() ?? "",
  };
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

    const response = await fetch(`${this.baseUrl}/send/text`, {
      method: "POST",
      headers: {
        apikey: this.apiKey,
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
      const errorText = await response.text().catch(() => "unknown_error");
      throw new Error(`Evolution send failed: ${response.status} - ${errorText}`);
    }
  }

  private normalizeNumber(number: string): string {
    const digits = number.replace(/\D/g, "");
    if (!digits) return digits;
    return digits.startsWith("55") ? digits : `55${digits}`;
  }
}
