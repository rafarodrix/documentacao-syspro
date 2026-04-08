import { Injectable, Logger } from '@nestjs/common';

export type ChatwootConnectionConfig = {
  url: string;
  apiToken: string;
  accountId: string;
  inboxId: string;
  inboxIdentifier: string;
  webhookSecret?: string;
  webhookMaxSkewSeconds?: number;
};

@Injectable()
export class ChatwootClient {
  private readonly logger = new Logger(ChatwootClient.name);

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
    data: { name?: string; phone_number?: string; email?: string }
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

  async createConversation(config: ChatwootConnectionConfig, contactIdentifier: string, contactId?: string) {
    const inboxIdentifier = await this.resolveInboxIdentifier(config);
    if (inboxIdentifier) {
      try {
        return await this.request(
          config,
          `/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactIdentifier}/conversations`,
          'POST'
        );
      } catch (error: any) {
        if (!this.isNotFoundError(error)) throw error;
      }
    }

    const inboxId = await this.resolveInboxId(config);
    if (!inboxId) {
      throw new Error('CHATWOOT_INBOX_ID nao configurado/resolvido para criar conversa via API de conta');
    }

    return this.request(
      config,
      `/api/v1/accounts/${config.accountId}/conversations`,
      'POST',
      {
        source_id: contactIdentifier,
        inbox_id: Number(inboxId),
        ...(contactId ? { contact_id: Number(contactId) } : {}),
      }
    );
  }

  async createIncomingMessage(
    config: ChatwootConnectionConfig,
    contactIdentifier: string,
    conversationId: string,
    content: string,
    attachment?: { base64: string; mimetype: string; filename: string }
  ) {
    const inboxIdentifier = await this.resolveInboxIdentifier(config);
    const echoId = this.buildEchoId();

    if (attachment && attachment.base64) {
      const formData = new FormData();
      formData.append('content', content || '');
      formData.append('echo_id', echoId);
      try {
        const buffer = Buffer.from(attachment.base64, 'base64');
        const blob = new Blob([buffer], { type: attachment.mimetype });
        formData.append('attachments[]', blob, attachment.filename);

        if (inboxIdentifier) {
          try {
            return await this.request(
              config,
              `/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactIdentifier}/conversations/${conversationId}/messages`,
              'POST',
              formData
            );
          } catch (error: any) {
            if (!this.isNotFoundError(error)) throw error;
          }
        }

        return await this.request(
          config,
          `/api/v1/accounts/${config.accountId}/conversations/${conversationId}/messages`,
          'POST',
          this.appendAccountIncomingFields(formData)
        );
      } catch (e: any) {
        this.logger.error(`Erro ao processar anexo para o Chatwoot: ${e.message}`);
      }
    }

    const payload = {
      content,
      echo_id: echoId,
    };

    if (inboxIdentifier) {
      try {
        return await this.request(
          config,
          `/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactIdentifier}/conversations/${conversationId}/messages`,
          'POST',
          payload
        );
      } catch (error: any) {
        if (!this.isNotFoundError(error)) throw error;
      }
    }

    return this.request(
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
    if (config.inboxIdentifier && !/^\d+$/.test(config.inboxIdentifier)) {
      return config.inboxIdentifier;
    }

    const inboxes: any[] | null = await this.fetchInboxes(config);
    if (!inboxes?.length) {
      return config.inboxIdentifier && !/^\d+$/.test(config.inboxIdentifier)
        ? config.inboxIdentifier
        : undefined;
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

  private appendAccountIncomingFields(formData: FormData): FormData {
    formData.append('message_type', 'incoming');
    formData.append('private', 'false');
    formData.append('content_type', 'text');
    return formData;
  }

  private toNumericIdentifier(value: string): string | null {
    const normalized = String(value ?? '').trim();
    return /^\d+$/.test(normalized) ? normalized : null;
  }
}
