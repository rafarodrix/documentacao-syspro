import { Injectable, Logger } from '@nestjs/common';
import { onlyDigits } from '@dosc-syspro/shared';
import { ChatwootAttachmentResolver } from './chatwoot-attachment.resolver';
import { ChatwootPlatformClient } from './chatwoot-platform.client';

export type ChatwootConnectionConfig = {
  url: string;
  apiToken: string;
  platformApiToken?: string;
  systemBotApiToken?: string;
  accountId: string;
  inboxId: string;
  inboxIdentifier: string;
  webhookSecret?: string;
  webhookMaxSkewSeconds?: number;
  incomingMediaMode?: 'link' | 'attachment';
};

@Injectable()
export class ChatwootClient {
  private readonly logger = new Logger(ChatwootClient.name);

  constructor(
    private readonly attachmentResolver: ChatwootAttachmentResolver,
    private readonly platformClient: ChatwootPlatformClient,
  ) {}

  // ──────────────────────────────────────────────────────
  // Platform / SSO — delegated to ChatwootPlatformClient
  // ──────────────────────────────────────────────────────

  async createPlatformUser(
    config: ChatwootConnectionConfig,
    input: { name: string; email: string; displayName?: string; customAttributes?: Record<string, unknown> },
  ): Promise<any> {
    return this.platformClient.createPlatformUser(config, input);
  }

  async updatePlatformUser(
    config: ChatwootConnectionConfig,
    userId: string,
    input: { name: string; email: string; displayName?: string; customAttributes?: Record<string, unknown> },
  ): Promise<any> {
    return this.platformClient.updatePlatformUser(config, userId, input);
  }

  async createAccountUser(
    config: ChatwootConnectionConfig,
    userId: string,
    role: 'agent' | 'administrator',
  ): Promise<any> {
    return this.platformClient.createAccountUser(config, userId, role);
  }

  async getUserSsoLink(config: ChatwootConnectionConfig, userId: string): Promise<string> {
    return this.platformClient.getUserSsoLink(config, userId);
  }

  async deletePlatformUser(config: ChatwootConnectionConfig, userId: string): Promise<void> {
    return this.platformClient.deletePlatformUser(config, userId);
  }

  // ──────────────────────────────────────────────────────
  // Attachments — delegated to ChatwootAttachmentResolver
  // ──────────────────────────────────────────────────────

  async resolveAttachmentPayload(
    config: ChatwootConnectionConfig,
    attachment: any,
  ): Promise<{ dataUrl: string; mimetype: string; filename: string } | null> {
    return this.attachmentResolver.resolveAttachmentPayload(config, attachment);
  }

