import { Injectable, Logger } from '@nestjs/common';

export type ChatwootConnectionConfig = {
  url: string;
  apiToken: string;
  platformApiToken?: string;
  accountId: string;
  inboxId: string;
  inboxIdentifier: string;
  webhookSecret?: string;
  webhookMaxSkewSeconds?: number;
};

@Injectable()
export class ChatwootClient {
  private readonly logger = new Logger(ChatwootClient.name);

  async inspectInboxConfiguration(config: ChatwootConnectionConfig): Promise<{
    status: 'ok' | 'error';
    checkedAt: string;
    accountRoute: { endpoint: string; ok: boolean; error?: string };
    inbox: {
      configuredInboxId?: string;
      configuredInboxIdentifier?: string;
      resolvedInboxId?: string;
      resolvedInboxIdentifier?: string;
      matchedInbox?: {
        id?: string;
        identifier?: string;
        name?: string;
        channelType?: string;
        lockToSingleConversation?: boolean | null;
      } | null;
    };
  }> {
    const endpoint = `/api/v1/accounts/${config.accountId}/inboxes`;

    try {
      const inboxes = await this.fetchInboxes(config);
      const resolvedInboxId = await this.resolveInboxId(config);
      const resolvedInboxIdentifier = await this.resolveInboxIdentifier(config);

      const matchedInbox = inboxes?.find((inbox: any) => {
        const inboxId = inbox?.id?.toString?.();
        const inboxIdentifier = inbox?.identifier?.toString?.();

        return (
          (resolvedInboxId && inboxId === resolvedInboxId) ||
          (resolvedInboxIdentifier && inboxIdentifier === resolvedInboxIdentifier) ||
          (config.inboxId && inboxId === config.inboxId) ||
          (config.inboxIdentifier && inboxIdentifier === config.inboxIdentifier)
        );
      });

      return {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        accountRoute: { endpoint, ok: true },
        inbox: {
          configuredInboxId: config.inboxId,
          configuredInboxIdentifier: config.inboxIdentifier,
          resolvedInboxId,
          resolvedInboxIdentifier,
          matchedInbox: matchedInbox
            ? {
                id: matchedInbox?.id?.toString?.(),
                identifier: matchedInbox?.identifier?.toString?.(),
                name: matchedInbox?.name?.toString?.() ?? matchedInbox?.channel?.name?.toString?.(),
                channelType: matchedInbox?.channel_type?.toString?.() ?? matchedInbox?.channelType?.toString?.(),
                lockToSingleConversation:
                  typeof matchedInbox?.lock_to_single_conversation === 'boolean'
                    ? matchedInbox.lock_to_single_conversation
                    : typeof matchedInbox?.lockToSingleConversation === 'boolean'
                      ? matchedInbox.lockToSingleConversation
                      : null,
              }
            : null,
        },
      };
    } catch (error: any) {
      return {
        status: 'error',
        checkedAt: new Date().toISOString(),
        accountRoute: {
          endpoint,
          ok: false,
          error: error?.message ?? 'unknown_error',
        },
        inbox: {
          configuredInboxId: config.inboxId,
          configuredInboxIdentifier: config.inboxIdentifier,
        },
      };
    }
  }

