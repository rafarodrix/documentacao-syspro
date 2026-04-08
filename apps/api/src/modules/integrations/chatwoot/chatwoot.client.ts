import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ChatwootClient {
  private readonly logger = new Logger(ChatwootClient.name);
  private readonly baseUrl = process.env.CHATWOOT_URL;
  private readonly token = process.env.CHATWOOT_API_TOKEN;
  private readonly accountId = process.env.CHATWOOT_ACCOUNT_ID;
  private readonly configuredInboxIdentifier = process.env.CHATWOOT_INBOX_IDENTIFIER;
  private readonly configuredInboxId = process.env.CHATWOOT_INBOX_ID;
  private resolvedInboxIdentifier?: string;
  private resolvedInboxId?: string;

  private async request(endpoint: string, method: string = 'GET', body?: any, retries: number = 3): Promise<any> {
    if (!this.baseUrl || !this.token) {
      this.logger.warn('CHATWOOT_URL ou CHATWOOT_API_TOKEN nao configurados.');
      return null;
    }

    const url = `${this.baseUrl}${endpoint}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const headers: any = { api_access_token: this.token };
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

  async createOrFindContact(phoneNumber: string, name: string, avatarUrl?: string) {
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

    const searchResponse: any = await this.request(
      `/api/v1/accounts/${this.accountId}/contacts/search?q=${encodeURIComponent(formattedPhone)}`,
      'GET'
    );

    if (searchResponse?.payload && Array.isArray(searchResponse.payload)) {
      const existingContact = searchResponse.payload.find((c: any) => c.phone_number === formattedPhone);
      if (existingContact) {
        return { payload: { contact: existingContact } };
      }
    }

    try {
      const inboxId = await this.resolveInboxId();
      if (!inboxId) {
        throw new Error('CHATWOOT_INBOX_ID nao configurado/resolvido para criar contato via API de conta');
      }

      const payload: any = {
        inbox_id: inboxId,
        name,
        phone_number: formattedPhone,
      };
      if (avatarUrl) payload.avatar_url = avatarUrl;
      return await this.request(`/api/v1/accounts/${this.accountId}/contacts`, 'POST', payload);
    } catch (error: any) {
      if (error?.message?.includes('404')) {
        const inboxIdentifier = await this.resolveInboxIdentifier();
        if (!inboxIdentifier) throw error;

        const publicPayload: any = { name, phone_number: formattedPhone };
        if (avatarUrl) publicPayload.avatar_url = avatarUrl;
        return await this.request(`/public/api/v1/inboxes/${inboxIdentifier}/contacts`, 'POST', publicPayload);
      }

      if (error.message.includes('422')) {
        this.logger.warn(`Contato com numero ${formattedPhone} ja existe. Retornando contato existente da busca...`);
        const retrySearch: any = await this.request(
          `/api/v1/accounts/${this.accountId}/contacts/search?q=${encodeURIComponent(formattedPhone)}`,
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

  async updateContact(contactIdentifier: string, data: { name?: string; phone_number?: string; email?: string }) {
    try {
      return await this.request(`/api/v1/accounts/${this.accountId}/contacts/${contactIdentifier}`, 'PUT', data);
    } catch (error: any) {
      if (!error?.message?.includes('404')) throw error;
      const inboxIdentifier = await this.resolveInboxIdentifier();
      if (!inboxIdentifier) throw error;
      return this.request(`/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactIdentifier}`, 'PATCH', data);
    }
  }

  async updateMessageStatus(conversationId: string, messageId: string, status: 'delivered' | 'read') {
    return this.request(
      `/api/v1/accounts/${this.accountId}/conversations/${conversationId}/messages/${messageId}`,
      'PUT',
      { status }
    );
  }

  async createConversation(contactIdentifier: string) {
    const inboxIdentifier = await this.resolveInboxIdentifier();
    if (!inboxIdentifier) {
      throw new Error('CHATWOOT_INBOX_IDENTIFIER nao configurado para endpoints publicos do Chatwoot');
    }

    return this.request(
      `/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactIdentifier}/conversations`,
      'POST'
    );
  }

  async createIncomingMessage(
    contactIdentifier: string,
    conversationId: string,
    content: string,
    attachment?: { base64: string; mimetype: string; filename: string }
  ) {
    const inboxIdentifier = await this.resolveInboxIdentifier();
    if (!inboxIdentifier) {
      throw new Error('CHATWOOT_INBOX_IDENTIFIER nao configurado para endpoints publicos do Chatwoot');
    }

    if (attachment && attachment.base64) {
      const formData = new FormData();
      formData.append('content', content || '');
      formData.append('message_type', 'incoming');
      try {
        const buffer = Buffer.from(attachment.base64, 'base64');
        const blob = new Blob([buffer], { type: attachment.mimetype });
        formData.append('attachments[]', blob, attachment.filename);

        return this.request(
          `/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactIdentifier}/conversations/${conversationId}/messages`,
          'POST',
          formData
        );
      } catch (e: any) {
        this.logger.error(`Erro ao processar anexo para o Chatwoot: ${e.message}`);
      }
    }

    return this.request(
      `/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contactIdentifier}/conversations/${conversationId}/messages`,
      'POST',
      {
        content,
        message_type: 'incoming',
      }
    );
  }

  private async resolveInboxIdentifier(): Promise<string | undefined> {
    if (this.resolvedInboxIdentifier) return this.resolvedInboxIdentifier;

    if (this.configuredInboxIdentifier && !/^\d+$/.test(this.configuredInboxIdentifier)) {
      this.resolvedInboxIdentifier = this.configuredInboxIdentifier;
      return this.resolvedInboxIdentifier;
    }

    const inboxes: any[] | null = await this.fetchInboxes();
    if (!inboxes?.length) {
      this.resolvedInboxIdentifier = this.configuredInboxIdentifier;
      return this.resolvedInboxIdentifier;
    }

    const matchedByIdentifier = this.configuredInboxIdentifier
      ? inboxes.find((inbox: any) => inbox?.identifier?.toString?.() === this.configuredInboxIdentifier)
      : null;
    if (matchedByIdentifier?.identifier) {
      this.resolvedInboxIdentifier = matchedByIdentifier.identifier.toString();
      this.resolvedInboxId = matchedByIdentifier.id?.toString?.() ?? this.resolvedInboxId;
      return this.resolvedInboxIdentifier;
    }

    const matchedById = this.configuredInboxId
      ? inboxes.find((inbox: any) => inbox?.id?.toString?.() === this.configuredInboxId)
      : this.configuredInboxIdentifier
        ? inboxes.find((inbox: any) => inbox?.id?.toString?.() === this.configuredInboxIdentifier)
        : null;
    if (matchedById?.identifier) {
      this.resolvedInboxIdentifier = matchedById.identifier.toString();
      this.resolvedInboxId = matchedById.id?.toString?.() ?? this.resolvedInboxId;
      return this.resolvedInboxIdentifier;
    }

    this.resolvedInboxIdentifier = this.configuredInboxIdentifier;
    return this.resolvedInboxIdentifier;
  }

  private async resolveInboxId(): Promise<string | undefined> {
    if (this.resolvedInboxId) return this.resolvedInboxId;
    if (this.configuredInboxId) {
      this.resolvedInboxId = this.configuredInboxId;
      return this.resolvedInboxId;
    }

    const inboxes: any[] | null = await this.fetchInboxes();
    if (!inboxes?.length || !this.configuredInboxIdentifier) return undefined;

    const matched = inboxes.find((inbox: any) => {
      const identifier = inbox?.identifier?.toString?.();
      const id = inbox?.id?.toString?.();
      return identifier === this.configuredInboxIdentifier || id === this.configuredInboxIdentifier;
    });
    this.resolvedInboxId = matched?.id?.toString?.();
    if (matched?.identifier) this.resolvedInboxIdentifier = matched.identifier.toString();
    return this.resolvedInboxId;
  }

  private async fetchInboxes(): Promise<any[] | null> {
    if (!this.accountId) return null;
    try {
      const response = await this.request(`/api/v1/accounts/${this.accountId}/inboxes`, 'GET');
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.payload)) return response.payload;
      return null;
    } catch (error: any) {
      this.logger.warn(`Nao foi possivel listar inboxes do Chatwoot para resolver configuracao: ${error?.message}`);
      return null;
    }
  }
}