  // ──────────────────────────────────────────────────────
  // Diagnostics
  // ──────────────────────────────────────────────────────

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
        accountRoute: { endpoint, ok: false, error: error?.message ?? 'unknown_error' },
        inbox: { configuredInboxId: config.inboxId, configuredInboxIdentifier: config.inboxIdentifier },
      };
    }
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
        inbox: { configuredInboxId: config.inboxId, configuredInboxIdentifier: config.inboxIdentifier, resolvedInboxId, resolvedInboxIdentifier },
      };
    } catch (error: any) {
      return {
        status: 'error',
        checkedAt: new Date().toISOString(),
        accountRoute: { endpoint, ok: false, error: error?.message ?? 'unknown_error' },
        inbox: { configuredInboxId: config.inboxId, configuredInboxIdentifier: config.inboxIdentifier },
      };
    }
  }

  // ──────────────────────────────────────────────────────
  // Contacts
  // ──────────────────────────────────────────────────────

  async createOrFindContact(config: ChatwootConnectionConfig, phoneNumber: string, name: string, avatarUrl?: string) {
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    const searchResponse: any = await this.request(
      config,
      `/api/v1/accounts/${config.accountId}/contacts/search?q=${encodeURIComponent(formattedPhone)}`,
      'GET',
    );
    if (searchResponse?.payload && Array.isArray(searchResponse.payload)) {
      const existingContact = searchResponse.payload.find((c: any) => c.phone_number === formattedPhone);
      if (existingContact) return { payload: { contact: existingContact } };
    }

    try {
      const inboxId = await this.resolveInboxId(config);
      if (!inboxId) throw new Error('CHATWOOT_INBOX_ID nao configurado/resolvido para criar contato via API de conta');
      const payload: any = { inbox_id: inboxId, name, phone_number: formattedPhone };
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
          'GET',
        );
        const retryExisting = retrySearch?.payload?.find((c: any) => c.phone_number === formattedPhone);
        if (retryExisting) return { payload: { contact: retryExisting } };
      }
      throw error;
    }
  }

  async createOrFindContactByIdentifier(
    config: ChatwootConnectionConfig,
    identifier: string,
    name: string,
    customAttributes?: Record<string, unknown>,
  ) {
    const normalizedIdentifier = String(identifier ?? '').trim();
    if (!normalizedIdentifier) throw new Error('Chatwoot contact identifier obrigatorio');

    const searchResponse: any = await this.request(
      config,
      `/api/v1/accounts/${config.accountId}/contacts/search?q=${encodeURIComponent(normalizedIdentifier)}`,
      'GET',
    );
    if (searchResponse?.payload && Array.isArray(searchResponse.payload)) {
      const existingContact = searchResponse.payload.find(
        (contact: any) =>
          contact?.identifier === normalizedIdentifier ||
          contact?.custom_attributes?.whatsapp_group_jid === normalizedIdentifier,
      );
      if (existingContact) return { payload: { contact: existingContact } };
    }

    const inboxId = await this.resolveInboxId(config);
    if (!inboxId) throw new Error('CHATWOOT_INBOX_ID nao configurado/resolvido para criar contato de grupo via API de conta');

    const payload: any = {
      inbox_id: inboxId,
      name,
      identifier: normalizedIdentifier,
      custom_attributes: { ...(customAttributes ?? {}), whatsapp_group_jid: normalizedIdentifier },
    };
    try {
      return await this.request(config, `/api/v1/accounts/${config.accountId}/contacts`, 'POST', payload);
    } catch (error: any) {
      if (error.message.includes('422')) {
        const retrySearch: any = await this.request(
          config,
          `/api/v1/accounts/${config.accountId}/contacts/search?q=${encodeURIComponent(normalizedIdentifier)}`,
          'GET',
        );
        const retryExisting = retrySearch?.payload?.find(
          (contact: any) =>
            contact?.identifier === normalizedIdentifier ||
            contact?.custom_attributes?.whatsapp_group_jid === normalizedIdentifier,
        );
        if (retryExisting) return { payload: { contact: retryExisting } };
      }
      throw error;
    }
  }

  async updateContact(
    config: ChatwootConnectionConfig,
    contactIdentifier: string,
    data: {
      name?: string;
      phone_number?: string;
      email?: string;
      additional_attributes?: Record<string, unknown>;
      custom_attributes?: Record<string, unknown>;
    },
  ) {
    const inboxIdentifier = await this.resolveInboxIdentifier(config);
    if (inboxIdentifier) {
      try {
        return await this.request(
          config,
          `/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactIdentifier}`,
          'PATCH',
          data,
        );
      } catch (error: any) {
        if (!this.isNotFoundError(error)) throw error;
      }
    }

    const numericContactId =
      this.toNumericIdentifier(contactIdentifier) ??
      await this.resolveContactIdForAccountUpdate(config, contactIdentifier, data.phone_number);
    if (!numericContactId) {
      throw new Error(`Chatwoot contact identifier nao numerico sem rota publica disponivel e sem contato encontrado por telefone/source_id: ${contactIdentifier}`);
    }

    return await this.request(config, `/api/v1/accounts/${config.accountId}/contacts/${numericContactId}`, 'PUT', data);
  }

  async getContactableInboxes(
    config: ChatwootConnectionConfig,
    contactId: string,
  ): Promise<Array<{ source_id?: string; inbox?: { id?: number; identifier?: string } }>> {
    const numericContactId = this.toNumericIdentifier(contactId);
    if (!numericContactId) return [];
    const response = await this.request(
      config,
      `/api/v1/accounts/${config.accountId}/contacts/${numericContactId}/contactable_inboxes`,
      'GET',
    );
    return Array.isArray(response?.payload) ? response.payload : [];
  }

  // ──────────────────────────────────────────────────────
  // Conversations
  // ──────────────────────────────────────────────────────

  async createConversation(config: ChatwootConnectionConfig, contactIdentifier: string, contactId?: string) {
    const inboxIdentifier = await this.resolveInboxIdentifier(config);
    if (inboxIdentifier) {
      try {
        const result = await this.request(
          config,
          `/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactIdentifier}/conversations`,
          'POST',
        );
        this.logger.debug(`[ChatwootClient] Conversa criada via rota publica (inboxIdentifier=${inboxIdentifier}, contactIdentifier=${contactIdentifier})`);
        return result;
      } catch (error: any) {
        if (!this.isNotFoundError(error)) throw error;
        this.logger.warn(`[ChatwootClient] 404 ao criar conversa via rota publica. Tentando rota de conta...`);
      }
    }

    const inboxId = await this.resolveInboxId(config);
    if (!inboxId) throw new Error('CHATWOOT_INBOX_ID nao configurado/resolvido para criar conversa via API de conta');

    const result = await this.request(config, `/api/v1/accounts/${config.accountId}/conversations`, 'POST', {
      source_id: contactIdentifier,
      inbox_id: Number(inboxId),
      ...(contactId ? { contact_id: Number(contactId) } : {}),
    });
    this.logger.debug(`[ChatwootClient] Conversa criada via rota de conta (inboxId=${inboxId})`);
    return result;
  }

  async getConversationDetails(config: ChatwootConnectionConfig, conversationId: string) {
    return this.request(config, `/api/v1/accounts/${config.accountId}/conversations/${conversationId}`, 'GET');
  }

  async toggleConversationStatus(
    config: ChatwootConnectionConfig,
    conversationId: string,
    status: 'open' | 'resolved' | 'pending' | 'snoozed',
    options?: { useSystemBot?: boolean },
  ) {
    const authToken = options?.useSystemBot && config.systemBotApiToken ? config.systemBotApiToken : undefined;
    return this.request(
      config,
      `/api/v1/accounts/${config.accountId}/conversations/${conversationId}/toggle_status`,
      'POST',
      { status },
      3,
      authToken,
    );
  }

  async assignConversation(
    config: ChatwootConnectionConfig,
    conversationId: string,
    input: { assigneeId?: string; teamId?: string },
    options?: { useSystemBot?: boolean },
  ) {
    const authToken = options?.useSystemBot && config.systemBotApiToken ? config.systemBotApiToken : undefined;
    return this.request(
      config,
      `/api/v1/accounts/${config.accountId}/conversations/${conversationId}/assignments`,
      'POST',
      {
        ...(input.assigneeId ? { assignee_id: Number(input.assigneeId) } : {}),
        ...(input.teamId ? { team_id: Number(input.teamId) } : {}),
      },
      3,
      authToken,
    );
  }

  async updateConversationCustomAttributes(
    config: ChatwootConnectionConfig,
    conversationId: string,
    customAttributes: Record<string, unknown>,
    options?: { useSystemBot?: boolean },
  ) {
    const authToken = options?.useSystemBot && config.systemBotApiToken ? config.systemBotApiToken : undefined;
    return this.request(
      config,
      `/api/v1/accounts/${config.accountId}/conversations/${conversationId}/custom_attributes`,
      'POST',
      { custom_attributes: customAttributes },
      3,
      authToken,
    );
  }

  async listConversationLabels(config: ChatwootConnectionConfig, conversationId: string): Promise<string[]> {
    const response = await this.request(
      config,
      `/api/v1/accounts/${config.accountId}/conversations/${conversationId}/labels`,
      'GET',
    );
    if (Array.isArray(response?.payload)) return response.payload.map((item: unknown) => String(item ?? '').trim()).filter(Boolean);
    if (Array.isArray(response)) return response.map((item: unknown) => String(item ?? '').trim()).filter(Boolean);
    return [];
  }

  async setConversationLabels(
    config: ChatwootConnectionConfig,
    conversationId: string,
    labels: string[],
    options?: { useSystemBot?: boolean },
  ) {
    const authToken = options?.useSystemBot && config.systemBotApiToken ? config.systemBotApiToken : undefined;
    return this.request(
      config,
      `/api/v1/accounts/${config.accountId}/conversations/${conversationId}/labels`,
      'POST',
      { labels },
      3,
      authToken,
    );
  }

  // ──────────────────────────────────────────────────────
  // Messages
  // ──────────────────────────────────────────────────────

  async createIncomingMessage(
    config: ChatwootConnectionConfig,
    contactIdentifier: string,
    conversationId: string,
    content: string,
    attachment?: { base64: string; mimetype: string; filename: string; publicUrl?: string },
  ): Promise<any> {
    const inboxIdentifier = await this.resolveInboxIdentifier(config);
    const echoId = this.buildEchoId();

    if (attachment?.base64) {
      if (attachment.publicUrl && config.incomingMediaMode !== 'attachment') {
        const linkContent = this.attachmentResolver.buildAttachmentLinkContent(content, attachment);
        this.logger.log(JSON.stringify({
          flow: 'evolution_to_chatwoot', stage: 'attachment_public_url_forwarded_text',
          conversationId, filename: attachment.filename, mimetype: attachment.mimetype,
          incomingMediaMode: config.incomingMediaMode ?? 'link',
          storageUrlHost: this.attachmentResolver.extractUrlHost(attachment.publicUrl),
        }));
        return this.createIncomingMessage(config, contactIdentifier, conversationId, linkContent);
      }

      const formData = new FormData();
      formData.append('content', content || '');
      formData.append('echo_id', echoId);
      try {
        if (attachment.publicUrl) {
          this.logger.log(JSON.stringify({
            flow: 'evolution_to_chatwoot', stage: 'attachment_native_upload_requested',
            conversationId, filename: attachment.filename, mimetype: attachment.mimetype,
            incomingMediaMode: config.incomingMediaMode ?? 'link',
            storageUrlHost: this.attachmentResolver.extractUrlHost(attachment.publicUrl),
          }));
        }
        const normalizedAttachment = this.attachmentResolver.normalizeAttachmentInput(attachment);
        const buffer = Buffer.from(normalizedAttachment.base64, 'base64');
        const blob = new Blob([buffer], { type: normalizedAttachment.mimetype });
        formData.append('attachments[]', blob, normalizedAttachment.filename);

        if (inboxIdentifier) {
          try {
            const result = await this.request(
              config,
              `/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactIdentifier}/conversations/${conversationId}/messages`,
              'POST',
              formData,
            );
            this.logger.debug(`[ChatwootClient] Mensagem com anexo criada via rota publica (conversationId=${conversationId})`);
            return result;
          } catch (error: any) {
            if (!this.isNotFoundError(error)) throw error;
            this.logger.warn(`[ChatwootClient] 404 na rota publica de mensagem com anexo. Tentando rota de conta...`);
          }
        }

        const result = await this.request(
          config,
          `/api/v1/accounts/${config.accountId}/conversations/${conversationId}/messages`,
          'POST',
          this.attachmentResolver.appendAccountIncomingFields(formData),
        );
        this.logger.debug(`[ChatwootClient] Mensagem com anexo criada via rota de conta (conversationId=${conversationId})`);
        return result;
      } catch (e: any) {
        this.logger.error(`Erro ao processar anexo para o Chatwoot: ${e.message}`);
        if (this.attachmentResolver.isAttachmentStorageError(e)) {
          const fallbackContent = this.attachmentResolver.buildAttachmentLinkContent(content, attachment, { attachmentFailed: true });
          this.logger.warn(JSON.stringify({
            flow: 'evolution_to_chatwoot', stage: 'attachment_native_upload_failed_fallback_text',
            conversationId, filename: attachment.filename, mimetype: attachment.mimetype,
            hasPublicUrl: Boolean(attachment.publicUrl), error: e?.message ?? 'unknown_error',
          }));
          return this.createIncomingMessage(config, contactIdentifier, conversationId, fallbackContent);
        }
        throw e;
      }
    }

    const payload = { content, echo_id: echoId };
    if (inboxIdentifier) {
      try {
        const result = await this.request(
          config,
          `/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactIdentifier}/conversations/${conversationId}/messages`,
          'POST',
          payload,
        );
        this.logger.debug(`[ChatwootClient] Mensagem criada via rota publica (conversationId=${conversationId})`);
        return result;
      } catch (error: any) {
        if (!this.isNotFoundError(error)) throw error;
        this.logger.warn(`[ChatwootClient] 404 na rota publica de mensagem. Tentando rota de conta...`);
      }
    }

    const result = await this.request(
      config,
      `/api/v1/accounts/${config.accountId}/conversations/${conversationId}/messages`,
      'POST',
      { ...payload, message_type: 'incoming', private: false, content_type: 'text', content_attributes: {} },
    );
    this.logger.debug(`[ChatwootClient] Mensagem criada via rota de conta (conversationId=${conversationId})`);
    return result;
  }

  async createOutgoingMessage(
    config: ChatwootConnectionConfig,
    conversationId: string,
    content: string,
    options?: { useSystemBot?: boolean; contentAttributes?: Record<string, unknown> },
  ) {
    const authToken = options?.useSystemBot && config.systemBotApiToken ? config.systemBotApiToken : undefined;
    return this.request(
      config,
      `/api/v1/accounts/${config.accountId}/conversations/${conversationId}/messages`,
      'POST',
      {
        content,
        message_type: 'outgoing',
        private: false,
        content_type: 'text',
        content_attributes: options?.contentAttributes ?? {},
      },
      3,
      authToken,
    );
  }

  async createPrivateNote(
    config: ChatwootConnectionConfig,
    conversationId: string,
    content: string,
    options?: { useSystemBot?: boolean },
  ) {
    const authToken = options?.useSystemBot && config.systemBotApiToken ? config.systemBotApiToken : undefined;
    return this.request(
      config,
      `/api/v1/accounts/${config.accountId}/conversations/${conversationId}/messages`,
      'POST',
      { content, message_type: 'outgoing', private: true, content_type: 'text', content_attributes: {} },
      3,
      authToken,
    );
  }

  async updateMessageStatus(
    config: ChatwootConnectionConfig,
    conversationId: string,
    messageId: string,
    status: 'delivered' | 'read',
  ) {
    return this.request(
      config,
      `/api/v1/accounts/${config.accountId}/conversations/${conversationId}/messages/${messageId}`,
      'PUT',
      { status },
    );
  }

  async updateMessageContent(
    config: ChatwootConnectionConfig,
    conversationId: string,
    messageId: string,
    content: string,
  ) {
    return this.request(
      config,
      `/api/v1/accounts/${config.accountId}/conversations/${conversationId}/messages/${messageId}`,
      'PUT',
      { content },
    );
  }

  async deleteMessage(config: ChatwootConnectionConfig, conversationId: string, messageId: string) {
    return this.request(
      config,
      `/api/v1/accounts/${config.accountId}/conversations/${conversationId}/messages/${messageId}`,
      'DELETE',
    );
  }

  // ──────────────────────────────────────────────────────
  // Agents
  // ──────────────────────────────────────────────────────

  async listAgents(config: ChatwootConnectionConfig): Promise<any[]> {
    const response = await this.request(config, `/api/v1/accounts/${config.accountId}/agents`, 'GET');
    return Array.isArray(response) ? response : [];
  }

  async listConversations(
    config: ChatwootConnectionConfig,
    input: { page?: number; status?: 'all' | 'open' | 'resolved' | 'pending' | 'snoozed'; q?: string },
  ): Promise<any[]> {
    const params = new URLSearchParams();
    params.set('page', String(input.page ?? 1));
    params.set('status', input.status ?? 'all');
    if (input.q?.trim()) params.set('q', input.q.trim());

    const response = await this.request(
      config,
      `/api/v1/accounts/${config.accountId}/conversations?${params.toString()}`,
      'GET',
    );
    return Array.isArray(response?.data?.payload)
      ? response.data.payload
      : Array.isArray(response?.payload)
        ? response.payload
        : Array.isArray(response)
          ? response
          : [];
  }

  // ──────────────────────────────────────────────────────
  // Inbox resolution
  // ──────────────────────────────────────────────────────

  async resolveInboxIdentifier(config: ChatwootConnectionConfig): Promise<string | undefined> {
    const inboxes: any[] | null = await this.fetchInboxes(config);
    if (config.inboxIdentifier && !/^\d+$/.test(config.inboxIdentifier)) {
      if (!inboxes?.length) {
        this.logger.warn(`[ChatwootClient] Nao foi possivel validar inboxIdentifier configurado (${config.inboxIdentifier}); usando valor configurado por falta de resposta.`);
        return config.inboxIdentifier;
      }
      const matchedConfigured = inboxes.find((inbox: any) => inbox?.identifier?.toString?.() === config.inboxIdentifier);
      if (matchedConfigured?.identifier) return matchedConfigured.identifier.toString();
      this.logger.warn(`[ChatwootClient] inboxIdentifier configurado nao encontrado nas inboxes da conta (${config.inboxIdentifier}).`);
      return undefined;
    }

    if (!inboxes?.length) return undefined;
    const matchedByIdentifier = config.inboxIdentifier
      ? inboxes.find((inbox: any) => inbox?.identifier?.toString?.() === config.inboxIdentifier)
      : null;
    if (matchedByIdentifier?.identifier) return matchedByIdentifier.identifier.toString();

    const matchedById = config.inboxId
      ? inboxes.find((inbox: any) => inbox?.id?.toString?.() === config.inboxId)
      : config.inboxIdentifier
        ? inboxes.find((inbox: any) => inbox?.id?.toString?.() === config.inboxIdentifier)
        : null;
    return matchedById?.identifier?.toString?.();
  }

  async resolveInboxId(config: ChatwootConnectionConfig): Promise<string | undefined> {
    if (config.inboxId) return config.inboxId;
    const inboxes: any[] | null = await this.fetchInboxes(config);
    if (!inboxes?.length || !config.inboxIdentifier) return undefined;
    const matched = inboxes.find((inbox: any) => {
      const identifier = inbox?.identifier?.toString?.();
      const id = inbox?.id?.toString?.();
      return identifier === config.inboxIdentifier || id === config.inboxIdentifier;
    });
    return matched?.id?.toString?.();
  }

  // ──────────────────────────────────────────────────────
  // Internal HTTP
  // ──────────────────────────────────────────────────────

  private async request(
    config: ChatwootConnectionConfig,
    endpoint: string,
    method: string = 'GET',
    body?: any,
    retries: number = 3,
    authTokenOverride?: string,
  ): Promise<any> {
    const authToken = String(authTokenOverride ?? config.apiToken ?? '').trim();
    if (!config.url || !authToken) {
      this.logger.warn('CHATWOOT_URL ou CHATWOOT_API_TOKEN nao configurados.');
      return null;
    }

    const url = `${config.url}${endpoint}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const headers: any = { api_access_token: authToken };
        let requestBody: any;
        if (body instanceof FormData) {
          requestBody = body;
        } else if (body) {
          headers['Content-Type'] = 'application/json';
          requestBody = JSON.stringify(body);
        }

        const response = await fetch(url, { method, headers, body: requestBody });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'unknown_error');
          this.logger.error(`Chatwoot API error (attempt ${attempt}) [${method} ${endpoint}]: ${response.status} - ${errorText}`);
          if ([400, 401, 403, 404, 422].includes(response.status) || attempt === retries) {
            throw new Error(`Chatwoot API error (${method} ${endpoint}): ${response.status} - ${errorText}`);
          }
          await new Promise((res) => setTimeout(res, attempt * 1000));
          continue;
        }

        if (response.status === 204) return null;
        const rawText = await response.text();
        if (!rawText.trim()) return null;

        try {
          return JSON.parse(rawText);
        } catch {
          return rawText;
        }
      } catch (error: any) {
        const isClientError = error?.message?.includes('Chatwoot API error');
        if (isClientError || attempt === retries) throw error;
        this.logger.error(`Network error on Chatwoot API (attempt ${attempt}): ${error.message}`);
        await new Promise((res) => setTimeout(res, attempt * 1000));
      }
    }
  }

  private async fetchInboxes(config: ChatwootConnectionConfig): Promise<any[] | null> {
    if (!config.accountId) return null;
    try {
      const response = await this.request(config, `/api/v1/accounts/${config.accountId}/inboxes`, 'GET');
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.payload)) return response.payload;
      return null;
    } catch (error: any) {
      this.logger.warn(`Nao foi possivel listar inboxes do Chatwoot: ${error?.message}`);
      return null;
    }
  }

  private async resolveContactIdForAccountUpdate(
    config: ChatwootConnectionConfig,
    contactIdentifier: string,
    phoneNumber?: string,
  ): Promise<string | undefined> {
    const queries = [phoneNumber, onlyDigits(phoneNumber), contactIdentifier]
      .map((v) => String(v ?? '').trim())
      .filter(Boolean);

    for (const query of Array.from(new Set(queries))) {
      const response: any = await this.request(
        config,
        `/api/v1/accounts/${config.accountId}/contacts/search?q=${encodeURIComponent(query)}`,
        'GET',
        undefined,
        1,
      );
      const contacts = Array.isArray(response?.payload) ? response.payload : Array.isArray(response) ? response : [];
      const normalizedPhone = onlyDigits(phoneNumber);
      const match = contacts.find((contact: any) => {
        const contactId = contact?.id?.toString?.();
        if (!contactId) return false;
        return (
          contact?.source_id?.toString?.() === contactIdentifier ||
          contact?.identifier?.toString?.() === contactIdentifier ||
          contact?.contact_inboxes?.some?.((item: any) => item?.source_id?.toString?.() === contactIdentifier) ||
          (normalizedPhone && onlyDigits(contact?.phone_number) === normalizedPhone)
        );
      });
      const id = match?.id?.toString?.();
      if (id) return id;
    }

    return undefined;
  }

  private buildEchoId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private toNumericIdentifier(value: string): string | null {
    const normalized = String(value ?? '').trim();
    return /^\d+$/.test(normalized) ? normalized : null;
  }

  private isNotFoundError(error: any): boolean {
    const message = String(error?.message ?? '');
    return message.includes('Chatwoot API error') && message.includes(': 404 -');
  }
}
