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

  async sendTextMessage(number: string, text: string): Promise<{ messageId?: string }> {
    if (!this.baseUrl || !this.apiKey) {
      console.warn("[EvolutionClient] Credenciais ausentes. Envio de mensagem ignorado.");
      return {};
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

    const response = await fetch(`${baseUrl}/send/text`, {
      method: "POST",
      headers: {
        apikey: this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const payload = await response.json().catch(() => ({}));
      return { messageId: this.extractMessageId(payload) };
    }

    const errorText = await response.text().catch(() => "unknown_error");
    throw new Error(`Evolution send failed: ${response.status} - ${errorText}`);
  }

  async sendMedia(
    number: string,
    mediaUrlOrBase64: string,
    mediaType: string,
    fileName?: string,
    caption?: string
  ): Promise<{ messageId?: string }> {
    if (!this.baseUrl || !this.apiKey) {
      console.warn("[EvolutionClient] Credenciais ausentes. Envio de midia ignorado.");
      return {};
    }

    const normalizedNumber = this.normalizeNumber(number);
    const instance = this.resolveInstance();
    const baseUrl = this.baseUrl.replace(/\/+$/, "");

    let evMediaType = "document";
    if (mediaType.includes("image")) evMediaType = "image";
    else if (mediaType.includes("video")) evMediaType = "video";
    else if (mediaType.includes("audio")) evMediaType = "audio";

    const requestBody = {
      id: instance,
      number: normalizedNumber,
      type: evMediaType,
      url: mediaUrlOrBase64,
      filename: fileName || "arquivo",
      caption: caption || "",
      delay: 1200,
    };

    const response = await fetch(`${baseUrl}/send/media`, {
      method: "POST",
      headers: { apikey: this.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const payload = await response.json().catch(() => ({}));
      return { messageId: this.extractMessageId(payload) };
    }

    const errorText = await response.text().catch(() => "unknown_error");
    throw new Error(`Evolution sendMedia failed: ${response.status} - ${errorText}`);
  }

  async fetchProfilePicture(number: string): Promise<{ profilePictureUrl?: string }> {
    if (!this.baseUrl || !this.apiKey) return {};

    const instance = this.resolveInstance();
    const baseUrl = this.baseUrl.replace(/\/+$/, "");
    const response = await fetch(`${baseUrl}/user/avatar`, {
      method: "POST",
      headers: { apikey: this.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ id: instance, number: this.normalizeNumber(number) }),
    });

    if (response.ok) {
      const payload = (await response.json().catch(() => ({}))) as any;
      return {
        profilePictureUrl:
          payload?.profilePictureUrl ??
          payload?.data?.profilePictureUrl ??
          payload?.data?.url ??
          payload?.url,
      };
    }

    return {};
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

  private extractMessageId(payload: any): string | undefined {
    const candidates = [
      payload?.messageId,
      payload?.id,
      payload?.key?.id,
      payload?.data?.id,
      payload?.data?.key?.id,
      payload?.messages?.[0]?.id,
      payload?.messages?.[0]?.key?.id,
    ];

    const found = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
    return typeof found === "string" ? found : undefined;
  }
}
