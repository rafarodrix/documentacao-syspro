import { Injectable, Logger } from '@nestjs/common';
import { readEvolutionRuntimeConfig } from '@dosc-syspro/config';

export type EvolutionConnectionConfig = {
  apiUrl: string;
  apiKey: string;
  instance: string;
};

export type EvolutionContact = {
  remoteId?: string;
  name: string;
  whatsapp: string;
  profilePictureUrl?: string | null;
};

export function readEvolutionConfigFromRuntime(): EvolutionConnectionConfig {
  const config = readEvolutionRuntimeConfig();
  return {
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
    instance: config.instance,
  };
}

@Injectable()
export class EvolutionClient {
  private readonly logger = new Logger(EvolutionClient.name);

  async fetchContacts(config: EvolutionConnectionConfig): Promise<EvolutionContact[]> {
    if (!config.apiUrl || !config.apiKey) {
      console.warn('[EvolutionClient] Credenciais ausentes. Busca de contatos ignorada.');
      return [];
    }

    const instance = this.resolveInstance(config.instance);
    const baseUrl = config.apiUrl.replace(/\/+$/, '');

    const primaryResponse = await fetch(`${baseUrl}/chat/findContacts/${encodeURIComponent(instance)}`, {
      method: 'POST',
      headers: {
        apikey: config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        where: {},
        take: 1000,
        skip: 0,
        orderBy: {},
      }),
    });

    if (primaryResponse.ok) {
      const payload: any = await primaryResponse.json().catch(() => []);
      return this.normalizeContactList(this.resolveContactsPayload(payload));
    }

    const fallbackResponse = await fetch(`${baseUrl}/user/contacts`, {
      method: 'GET',
      headers: {
        apikey: config.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (fallbackResponse.ok) {
      const payload: any = await fallbackResponse.json().catch(() => ({}));
      return this.normalizeContactList(this.resolveContactsPayload(payload));
    }

    const primaryError = await primaryResponse.text().catch(() => 'unknown_error');
    const fallbackError = await fallbackResponse.text().catch(() => 'unknown_error');
    throw new Error(
      `Evolution fetchContacts failed: primary=${primaryResponse.status} ${primaryError}; fallback=${fallbackResponse.status} ${fallbackError}`
    );
  }

  async sendTextMessage(
    config: EvolutionConnectionConfig,
    number: string,
    text: string
  ): Promise<{ messageId?: string }> {
    if (!config.apiUrl || !config.apiKey) {
      console.warn('[EvolutionClient] Credenciais ausentes. Envio de mensagem ignorado.');
      return {};
    }

    const normalizedNumber = this.normalizeNumber(number);
    const instance = this.resolveInstance(config.instance);
    const baseUrl = config.apiUrl.replace(/\/+$/, '');
    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_evolution',
      stage: 'provider_request_text',
      evolutionBaseUrl: baseUrl,
      evolutionInstance: instance,
      whatsappNumber: normalizedNumber,
      contentLength: text.length,
    }));