  private async request(
    config: ChatwootConnectionConfig,
    endpoint: string,
    method: string = 'GET',
    body?: any,
    retries: number = 3
  ): Promise<any> {
    if (!config.url || !config.apiToken) {
      this.logger.warn('CHATWOOT_URL ou CHATWOOT_API_TOKEN nao configurados.');
      return null;
    }

    const url = `${config.url}${endpoint}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const headers: any = { api_access_token: config.apiToken };
        let requestBody: any;

        if (body instanceof FormData) {
          requestBody = body;
        } else if (body) {
          headers['Content-Type'] = 'application/json';
          requestBody = JSON.stringify(body);
        }

        const response = await fetch(url, {
          method,
          headers,
          body: requestBody,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'unknown_error');
          this.logger.error(`Chatwoot API error (attempt ${attempt}) [${method} ${endpoint}]: ${response.status} - ${errorText}`);

          if ([400, 401, 403, 404, 422].includes(response.status) || attempt === retries) {
            throw new Error(`Chatwoot API error (${method} ${endpoint}): ${response.status} - ${errorText}`);
          }

          await new Promise((res) => setTimeout(res, attempt * 1000));
          continue;
        }

        return await response.json();
      } catch (error: any) {
        const isClientError =
          error?.message &&
          typeof error.message === 'string' &&
          error.message.includes('Chatwoot API error');
        if (isClientError || attempt === retries) throw error;
        this.logger.error(`Network error on Chatwoot API (attempt ${attempt}): ${error.message}`);
        await new Promise((res) => setTimeout(res, attempt * 1000));
      }
    }
  }

  async createOrFindContact(config: ChatwootConnectionConfig, phoneNumber: string, name: string, avatarUrl?: string) {
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

    const searchResponse: any = await this.request(
      config,
      `/api/v1/accounts/${config.accountId}/contacts/search?q=${encodeURIComponent(formattedPhone)}`,
      'GET'
    );

    if (searchResponse?.payload && Array.isArray(searchResponse.payload)) {
      const existingContact = searchResponse.payload.find((c: any) => c.phone_number === formattedPhone);
      if (existingContact) {
        return { payload: { contact: existingContact } };
      }
    }

    try {
      const inboxId = await this.resolveInboxId(config);
      if (!inboxId) {
        throw new Error('CHATWOOT_INBOX_ID nao configurado/resolvido para criar contato via API de conta');
      }

      const payload: any = {
        inbox_id: inboxId,
        name,
        phone_number: formattedPhone,
      };
      if (avatarUrl) payload.avatar_url = avatarUrl;
      return await this.request(config, `/api/v1/accounts/${config.accountId}/contacts`, 'POST', payload);
    } catch (error: any) {
      if (error?.message?.includes('404')) {
        const inboxIdentifier = await this.resolveInboxIdentifier(config);
        if (!inboxIdentifier) throw error;

        const publicPayload: any = { name, phone_number: formattedPhone };
        if (avatarUrl) publicPayload.avatar_url = avatarUrl;
        return await this.request(config, `/public/api/v1/inboxes/${inboxIdentifier}/contacts`, 'POST', publicPayload);
      }

      if (error.message.includes('422')) {
        this.logger.warn(`Contato com numero ${formattedPhone} ja existe. Retornando contato existente da busca...`);
        const retrySearch: any = await this.request(
          config,
          `/api/v1/accounts/${config.accountId}/contacts/search?q=${encodeURIComponent(formattedPhone)}`,
          'GET'
        );
        const retryExisting = retrySearch?.payload?.find((c: any) => c.phone_number === formattedPhone);
        if (retryExisting) {
          return { payload: { contact: retryExisting } };
        }
      }
      throw error;
    }
  }

  async updateContact(
    config: ChatwootConnectionConfig,
    contactIdentifier: string,
    data: { name?: string; phone_number?: string; email?: string; custom_attributes?: Record<string, unknown> }
  ) {
    const inboxIdentifier = await this.resolveInboxIdentifier(config);
    if (inboxIdentifier) {
      try {
        return await this.request(
          config,
          `/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactIdentifier}`,
          'PATCH',
          data
        );
      } catch (error: any) {
        if (!this.isNotFoundError(error)) throw error;
      }
    }

    const numericContactId = this.toNumericIdentifier(contactIdentifier);
    if (!numericContactId) {
      throw new Error(`Chatwoot contact identifier nao numerico sem rota publica disponivel: ${contactIdentifier}`);
    }

    try {
      return await this.request(
        config,
        `/api/v1/accounts/${config.accountId}/contacts/${numericContactId}`,
        'PUT',
        data
      );
    } catch (error: any) {
      throw error;
    }
  }

  async updateMessageStatus(
    config: ChatwootConnectionConfig,
    conversationId: string,
    messageId: string,
    status: 'delivered' | 'read'
  ) {
    return this.request(
      config,
      `/api/v1/accounts/${config.accountId}/conversations/${conversationId}/messages/${messageId}`,
      'PUT',
      { status }
    );
  }

  async getConversationDetails(
    config: ChatwootConnectionConfig,
    conversationId: string
  ) {
    return this.request(
      config,
      `/api/v1/accounts/${config.accountId}/conversations/${conversationId}`,
      'GET'
    );
  }

  async listAgents(config: ChatwootConnectionConfig): Promise<any[]> {
    const response = await this.request(
      config,
      `/api/v1/accounts/${config.accountId}/agents`,
      'GET'
    );

    return Array.isArray(response) ? response : [];
  }

  async getContactableInboxes(
    config: ChatwootConnectionConfig,
    contactId: string
  ): Promise<Array<{ source_id?: string; inbox?: { id?: number; identifier?: string } }>> {
    const numericContactId = this.toNumericIdentifier(contactId);
    if (!numericContactId) {
      return [];
    }

    const response = await this.request(
      config,
      `/api/v1/accounts/${config.accountId}/contacts/${numericContactId}/contactable_inboxes`,
      'GET'
    );

    if (Array.isArray(response?.payload)) {
      return response.payload;
    }

    return [];
  }

  async createPlatformUser(
    config: ChatwootConnectionConfig,
    input: { name: string; email: string; displayName?: string; customAttributes?: Record<string, unknown> }
  ): Promise<any> {
    const password = this.buildPlatformPassword();
    return this.platformRequest(
      config,
      '/platform/api/v1/users',
      'POST',
      {
        name: input.name,
        display_name: input.displayName ?? input.name,
        email: input.email,
        password,
        custom_attributes: input.customAttributes ?? {},
      }
    );
  }

  async updatePlatformUser(
    config: ChatwootConnectionConfig,
    userId: string,
    input: { name: string; email: string; displayName?: string; customAttributes?: Record<string, unknown> }
  ): Promise<any> {
    return this.platformRequest(
      config,
      `/platform/api/v1/users/${userId}`,
      'PATCH',
      {
        name: input.name,
        display_name: input.displayName ?? input.name,
        email: input.email,
        custom_attributes: input.customAttributes ?? {},
      }
    );
  }

  async createAccountUser(
    config: ChatwootConnectionConfig,
    userId: string,
    role: 'agent' | 'administrator'
  ): Promise<any> {
    return this.platformRequest(
      config,
      `/platform/api/v1/accounts/${config.accountId}/account_users`,
      'POST',
      {
        user_id: Number(userId),
        role,
      }
    );
  }

  async getUserSsoLink(config: ChatwootConnectionConfig, userId: string): Promise<string> {
    const response = await this.platformRequest(
      config,
      `/platform/api/v1/users/${userId}/login`,
      'GET'
    );

    const url = String(response?.url ?? '').trim();
    if (!url) {
      throw new Error(`Nao foi possivel obter link SSO do usuario Chatwoot ${userId}`);
    }
    return url;
  }

  async deletePlatformUser(config: ChatwootConnectionConfig, userId: string): Promise<void> {
    await this.platformRequest(
      config,
      `/platform/api/v1/users/${userId}`,
      'DELETE'
    );
  }

  async createConversation(config: ChatwootConnectionConfig, contactIdentifier: string, contactId?: string) {
    const inboxIdentifier = await this.resolveInboxIdentifier(config);
    if (inboxIdentifier) {
      try {
        const result = await this.request(
          config,
          `/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactIdentifier}/conversations`,
          'POST'
        );
        this.logger.debug(
          `[ChatwootClient] Conversa criada via rota publica (inboxIdentifier=${inboxIdentifier}, contactIdentifier=${contactIdentifier})`
        );
        return result;
      } catch (error: any) {
        if (!this.isNotFoundError(error)) throw error;
        this.logger.warn(
          `[ChatwootClient] 404 ao criar conversa via rota publica (inboxIdentifier=${inboxIdentifier}, contactIdentifier=${contactIdentifier}). Tentando rota de conta...`
        );
      }
    }

    const inboxId = await this.resolveInboxId(config);
    if (!inboxId) {
      throw new Error('CHATWOOT_INBOX_ID nao configurado/resolvido para criar conversa via API de conta');
    }

    const result = await this.request(
      config,
      `/api/v1/accounts/${config.accountId}/conversations`,
      'POST',
      {
        source_id: contactIdentifier,
        inbox_id: Number(inboxId),
        ...(contactId ? { contact_id: Number(contactId) } : {}),
      }
    );
    this.logger.debug(
      `[ChatwootClient] Conversa criada via rota de conta (inboxId=${inboxId}, contactIdentifier=${contactIdentifier}, contactId=${contactId ?? 'n/a'})`
    );
    return result;
  }

  async createIncomingMessage(
    config: ChatwootConnectionConfig,
    contactIdentifier: string,
    conversationId: string,
    content: string,
    attachment?: { base64: string; mimetype: string; filename: string; publicUrl?: string }
  ): Promise<any> {
    const inboxIdentifier = await this.resolveInboxIdentifier(config);
    const echoId = this.buildEchoId();

    if (attachment && attachment.base64) {
      if (attachment.publicUrl) {
        const linkContent = this.buildAttachmentLinkContent(content, attachment);
        this.logger.log(JSON.stringify({
          flow: 'evolution_to_chatwoot',
          stage: 'attachment_public_url_forwarded_text',
          conversationId,
          filename: attachment.filename,
          mimetype: attachment.mimetype,
          storageUrlHost: this.extractUrlHost(attachment.publicUrl),
        }));
        return this.createIncomingMessage(
          config,
          contactIdentifier,
          conversationId,
          linkContent,
        );
      }

      const formData = new FormData();
      formData.append('content', content || '');
      formData.append('echo_id', echoId);
      try {
        const normalizedAttachment = this.normalizeAttachmentInput(attachment);
        const buffer = Buffer.from(normalizedAttachment.base64, 'base64');
        const blob = new Blob([buffer], { type: normalizedAttachment.mimetype });
        formData.append('attachments[]', blob, normalizedAttachment.filename);

        if (inboxIdentifier) {
          try {
            const result = await this.request(
              config,
              `/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactIdentifier}/conversations/${conversationId}/messages`,
              'POST',
              formData
            );
            this.logger.debug(
              `[ChatwootClient] Mensagem com anexo criada via rota publica (inboxIdentifier=${inboxIdentifier}, conversationId=${conversationId})`
            );
            return result;
          } catch (error: any) {
            if (!this.isNotFoundError(error)) throw error;
            this.logger.warn(
              `[ChatwootClient] 404 na rota publica de mensagem com anexo (inboxIdentifier=${inboxIdentifier}, conversationId=${conversationId}). Tentando rota de conta...`
            );
          }
        }

        const result = await this.request(
          config,
          `/api/v1/accounts/${config.accountId}/conversations/${conversationId}/messages`,
          'POST',
          this.appendAccountIncomingFields(formData)
        );
        this.logger.debug(
          `[ChatwootClient] Mensagem com anexo criada via rota de conta (conversationId=${conversationId})`
        );
        return result;
      } catch (e: any) {
        this.logger.error(`Erro ao processar anexo para o Chatwoot: ${e.message}`);
        if (this.isAttachmentStorageError(e)) {
          const fallbackContent = this.buildAttachmentLinkContent(content, attachment);
          this.logger.warn(JSON.stringify({
            flow: 'evolution_to_chatwoot',
            stage: 'attachment_native_upload_failed_fallback_text',
            conversationId,
            filename: attachment.filename,
            mimetype: attachment.mimetype,
            hasPublicUrl: Boolean(attachment.publicUrl),
            error: e?.message ?? 'unknown_error',
          }));
          return this.createIncomingMessage(
            config,
            contactIdentifier,
            conversationId,
            fallbackContent,
          );
        }
        throw e;
      }
    }

    const payload = {
      content,
      echo_id: echoId,
    };

    if (inboxIdentifier) {
      try {
        const result = await this.request(
          config,
          `/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactIdentifier}/conversations/${conversationId}/messages`,
          'POST',
          payload
        );
        this.logger.debug(
          `[ChatwootClient] Mensagem criada via rota publica (inboxIdentifier=${inboxIdentifier}, conversationId=${conversationId})`
        );
        return result;
      } catch (error: any) {
        if (!this.isNotFoundError(error)) throw error;
        this.logger.warn(
          `[ChatwootClient] 404 na rota publica de mensagem (inboxIdentifier=${inboxIdentifier}, conversationId=${conversationId}). Tentando rota de conta...`
        );
      }
    }

    const result = await this.request(
      config,
      `/api/v1/accounts/${config.accountId}/conversations/${conversationId}/messages`,
      'POST',
      {
        ...payload,
        message_type: 'incoming',
        private: false,
        content_type: 'text',
        content_attributes: {},
      }
    );
    this.logger.debug(
      `[ChatwootClient] Mensagem criada via rota de conta (conversationId=${conversationId})`
    );
    return result;
  }

  async resolveAttachmentPayload(
    config: ChatwootConnectionConfig,
    attachment: any,
  ): Promise<{ dataUrl: string; mimetype: string; filename: string } | null> {
    const directCandidates = this.collectAttachmentCandidates(attachment);

    const fallbackMime = this.normalizeAttachmentMimeType(
      attachment?.file_type ??
      attachment?.data?.content_type ??
      attachment?.content_type ??
      attachment?.extension,
    );
    const fallbackFilename = this.ensureFilenameExtension(
      attachment?.data?.filename ?? attachment?.file_name ?? 'arquivo',
      this.extensionFromMimeType(fallbackMime),
    );

    if (!directCandidates.length) {
      return null;
    }

    for (const directCandidate of directCandidates) {
      if (directCandidate.startsWith('data:')) {
        return {
          dataUrl: directCandidate,
          mimetype: fallbackMime,
          filename: fallbackFilename,
        };
      }
    }

    const failures: string[] = [];

    for (const directCandidate of directCandidates) {
      const attachmentUrl = this.resolveAttachmentUrl(config, directCandidate);
      const attempts = this.buildAttachmentFetchAttempts(config, attachmentUrl);

      for (const attempt of attempts) {
        let response: Response;
        try {
          response = await fetch(attempt.url, {
            method: 'GET',
            headers: attempt.headers,
          });
        } catch (error: any) {
          failures.push(
            `${attempt.label}:fetch_failed:${this.summarizeAttachmentCandidate(attachmentUrl)}:${this.truncateErrorText(this.describeFetchError(error))}`
          );
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'unknown_error');
          failures.push(
            `${attempt.label}:${response.status}:${this.summarizeAttachmentCandidate(attachmentUrl)}:${this.truncateErrorText(errorText)}`
          );
          continue;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const responseMime = this.normalizeAttachmentMimeType(response.headers.get('content-type') ?? fallbackMime);
        const filename = this.ensureFilenameExtension(
          fallbackFilename,
          this.extensionFromMimeType(responseMime),
        );

        return {
          dataUrl: `data:${responseMime};base64,${buffer.toString('base64')}`,
          mimetype: responseMime,
          filename,
        };
      }
    }

    throw new Error(
      `Falha ao baixar anexo do Chatwoot. attachmentId=${String(attachment?.id ?? '').trim() || 'unknown'} candidates=${directCandidates
        .map((candidate) => this.summarizeAttachmentCandidate(this.resolveAttachmentUrl(config, candidate)))
        .join(', ')} failures=${failures.join(' | ')}`
    );
  }

  async getIntegrationHealth(config: ChatwootConnectionConfig): Promise<{
    status: 'ok' | 'error';
    checkedAt: string;
    accountRoute: { endpoint: string; ok: boolean; error?: string };
    inbox: {
      configuredInboxId?: string;
      configuredInboxIdentifier?: string;
      resolvedInboxId?: string;
      resolvedInboxIdentifier?: string;
    };
  }> {
    const endpoint = `/api/v1/accounts/${config.accountId}/inboxes`;
    try {
      await this.request(config, endpoint, 'GET', undefined, 1);
      const resolvedInboxId = await this.resolveInboxId(config);
      const resolvedInboxIdentifier = await this.resolveInboxIdentifier(config);

      return {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        accountRoute: { endpoint, ok: true },
        inbox: {
          configuredInboxId: config.inboxId,
          configuredInboxIdentifier: config.inboxIdentifier,
          resolvedInboxId,
          resolvedInboxIdentifier,
        },
      };
    } catch (error: any) {
      return {
        status: 'error',
        checkedAt: new Date().toISOString(),
        accountRoute: {
          endpoint,
          ok: false,
          error: error?.message ?? 'unknown_error',
        },
        inbox: {
          configuredInboxId: config.inboxId,
          configuredInboxIdentifier: config.inboxIdentifier,
        },
      };
    }
  }

  private async resolveInboxIdentifier(config: ChatwootConnectionConfig): Promise<string | undefined> {
    const inboxes: any[] | null = await this.fetchInboxes(config);
    if (config.inboxIdentifier && !/^\d+$/.test(config.inboxIdentifier)) {
      if (!inboxes?.length) {
        this.logger.warn(
          `[ChatwootClient] Nao foi possivel validar inboxIdentifier configurado (${config.inboxIdentifier}); usando valor configurado por falta de resposta da API de inboxes.`
        );
        return config.inboxIdentifier;
      }

      const matchedConfiguredIdentifier = inboxes.find(
        (inbox: any) => inbox?.identifier?.toString?.() === config.inboxIdentifier
      );
      if (matchedConfiguredIdentifier?.identifier) {
        return matchedConfiguredIdentifier.identifier.toString();
      }

      this.logger.warn(
        `[ChatwootClient] inboxIdentifier configurado nao encontrado nas inboxes da conta (${config.inboxIdentifier}). Ignorando rota publica e usando fallback da API de conta.`
      );
      return undefined;
    }

    if (!inboxes?.length) {
      return undefined;
    }

    const matchedByIdentifier = config.inboxIdentifier
      ? inboxes.find((inbox: any) => inbox?.identifier?.toString?.() === config.inboxIdentifier)
      : null;
    if (matchedByIdentifier?.identifier) {
      return matchedByIdentifier.identifier.toString();
    }

    const matchedById = config.inboxId
      ? inboxes.find((inbox: any) => inbox?.id?.toString?.() === config.inboxId)
      : config.inboxIdentifier
        ? inboxes.find((inbox: any) => inbox?.id?.toString?.() === config.inboxIdentifier)
        : null;
    return matchedById?.identifier?.toString?.();
  }

  private async resolveInboxId(config: ChatwootConnectionConfig): Promise<string | undefined> {
    if (config.inboxId) {
      return config.inboxId;
    }

    const inboxes: any[] | null = await this.fetchInboxes(config);
    if (!inboxes?.length || !config.inboxIdentifier) return undefined;

    const matched = inboxes.find((inbox: any) => {
      const identifier = inbox?.identifier?.toString?.();
      const id = inbox?.id?.toString?.();
      return identifier === config.inboxIdentifier || id === config.inboxIdentifier;
    });
    return matched?.id?.toString?.();
  }

  private async fetchInboxes(config: ChatwootConnectionConfig): Promise<any[] | null> {
    if (!config.accountId) return null;
    try {
      const response = await this.request(config, `/api/v1/accounts/${config.accountId}/inboxes`, 'GET');
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.payload)) return response.payload;
      return null;
    } catch (error: any) {
      this.logger.warn(`Nao foi possivel listar inboxes do Chatwoot para resolver configuracao: ${error?.message}`);
      return null;
    }
  }

  private isNotFoundError(error: any): boolean {
    const message = String(error?.message ?? '');
    return message.includes('Chatwoot API error') && message.includes(': 404 -');
  }

  private buildEchoId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private buildPlatformPassword(): string {
    return `Syspro!${Math.random().toString(36).slice(2, 8)}9A`;
  }

  private normalizeAttachmentInput(attachment: {
    base64: string;
    mimetype: string;
    filename: string;
  }): { base64: string; mimetype: string; filename: string } {
    const mimetype = String(attachment.mimetype || 'application/octet-stream').trim().toLowerCase();
    const base64 = String(attachment.base64 || '')
      .replace(/^data:[^;]+;base64,/, '')
      .replace(/\s+/g, '');

    if (!base64) {
      throw new Error('Anexo recebido sem base64 valido.');
    }

    const fallbackExtension = this.extensionFromMimeType(mimetype);
    const filename = this.ensureFilenameExtension(attachment.filename, fallbackExtension);

    return {
      base64,
      mimetype,
      filename,
    };
  }

  private extensionFromMimeType(mimetype: string): string {
    switch (mimetype) {
      case 'image/jpeg':
      case 'image/jpg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'image/gif':
        return '.gif';
      case 'video/mp4':
        return '.mp4';
      case 'video/webm':
        return '.webm';
      case 'video/ogg':
        return '.ogv';
      case 'video/quicktime':
        return '.mov';
      case 'audio/ogg':
      case 'audio/opus':
        return '.ogg';
      case 'audio/mpeg':
        return '.mp3';
      case 'audio/mp4':
      case 'audio/aac':
        return '.m4a';
      case 'audio/amr':
        return '.amr';
      case 'audio/wav':
      case 'audio/x-wav':
        return '.wav';
      case 'audio/webm':
        return '.webm';
      case 'application/pdf':
        return '.pdf';
      default:
        return '';
    }
  }

  private normalizeAttachmentMimeType(value: unknown): string {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return 'application/octet-stream';

    if (normalized === 'image') return 'image/jpeg';
    if (normalized === 'video') return 'video/mp4';
    if (normalized === 'audio') return 'audio/ogg';
    if (normalized === 'document') return 'application/pdf';
    if (normalized === 'jpg') return 'image/jpeg';
    if (normalized === 'jpeg') return 'image/jpeg';
    if (normalized === 'png') return 'image/png';
    if (normalized === 'gif') return 'image/gif';
    if (normalized === 'webp') return 'image/webp';
    if (normalized === 'mp4') return 'video/mp4';
    if (normalized === 'mov') return 'video/quicktime';
    if (normalized === 'webm') return 'video/webm';
    if (normalized === 'ogg') return 'audio/ogg';
    if (normalized === 'opus') return 'audio/opus';
    if (normalized === 'mp3') return 'audio/mpeg';
    if (normalized === 'm4a') return 'audio/mp4';
    if (normalized === 'aac') return 'audio/aac';
    if (normalized === 'amr') return 'audio/amr';
    if (normalized === 'wav') return 'audio/wav';
    return normalized;
  }

  private ensureFilenameExtension(filename: string, fallbackExtension: string): string {
    const normalized = String(filename || 'arquivo').trim() || 'arquivo';
    if (!fallbackExtension || /\.[a-z0-9]+$/i.test(normalized)) {
      return normalized;
    }

    return `${normalized}${fallbackExtension}`;
  }

  private resolveAttachmentUrl(config: ChatwootConnectionConfig, value: string): string {
    if (/^https?:\/\//i.test(value)) {
      return value;
    }

    const baseUrl = String(config.url || '').replace(/\/+$/, '');
    const suffix = value.startsWith('/') ? value : `/${value}`;
    return `${baseUrl}${suffix}`;
  }

  private collectAttachmentCandidates(attachment: any): string[] {
    const rawCandidates = [
      attachment?.data_url,
      attachment?.download_url,
      attachment?.thumb_url,
      attachment?.external_url,
      attachment?.file_url,
      attachment?.url,
      attachment?.data?.data_url,
      attachment?.data?.download_url,
      attachment?.data?.thumb_url,
      attachment?.data?.external_url,
      attachment?.data?.file_url,
      attachment?.data?.url,
    ];

    const normalized = rawCandidates
      .map((value: unknown) => String(value ?? '').trim())
      .filter(Boolean);

    return Array.from(new Set(normalized));
  }

  private buildAttachmentFetchAttempts(
    config: ChatwootConnectionConfig,
    attachmentUrl: string,
  ): Array<{ label: string; url: string; headers?: Record<string, string> }> {
    return [
      {
        label: 'with_api_token',
        url: attachmentUrl,
        headers: { api_access_token: config.apiToken },
      },
      {
        label: 'without_auth',
        url: attachmentUrl,
      },
    ];
  }

  private summarizeAttachmentCandidate(url: string): string {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.length > 80
        ? `${parsed.pathname.slice(0, 77)}...`
        : parsed.pathname;
      return `${parsed.origin}${pathname}`;
    } catch {
      return url.length > 120 ? `${url.slice(0, 117)}...` : url;
    }
  }

  private truncateErrorText(value: string): string {
    const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
    return normalized.length > 220 ? `${normalized.slice(0, 217)}...` : normalized;
  }

  private describeFetchError(error: any): string {
    const parts = [
      error?.message,
      error?.cause?.message,
      error?.cause?.code,
      error?.cause?.errno,
    ]
      .map((value) => String(value ?? '').trim())
      .filter(Boolean);

    return parts.length ? parts.join(' | ') : 'fetch failed';
  }

  private appendAccountIncomingFields(formData: FormData): FormData {
    formData.append('message_type', 'incoming');
    formData.append('private', 'false');
    formData.append('content_type', 'text');
    return formData;
  }

  private isAttachmentStorageError(error: any): boolean {
    const message = String(error?.message ?? '').toLowerCase();
    return (
      message.includes('checksum') ||
      message.includes('nosuchkey') ||
      message.includes('failed to open tcp connection') ||
      message.includes('s3.auto.amazonaws.com') ||
      message.includes('getaddrinfo') ||
      message.includes('name does not resolve') ||
      message.includes('active storage') ||
      message.includes('falha ao baixar anexo')
    );
  }

  private buildAttachmentLinkContent(
    content: string,
    attachment: { filename: string; mimetype: string; publicUrl?: string },
  ): string {
    const isImage = attachment.mimetype.toLowerCase().startsWith('image/');
    const mediaLine = attachment.publicUrl
      ? isImage
        ? `![${attachment.filename}](${attachment.publicUrl})`
        : `Arquivo: ${attachment.publicUrl}`
      : 'Arquivo nao anexado: falha no storage do Chatwoot.';

    const lines = [
      content?.trim(),
      `[Midia recebida: ${attachment.filename} (${attachment.mimetype})]`,
      mediaLine,
    ].filter(Boolean);

    return lines.join('\n');
  }

  private extractUrlHost(value: string): string | null {
    try {
      return new URL(value).host;
    } catch {
      return null;
    }
  }

  private toNumericIdentifier(value: string): string | null {
    const normalized = String(value ?? '').trim();
    return /^\d+$/.test(normalized) ? normalized : null;
  }

  private async platformRequest(
    config: ChatwootConnectionConfig,
    endpoint: string,
    method: string = 'GET',
    body?: any,
  ): Promise<any> {
    if (!config.url || !config.platformApiToken) {
      throw new Error('CHATWOOT_URL ou CHATWOOT_PLATFORM_API_TOKEN nao configurados.');
    }

    const url = `${config.url}${endpoint}`;
    const headers: Record<string, string> = {
      api_access_token: config.platformApiToken,
    };

    let requestBody: string | undefined;
    if (body) {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
    }

    const response = await fetch(url, {
      method,
      headers,
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown_error');
      throw new Error(`Chatwoot Platform API error (${method} ${endpoint}): ${response.status} - ${errorText}`);
    }

    if (response.status === 204) return null;
    return response.json();
  }
}
