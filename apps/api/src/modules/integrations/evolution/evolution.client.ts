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
    const requestStartedAt = Date.now();
    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_evolution',
      stage: 'provider_request_text',
      evolutionBaseUrl: baseUrl,
      evolutionInstance: instance,
      whatsappNumber: normalizedNumber,
      contentLength: text.length,
    }));

    const primaryResponse = await fetch(`${baseUrl}/send/text`, {
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

    if (primaryResponse.ok) {
      const payload = await primaryResponse.json().catch(() => ({}));
      const messageId = this.extractMessageId(payload);
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'provider_response_text',
        route: '/send/text',
        evolutionBaseUrl: baseUrl,
        evolutionInstance: instance,
        whatsappNumber: normalizedNumber,
        providerMessageId: messageId ?? null,
        durationMs: Date.now() - requestStartedAt,
      }));
      return { messageId };
    }

    const fallbackResponse = await fetch(`${baseUrl}/message/sendText/${encodeURIComponent(instance)}`, {
      method: 'POST',
      headers: {
        apikey: config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: normalizedNumber,
        textMessage: {
          text,
        },
        delay: 1200,
      }),
    });

    if (fallbackResponse.ok) {
      const payload = await fallbackResponse.json().catch(() => ({}));
      const messageId = this.extractMessageId(payload);
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'provider_response_text',
        route: '/message/sendText/{instance}',
        evolutionBaseUrl: baseUrl,
        evolutionInstance: instance,
        whatsappNumber: normalizedNumber,
        providerMessageId: messageId ?? null,
        durationMs: Date.now() - requestStartedAt,
      }));
      return { messageId };
    }

    const primaryError = await primaryResponse.text().catch(() => 'unknown_error');
    const fallbackError = await fallbackResponse.text().catch(() => 'unknown_error');
    this.logger.error(JSON.stringify({
      flow: 'chatwoot_to_evolution',
      stage: 'provider_error_text',
      evolutionBaseUrl: baseUrl,
      evolutionInstance: instance,
      whatsappNumber: normalizedNumber,
      primaryStatus: primaryResponse.status,
      primaryError,
      fallbackStatus: fallbackResponse.status,
      fallbackError,
      durationMs: Date.now() - requestStartedAt,
    }));
    throw new Error(
      `Evolution send failed: primary=${primaryResponse.status} ${primaryError}; fallback=${fallbackResponse.status} ${fallbackError}`
    );
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
    const requestStartedAt = Date.now();

    const evMediaType = this.resolveEvolutionMediaType(mediaType);
    const resolvedFileName = fileName || 'arquivo';

    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_evolution',
      stage: 'provider_request_media',
      evolutionBaseUrl: baseUrl,
      evolutionInstance: instance,
      whatsappNumber: normalizedNumber,
      mediaType: evMediaType,
      fileName: resolvedFileName,
      hasCaption: Boolean(caption),
    }));

    const primaryResponse = await fetch(`${baseUrl}/send/media`, {
      method: 'POST',
      headers: {
        apikey: config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: instance,
        number: normalizedNumber,
        type: evMediaType,
        url: mediaUrlOrBase64,
        filename: resolvedFileName,
        caption: caption || '',
        delay: 1200,
      }),
    });

    if (primaryResponse.ok) {
      const payload = await primaryResponse.json().catch(() => ({}));
      const messageId = this.extractMessageId(payload);
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'provider_response_media',
        route: '/send/media',
        evolutionBaseUrl: baseUrl,
        evolutionInstance: instance,
        whatsappNumber: normalizedNumber,
        providerMessageId: messageId ?? null,
        durationMs: Date.now() - requestStartedAt,
      }));
      return { messageId };
    }

    const fallbackResponse = await fetch(`${baseUrl}/message/sendMedia/${encodeURIComponent(instance)}`, {
      method: 'POST',
      headers: {
        apikey: config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: normalizedNumber,
        mediatype: evMediaType,
        mimetype: mediaType || 'application/octet-stream',
        caption: caption || '',
        media: mediaUrlOrBase64,
        fileName: resolvedFileName,
        delay: 1200,
      }),
    });

    if (fallbackResponse.ok) {
      const payload = await fallbackResponse.json().catch(() => ({}));
      const messageId = this.extractMessageId(payload);
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'provider_response_media',
        route: '/message/sendMedia/{instance}',
        evolutionBaseUrl: baseUrl,
        evolutionInstance: instance,
        whatsappNumber: normalizedNumber,
        providerMessageId: messageId ?? null,
        durationMs: Date.now() - requestStartedAt,
      }));
      return { messageId };
    }

    const primaryError = await primaryResponse.text().catch(() => 'unknown_error');
    const fallbackError = await fallbackResponse.text().catch(() => 'unknown_error');
    this.logger.error(JSON.stringify({
      flow: 'chatwoot_to_evolution',
      stage: 'provider_error_media',
      evolutionBaseUrl: baseUrl,
      evolutionInstance: instance,
      whatsappNumber: normalizedNumber,
      primaryStatus: primaryResponse.status,
      primaryError,
      fallbackStatus: fallbackResponse.status,
      fallbackError,
      durationMs: Date.now() - requestStartedAt,
    }));
    throw new Error(
      `Evolution sendMedia failed: primary=${primaryResponse.status} ${primaryError}; fallback=${fallbackResponse.status} ${fallbackError}`
    );
  }

  async fetchProfilePicture(
    config: EvolutionConnectionConfig,
    number: string
  ): Promise<{ profilePictureUrl?: string }> {
    if (!config.apiUrl || !config.apiKey) return {};

    const instance = this.resolveInstance(config.instance);
    const baseUrl = config.apiUrl.replace(/\/+$/, '');
    const normalizedNumber = this.normalizeNumber(number);
    const primaryResponse = await fetch(`${baseUrl}/chat/fetchProfilePictureUrl/${encodeURIComponent(instance)}`, {
      method: 'POST',
      headers: { apikey: config.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: normalizedNumber }),
    });

    if (primaryResponse.ok) {
      const payload = (await primaryResponse.json().catch(() => ({}))) as any;
      return {
        profilePictureUrl:
          payload?.profilePictureUrl ??
          payload?.pictureUrl ??
          payload?.profilePicture?.url ??
          payload?.data?.profilePictureUrl ??
          payload?.data?.pictureUrl ??
          payload?.data?.url ??
          payload?.url,
      };
    }

    const fallbackResponse = await fetch(`${baseUrl}/user/avatar`, {
      method: 'POST',
      headers: { apikey: config.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: instance, number: normalizedNumber }),
    });

    if (!fallbackResponse.ok) return {};

    const payload = (await fallbackResponse.json().catch(() => ({}))) as any;
    return {
      profilePictureUrl:
        payload?.profilePictureUrl ??
        payload?.pictureUrl ??
        payload?.profilePicture?.url ??
        payload?.data?.profilePictureUrl ??
        payload?.data?.pictureUrl ??
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

  private resolveEvolutionMediaType(mediaType: string): 'image' | 'video' | 'audio' | 'document' {
    const normalized = String(mediaType || '').toLowerCase();
    if (normalized.includes('image')) return 'image';
    if (normalized.includes('video')) return 'video';
    if (normalized.includes('audio')) return 'audio';
    return 'document';
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