    const response = await fetch(`${baseUrl}/send/text`, {
      method: 'POST',
      headers: {
        apikey: config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: instance,
        number: normalizedNumber,
        text,
        delay: 1200,
      }),
    });

    if (response.ok) {
      const payload = await response.json().catch(() => ({}));
      const messageId = this.extractMessageId(payload);
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'provider_response_text',
        evolutionBaseUrl: baseUrl,
        evolutionInstance: instance,
        whatsappNumber: normalizedNumber,
        providerMessageId: messageId ?? null,
      }));
      return { messageId };
    }

    const errorText = await response.text().catch(() => 'unknown_error');
    this.logger.error(JSON.stringify({
      flow: 'chatwoot_to_evolution',
      stage: 'provider_error_text',
      evolutionBaseUrl: baseUrl,
      evolutionInstance: instance,
      whatsappNumber: normalizedNumber,
      status: response.status,
      error: errorText,
    }));
    throw new Error(`Evolution send failed: ${response.status} - ${errorText}`);
  }

  async sendMedia(
    config: EvolutionConnectionConfig,
    number: string,
    mediaUrlOrBase64: string,
    mediaType: string,
    fileName?: string,
    caption?: string
  ): Promise<{ messageId?: string }> {
    if (!config.apiUrl || !config.apiKey) {
      console.warn('[EvolutionClient] Credenciais ausentes. Envio de midia ignorado.');
      return {};
    }

    const normalizedNumber = this.normalizeNumber(number);
    const instance = this.resolveInstance(config.instance);
    const baseUrl = config.apiUrl.replace(/\/+$/, '');

    let evMediaType = 'document';
    if (mediaType.includes('image')) evMediaType = 'image';
    else if (mediaType.includes('video')) evMediaType = 'video';
    else if (mediaType.includes('audio')) evMediaType = 'audio';

    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_evolution',
      stage: 'provider_request_media',
      evolutionBaseUrl: baseUrl,
      evolutionInstance: instance,
      whatsappNumber: normalizedNumber,
      mediaType: evMediaType,
      fileName: fileName || 'arquivo',
      hasCaption: Boolean(caption),
    }));

    const response = await fetch(`${baseUrl}/send/media`, {
      method: 'POST',
      headers: { apikey: config.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: instance,
        number: normalizedNumber,
        type: evMediaType,
        url: mediaUrlOrBase64,
        filename: fileName || 'arquivo',
        caption: caption || '',
        delay: 1200,
      }),
    });

    if (response.ok) {
      const payload = await response.json().catch(() => ({}));
      const messageId = this.extractMessageId(payload);
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'provider_response_media',
        evolutionBaseUrl: baseUrl,
        evolutionInstance: instance,
        whatsappNumber: normalizedNumber,
        providerMessageId: messageId ?? null,
      }));
      return { messageId };
    }

    const errorText = await response.text().catch(() => 'unknown_error');
    this.logger.error(JSON.stringify({
      flow: 'chatwoot_to_evolution',
      stage: 'provider_error_media',
      evolutionBaseUrl: baseUrl,
      evolutionInstance: instance,
      whatsappNumber: normalizedNumber,
      status: response.status,
      error: errorText,
    }));
    throw new Error(`Evolution sendMedia failed: ${response.status} - ${errorText}`);
  }

  async fetchProfilePicture(
    config: EvolutionConnectionConfig,
    number: string
  ): Promise<{ profilePictureUrl?: string }> {
    if (!config.apiUrl || !config.apiKey) return {};

    const instance = this.resolveInstance(config.instance);
    const baseUrl = config.apiUrl.replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/user/avatar`, {
      method: 'POST',
      headers: { apikey: config.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: instance, number: this.normalizeNumber(number) }),
    });

    if (!response.ok) return {};

    const payload = (await response.json().catch(() => ({}))) as any;
    return {
      profilePictureUrl:
        payload?.profilePictureUrl ??
        payload?.data?.profilePictureUrl ??
        payload?.data?.url ??
        payload?.url,
    };
  }

  private resolveInstance(instance: string): string {
    const resolved = instance?.trim();
    if (!resolved) {
      throw new Error('Evolution instance nao configurada.');
    }
    return resolved;
  }

  private normalizeNumber(number: string): string {
    const digits = number.replace(/\D/g, '');
    if (!digits) return digits;
    return digits.startsWith('55') ? digits : `55${digits}`;
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

    const found = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
    return typeof found === 'string' ? found : undefined;
  }

  private normalizeContactList(payload: any): EvolutionContact[] {
    if (!Array.isArray(payload)) return [];

    const contacts: EvolutionContact[] = [];

    for (const item of payload) {
      const rawNumber =
        item?.number ??
        item?.Jid ??
        item?.jid ??
        item?.Phone ??
        item?.phone;
      const whatsapp = this.extractWhatsAppNumber(rawNumber);
      if (!whatsapp) continue;

      const name =
        String(
          item?.pushName ??
          item?.PushName ??
          item?.FullName ??
          item?.fullName ??
          item?.FirstName ??
          item?.firstName ??
          item?.BusinessName ??
          item?.businessName ??
          whatsapp
        ).trim() || whatsapp;

      contacts.push({
        remoteId: String(item?.id ?? item?.ID ?? item?.Jid ?? item?.jid ?? '').trim() || undefined,
        name,
        whatsapp,
        profilePictureUrl:
          item?.profilePictureUrl ??
          item?.ProfilePictureUrl ??
          null,
      });
    }

    return contacts;
  }

  private resolveContactsPayload(payload: any): any[] {
    if (Array.isArray(payload)) return payload;

    const candidates = [
      payload?.data,
      payload?.contacts,
      payload?.result,
      payload?.results,
      payload?.data?.contacts,
      payload?.data?.result,
      payload?.data?.results,
      payload?.response,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
    }

    return [];
  }

  private extractWhatsAppNumber(value: unknown): string {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const jidCandidate = raw.includes('@') ? raw.split('@')[0] : raw;
    return jidCandidate.replace(/\D/g, '');
  }
}
