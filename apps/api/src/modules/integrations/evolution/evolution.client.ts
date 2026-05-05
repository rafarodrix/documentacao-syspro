import { Injectable, Logger } from '@nestjs/common';
import { readEvolutionRuntimeConfig } from '@dosc-syspro/config';
import { randomUUID } from 'crypto';

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

export type EvolutionOutboundErrorCode =
  | 'WHATSAPP_NUMBER_NOT_REGISTERED'
  | 'EVOLUTION_PROVIDER_ERROR';

export class EvolutionOutboundError extends Error {
  constructor(
    message: string,
    public readonly code: EvolutionOutboundErrorCode,
    public readonly providerStatus: number,
    public readonly providerBody: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'EvolutionOutboundError';
  }
}

export class EvolutionMessageDeleteError extends Error {
  constructor(
    message: string,
    public readonly providerStatus: number,
    public readonly providerBody: string,
  ) {
    super(message);
    this.name = 'EvolutionMessageDeleteError';
  }
}

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
    const sharedHeaders = this.buildAuthHeaders(config.apiKey);
    const attempts: Array<{
      label: string;
      url: string;
      init: RequestInit;
    }> = [
      {
        label: 'primary_findContacts_instance',
        url: `${baseUrl}/chat/findContacts/${encodeURIComponent(instance)}`,
        init: {
          method: 'POST',
          headers: sharedHeaders,
          body: JSON.stringify({ where: {}, take: 1000, skip: 0, orderBy: {} }),
        },
      },
      {
        label: 'fallback_findContacts_body',
        url: `${baseUrl}/chat/findContacts`,
        init: {
          method: 'POST',
          headers: sharedHeaders,
          body: JSON.stringify({ id: instance, instance, where: {}, take: 1000, skip: 0, orderBy: {} }),
        },
      },
      {
        label: 'fallback_findChats_instance',
        url: `${baseUrl}/chat/findChats/${encodeURIComponent(instance)}`,
        init: {
          method: 'POST',
          headers: sharedHeaders,
          body: JSON.stringify({ where: {}, take: 1000, skip: 0, orderBy: {} }),
        },
      },
      {
        label: 'legacy_user_contacts',
        url: `${baseUrl}/user/contacts`,
        init: {
          method: 'GET',
          headers: sharedHeaders,
        },
      },
    ];

    const failures: string[] = [];

    for (const attempt of attempts) {
      const response = await fetch(attempt.url, attempt.init);
      if (response.ok) {
        const payload: any = await response.json().catch(() => ({}));
        return this.normalizeContactList(this.resolveContactsPayload(payload));
      }

      const errorText = await response.text().catch(() => 'unknown_error');
      failures.push(`${attempt.label}=${response.status} ${errorText}`);
    }

    throw new Error(`Evolution fetchContacts failed: ${failures.join('; ')}`);
  }

  async sendTextMessage(
    config: EvolutionConnectionConfig,
    number: string,
    text: string,
    clientMessageId?: string,
  ): Promise<{ messageId?: string; resolvedWhatsappNumber?: string }> {
    if (!config.apiUrl || !config.apiKey) {
      console.warn('[EvolutionClient] Credenciais ausentes. Envio de mensagem ignorado.');
      return {};
    }

    const normalizedNumbers = this.buildOutboundNumberCandidates(number);
    const instance = this.resolveInstance(config.instance);
    const baseUrl = config.apiUrl.replace(/\/+$/, '');
    const requestStartedAt = Date.now();
    const sharedHeaders = this.buildAuthHeaders(config.apiKey);
    const authHeaderMode = this.describeAuthHeaders(sharedHeaders);
    const requestMessageId = this.buildRequestMessageId(clientMessageId);
    let lastError: EvolutionOutboundError | null = null;

    for (let index = 0; index < normalizedNumbers.length; index += 1) {
      const attemptNumber = normalizedNumbers[index];
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'provider_request_text',
        providerFlavor: 'evolution_go',
        route: '/send/text',
        authHeaderMode,
        requestMessageId,
        evolutionBaseUrl: baseUrl,
        evolutionInstance: instance,
        whatsappNumber: attemptNumber,
        contentLength: text.length,
        attempt: index + 1,
        totalAttempts: normalizedNumbers.length,
      }));

      const response = await fetch(`${baseUrl}/send/text`, {
        method: 'POST',
        headers: sharedHeaders,
        body: JSON.stringify({
          id: requestMessageId,
          number: attemptNumber,
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
          providerFlavor: 'evolution_go',
          route: '/send/text',
          authHeaderMode,
          requestMessageId,
          evolutionBaseUrl: baseUrl,
          evolutionInstance: instance,
          whatsappNumber: attemptNumber,
          providerMessageId: messageId ?? null,
          attempt: index + 1,
          totalAttempts: normalizedNumbers.length,
          durationMs: Date.now() - requestStartedAt,
        }));
        return { messageId, resolvedWhatsappNumber: attemptNumber };
      }

      const responseError = await response.text().catch(() => 'unknown_error');
      const outboundError = this.buildOutboundError(response.status, responseError, '/send/text');
      lastError = outboundError;
      const hasFallbackCandidate = index < normalizedNumbers.length - 1;

      if (outboundError.code === 'WHATSAPP_NUMBER_NOT_REGISTERED' && hasFallbackCandidate) {
        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'provider_retry_text_with_legacy_brazilian_variant',
          providerFlavor: 'evolution_go',
          route: '/send/text',
          authHeaderMode,
          requestMessageId,
          evolutionBaseUrl: baseUrl,
          evolutionInstance: instance,
          whatsappNumber: attemptNumber,
          fallbackWhatsappNumber: normalizedNumbers[index + 1],
          status: response.status,
          error: responseError,
          attempt: index + 1,
          totalAttempts: normalizedNumbers.length,
        }));
        continue;
      }

      this.logger.error(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'provider_error_text',
        providerFlavor: 'evolution_go',
        route: '/send/text',
        authHeaderMode,
        requestMessageId,
        evolutionBaseUrl: baseUrl,
        evolutionInstance: instance,
        whatsappNumber: attemptNumber,
        status: response.status,
        error: responseError,
        diagnostics: this.buildProviderDiagnostics(response.status),
        attempt: index + 1,
        totalAttempts: normalizedNumbers.length,
        durationMs: Date.now() - requestStartedAt,
      }));
      throw outboundError;
    }

    throw lastError ?? new Error('Evolution send failed via /send/text: no candidates available.');
  }

  async sendMedia(
    config: EvolutionConnectionConfig,
    number: string,
    mediaUrlOrBase64: string,
    mediaType: string,
    fileName?: string,
    caption?: string,
    clientMessageId?: string,
  ): Promise<{ messageId?: string; resolvedWhatsappNumber?: string }> {
    if (!config.apiUrl || !config.apiKey) {
      console.warn('[EvolutionClient] Credenciais ausentes. Envio de midia ignorado.');
      return {};
    }

    const normalizedNumbers = this.buildOutboundNumberCandidates(number);
    const instance = this.resolveInstance(config.instance);
    const baseUrl = config.apiUrl.replace(/\/+$/, '');
    const requestStartedAt = Date.now();
    const sharedHeaders = this.buildAuthHeaders(config.apiKey);
    const authHeaderMode = this.describeAuthHeaders(sharedHeaders);
    const requestMessageId = this.buildRequestMessageId(clientMessageId);

    const evMediaType = this.resolveEvolutionMediaType(mediaType);
    const resolvedFileName = fileName || 'arquivo';
    const normalizedMedia = this.normalizeMediaInput(mediaUrlOrBase64);

    let lastError: EvolutionOutboundError | null = null;

    for (let index = 0; index < normalizedNumbers.length; index += 1) {
      const attemptNumber = normalizedNumbers[index];
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'provider_request_media',
        providerFlavor: 'evolution_go',
        route: '/send/media',
        authHeaderMode,
        requestMessageId,
        evolutionBaseUrl: baseUrl,
        evolutionInstance: instance,
        whatsappNumber: attemptNumber,
        mediaType: evMediaType,
        fileName: resolvedFileName,
        hasCaption: Boolean(caption),
        mediaInputKind: normalizedMedia.kind,
        mediaLength: normalizedMedia.value.length,
        attempt: index + 1,
        totalAttempts: normalizedNumbers.length,
      }));

      const response = await fetch(`${baseUrl}/send/media`, {
        method: 'POST',
        headers: sharedHeaders,
        body: JSON.stringify({
          id: requestMessageId,
          number: attemptNumber,
          type: evMediaType,
          url: normalizedMedia.value,
          filename: resolvedFileName,
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
          providerFlavor: 'evolution_go',
          route: '/send/media',
          authHeaderMode,
          requestMessageId,
          evolutionBaseUrl: baseUrl,
          evolutionInstance: instance,
          whatsappNumber: attemptNumber,
          providerMessageId: messageId ?? null,
          attempt: index + 1,
          totalAttempts: normalizedNumbers.length,
          durationMs: Date.now() - requestStartedAt,
        }));
        return { messageId, resolvedWhatsappNumber: attemptNumber };
      }

      const responseError = await response.text().catch(() => 'unknown_error');
      const outboundError = this.buildOutboundError(response.status, responseError, '/send/media');
      lastError = outboundError;
      const hasFallbackCandidate = index < normalizedNumbers.length - 1;

      if (outboundError.code === 'WHATSAPP_NUMBER_NOT_REGISTERED' && hasFallbackCandidate) {
        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'provider_retry_media_with_legacy_brazilian_variant',
          providerFlavor: 'evolution_go',
          route: '/send/media',
          authHeaderMode,
          requestMessageId,
          evolutionBaseUrl: baseUrl,
          evolutionInstance: instance,
          whatsappNumber: attemptNumber,
          fallbackWhatsappNumber: normalizedNumbers[index + 1],
          status: response.status,
          error: responseError,
          attempt: index + 1,
          totalAttempts: normalizedNumbers.length,
        }));
        continue;
      }

      this.logger.error(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'provider_error_media',
        providerFlavor: 'evolution_go',
        route: '/send/media',
        authHeaderMode,
        requestMessageId,
        evolutionBaseUrl: baseUrl,
        evolutionInstance: instance,
        whatsappNumber: attemptNumber,
        status: response.status,
        error: responseError,
        diagnostics: this.buildProviderDiagnostics(response.status),
        attempt: index + 1,
        totalAttempts: normalizedNumbers.length,
        durationMs: Date.now() - requestStartedAt,
      }));
      throw outboundError;
    }

    throw lastError ?? new Error('Evolution send failed via /send/media: no candidates available.');
  }

  async sendStickerMessage(
    config: EvolutionConnectionConfig,
    number: string,
    stickerUrlOrBase64: string,
    clientMessageId?: string,
  ): Promise<{ messageId?: string; resolvedWhatsappNumber?: string }> {
    if (!config.apiUrl || !config.apiKey) {
      console.warn('[EvolutionClient] Credenciais ausentes. Envio de figurinha ignorado.');
      return {};
    }

    const normalizedNumbers = this.buildOutboundNumberCandidates(number);
    const instance = this.resolveInstance(config.instance);
    const baseUrl = config.apiUrl.replace(/\/+$/, '');
    const requestStartedAt = Date.now();
    const sharedHeaders = this.buildAuthHeaders(config.apiKey);
    const authHeaderMode = this.describeAuthHeaders(sharedHeaders);
    const requestMessageId = this.buildRequestMessageId(clientMessageId);
    const normalizedSticker = this.normalizeMediaInput(stickerUrlOrBase64);

    let lastError: EvolutionOutboundError | null = null;

    for (let index = 0; index < normalizedNumbers.length; index += 1) {
      const attemptNumber = normalizedNumbers[index];
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'provider_request_sticker',
        providerFlavor: 'evolution_go',
        route: '/send/sticker',
        authHeaderMode,
        requestMessageId,
        evolutionBaseUrl: baseUrl,
        evolutionInstance: instance,
        whatsappNumber: attemptNumber,
        mediaInputKind: normalizedSticker.kind,
        mediaLength: normalizedSticker.value.length,
        attempt: index + 1,
        totalAttempts: normalizedNumbers.length,
      }));

      const response = await fetch(`${baseUrl}/send/sticker`, {
        method: 'POST',
        headers: sharedHeaders,
        body: JSON.stringify({
          id: requestMessageId,
          number: attemptNumber,
          sticker: normalizedSticker.value,
          delay: 1200,
        }),
      });

      if (response.ok) {
        const payload = await response.json().catch(() => ({}));
        const messageId = this.extractMessageId(payload);
        this.logger.log(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'provider_response_sticker',
          providerFlavor: 'evolution_go',
          route: '/send/sticker',
          authHeaderMode,
          requestMessageId,
          evolutionBaseUrl: baseUrl,
          evolutionInstance: instance,
          whatsappNumber: attemptNumber,
          providerMessageId: messageId ?? null,
          attempt: index + 1,
          totalAttempts: normalizedNumbers.length,
          durationMs: Date.now() - requestStartedAt,
        }));
        return { messageId, resolvedWhatsappNumber: attemptNumber };
      }

      const responseError = await response.text().catch(() => 'unknown_error');
      const outboundError = this.buildOutboundError(response.status, responseError, '/send/sticker');
      lastError = outboundError;
      const hasFallbackCandidate = index < normalizedNumbers.length - 1;

      if (outboundError.code === 'WHATSAPP_NUMBER_NOT_REGISTERED' && hasFallbackCandidate) {
        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'provider_retry_sticker_with_legacy_brazilian_variant',
          providerFlavor: 'evolution_go',
          route: '/send/sticker',
          authHeaderMode,
          requestMessageId,
          evolutionBaseUrl: baseUrl,
          evolutionInstance: instance,
          whatsappNumber: attemptNumber,
          fallbackWhatsappNumber: normalizedNumbers[index + 1],
          status: response.status,
          error: responseError,
          attempt: index + 1,
          totalAttempts: normalizedNumbers.length,
        }));
        continue;
      }

      this.logger.error(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'provider_error_sticker',
        providerFlavor: 'evolution_go',
        route: '/send/sticker',
        authHeaderMode,
        requestMessageId,
        evolutionBaseUrl: baseUrl,
        evolutionInstance: instance,
        whatsappNumber: attemptNumber,
        status: response.status,
        error: responseError,
        diagnostics: this.buildProviderDiagnostics(response.status),
        attempt: index + 1,
        totalAttempts: normalizedNumbers.length,
        durationMs: Date.now() - requestStartedAt,
      }));
      throw outboundError;
    }

    throw lastError ?? new Error('Evolution send failed via /send/sticker: no candidates available.');
  }

  async deleteMessageForEveryone(
    config: EvolutionConnectionConfig,
    input: {
      messageId: string;
      remoteJid: string;
      fromMe?: boolean;
      participant?: string | null;
    },
  ): Promise<void> {
    if (!config.apiUrl || !config.apiKey) {
      this.logger.warn('[EvolutionClient] Credenciais ausentes. Exclusao de mensagem ignorada.');
      return;
    }

    const instance = this.resolveInstance(config.instance);
    const baseUrl = config.apiUrl.replace(/\/+$/, '');
    const remoteJid = this.normalizeRemoteJid(input.remoteJid);
    const headers = this.buildAuthHeaders(config.apiKey);
    const startedAt = Date.now();
    const route = '/message/delete';
    const url = `${baseUrl}/message/delete`;

    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_evolution',
      stage: 'provider_request_delete_message',
      providerFlavor: 'evolution_go',
      route,
      evolutionBaseUrl: baseUrl,
      evolutionInstance: instance,
      messageId: input.messageId,
      remoteJid,
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        chat: remoteJid,
        messageId: input.messageId,
      }),
    });

    if (response.ok) {
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'provider_response_delete_message',
        providerFlavor: 'evolution_go',
        route,
        evolutionBaseUrl: baseUrl,
        evolutionInstance: instance,
        messageId: input.messageId,
        remoteJid,
        status: response.status,
        durationMs: Date.now() - startedAt,
      }));
      return;
    }

    const providerBody = await response.text().catch(() => 'unknown_error');
    this.logger.error(JSON.stringify({
      flow: 'chatwoot_to_evolution',
      stage: 'provider_error_delete_message',
      providerFlavor: 'evolution_go',
      route,
      evolutionBaseUrl: baseUrl,
      evolutionInstance: instance,
      messageId: input.messageId,
      remoteJid,
      status: response.status,
      error: providerBody,
      durationMs: Date.now() - startedAt,
    }));

    throw new EvolutionMessageDeleteError(
      `Evolution Go delete message failed via ${route}: status=${response.status} body=${providerBody}`,
      response.status,
      providerBody,
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
    const sharedHeaders = this.buildAuthHeaders(config.apiKey);
    const primaryResponse = await fetch(`${baseUrl}/chat/fetchProfilePictureUrl/${encodeURIComponent(instance)}`, {
      method: 'POST',
      headers: sharedHeaders,
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
      headers: sharedHeaders,
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
    const recipient = String(number ?? '').trim();
    if (recipient.includes('@')) {
      const [rawLocalPart, rawDomain = ''] = recipient.split('@');
      const normalizedDomain = rawDomain.trim().toLowerCase();

      if (normalizedDomain === 'g.us' || normalizedDomain === 'newsletter') {
        const normalizedGroupLocalPart = rawLocalPart.replace(/\s+/g, '');
        return normalizedGroupLocalPart
          ? `${normalizedGroupLocalPart}@${normalizedDomain}`
          : recipient;
      }

      const normalizedLocalPart = rawLocalPart.replace(/\D/g, '');
      if (!normalizedLocalPart) {
        return recipient;
      }

      const normalizedDigits = normalizedLocalPart.startsWith('55')
        ? normalizedLocalPart
        : `55${normalizedLocalPart}`;
      return normalizedDomain
        ? `${normalizedDigits}@${normalizedDomain}`
        : normalizedDigits;
    }

    const digits = recipient.replace(/\D/g, '');
    if (!digits) return digits;
    return digits.startsWith('55') ? digits : `55${digits}`;
  }

  private normalizeRemoteJid(value: string): string {
    const normalized = this.normalizeNumber(value);
    if (normalized.includes('@')) {
      return normalized;
    }
    return `${normalized}@s.whatsapp.com`;
  }

  private buildOutboundNumberCandidates(number: string): string[] {
    const primary = this.normalizeNumber(number);
    const fallback = this.buildLegacyBrazilianNumberVariant(primary);
    return fallback && fallback !== primary ? [primary, fallback] : [primary];
  }

  private buildLegacyBrazilianNumberVariant(normalizedNumber: string): string | null {
    if (!normalizedNumber) return null;

    const [localPart, domain] = normalizedNumber.split('@');
    if (!localPart) return null;
    if (domain?.trim().toLowerCase() === 'g.us') return null;

    const digits = localPart.replace(/\D/g, '');
    if (!(digits.startsWith('55') && digits.length === 13 && digits[4] === '9')) {
      return null;
    }

    const legacyDigits = `${digits.slice(0, 4)}${digits.slice(5)}`;
    return domain ? `${legacyDigits}@${domain}` : legacyDigits;
  }

  private resolveEvolutionMediaType(mediaType: string): 'image' | 'video' | 'audio' | 'document' {
    const normalized = String(mediaType || '').toLowerCase();
    if (normalized.includes('image')) return 'image';
    if (normalized.includes('video')) return 'video';
    if (normalized.includes('audio')) return 'audio';
    return 'document';
  }

  private normalizeMediaInput(value: string): { value: string; kind: 'url' | 'base64' | 'data_url' } {
    const raw = String(value ?? '').trim();
    if (/^https?:\/\//i.test(raw)) {
      return { value: raw, kind: 'url' };
    }

    const dataUrlMatch = raw.match(/^data:[^;]+;base64,(.*)$/is);
    const base64 = (dataUrlMatch?.[1] ?? raw).replace(/\s+/g, '');
    return {
      value: base64,
      kind: dataUrlMatch ? 'data_url' : 'base64',
    };
  }

  private extractMessageId(payload: any): string | undefined {
    const candidates = [
      payload?.messageId,
      payload?.id,
      payload?.key?.id,
      payload?.data?.id,
      payload?.data?.key?.id,
      payload?.data?.Info?.ID,
      payload?.data?.Info?.Id,
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

  private buildAuthHeaders(apiKey: string): Record<string, string> {
    return {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private describeAuthHeaders(headers: Record<string, string>): string {
    const hasApiKeyHeader = Boolean(headers.apikey);
    const hasBearerHeader = Boolean(headers.Authorization);

    if (hasApiKeyHeader && hasBearerHeader) return 'apikey+bearer';
    if (hasApiKeyHeader) return 'apikey_only';
    if (hasBearerHeader) return 'bearer_only';
    return 'none';
  }

  private buildProviderDiagnostics(status: number): string[] {
    if (status === 401) {
      return [
        'Verifique se a API key pertence ao servidor Evolution Go alvo.',
        'Confirme se a chave configurada corresponde a GLOBAL_API_KEY ativa.',
        'Se houver proxy reverso, valide se os headers apikey e Authorization estao sendo encaminhados.',
      ];
    }

    if (status === 404) {
      return [
        'Confirme se a base URL aponta para o servidor Evolution Go correto.',
        'Valide se a rota documentada existe nessa versao da API.',
      ];
    }

    return [];
  }

  private buildOutboundError(
    status: number,
    providerBody: string,
    route: '/send/text' | '/send/media' | '/send/sticker',
  ): EvolutionOutboundError {
    const normalizedBody = String(providerBody ?? '').toLowerCase();

    if (normalizedBody.includes('not registered on whatsapp')) {
      return new EvolutionOutboundError(
        'Numero nao cadastrado no WhatsApp.',
        'WHATSAPP_NUMBER_NOT_REGISTERED',
        status,
        providerBody,
        false,
      );
    }

    return new EvolutionOutboundError(
      `Evolution send failed via ${route}: status=${status} body=${providerBody}`,
      'EVOLUTION_PROVIDER_ERROR',
      status,
      providerBody,
      status >= 500,
    );
  }

  private buildRequestMessageId(candidate?: string): string {
    const normalized = String(candidate ?? '')
      .trim()
      .replace(/[^a-zA-Z0-9._:-]+/g, '-')
      .slice(0, 80);

    if (normalized) {
      return normalized;
    }

    return `msg-${randomUUID()}`;
  }
}
