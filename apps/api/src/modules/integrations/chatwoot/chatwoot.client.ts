import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ChatwootClient {
  private readonly logger = new Logger(ChatwootClient.name);
  private readonly baseUrl = process.env.CHATWOOT_URL;
  private readonly token = process.env.CHATWOOT_API_TOKEN;
  private readonly accountId = process.env.CHATWOOT_ACCOUNT_ID;
  private readonly inboxId = process.env.CHATWOOT_INBOX_IDENTIFIER;

  private async request(endpoint: string, method: string = 'GET', body?: any, retries: number = 3): Promise<any> {
    if (!this.baseUrl || !this.token) {
      this.logger.warn('CHATWOOT_URL ou CHATWOOT_API_TOKEN não configurados.');
      return null;
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const headers: any = { 'api_access_token': this.token };
        let requestBody: any;
        
        if (body instanceof FormData) {
          requestBody = body; // o fetch define o Content-Type: multipart/form-data automaticamente com boundary
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
          this.logger.error(`Chatwoot API error (attempt ${attempt}): ${response.status} - ${errorText}`);

          // Erros de validação (422) e cliente não devem causar retentativas
          if ([400, 401, 403, 404, 422].includes(response.status) || attempt === retries) {
            const err = new Error(`Chatwoot API error: ${response.status} - ${errorText}`);
            (err as any).isClientError = true;
            throw err;
          }

          await new Promise(res => setTimeout(res, attempt * 1000)); // Espera incremental antes de tentar de novo
          continue;
        }
        return await response.json();
      } catch (error: any) {
        if (error.isClientError || attempt === retries) throw error;
        this.logger.error(`Network error on Chatwoot API (attempt ${attempt}): ${error.message}`);
        await new Promise(res => setTimeout(res, attempt * 1000));
      }
    }
  }

  async createOrFindContact(phoneNumber: string, name: string, avatarUrl?: string) {
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

    // 1. Tenta buscar o contato existente primeiro
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

    // 2. Se nao existir, tenta criar
    try {
      const payload: any = {
        inbox_id: this.inboxId,
        name,
        phone_number: formattedPhone,
      };
      if (avatarUrl) payload.avatar_url = avatarUrl;
      return await this.request(`/api/v1/accounts/${this.accountId}/contacts`, 'POST', payload);
    } catch (error: any) {
      // 3. Fallback em caso de concorrencia (422 Phone number already taken)
      if (error.message.includes('422')) {
        this.logger.warn(`Contato com numero ${formattedPhone} ja existe. Retornando contato existente da busca...`);
        const retrySearch: any = await this.request(`/api/v1/accounts/${this.accountId}/contacts/search?q=${encodeURIComponent(formattedPhone)}`, 'GET');
        const retryExisting = retrySearch?.payload?.find((c: any) => c.phone_number === formattedPhone);
        if (retryExisting) {
          return { payload: { contact: retryExisting } };
        }
      }
      throw error;
    }
  }

  async updateContact(contactIdentifier: string, data: { name?: string; phone_number?: string; email?: string }) {
    return this.request(
      `/api/v1/accounts/${this.accountId}/contacts/${contactIdentifier}`,
      'PUT',
      data
    );
  }

  async updateMessageStatus(conversationId: string, messageId: string, status: 'delivered' | 'read') {
    return this.request(
      `/api/v1/accounts/${this.accountId}/conversations/${conversationId}/messages/${messageId}`,
      'PUT',
      { status }
    );
  }

  async createConversation(contactIdentifier: string) {
    // Cria conversa usando a API Pública de Inboxes
    return this.request(
      `/public/api/v1/inboxes/${this.inboxId}/contacts/${contactIdentifier}/conversations`,
      'POST'
    );
  }

  async createIncomingMessage(contactIdentifier: string, conversationId: string, content: string, attachment?: { base64: string, mimetype: string, filename: string }) {
    if (attachment && attachment.base64) {
      const formData = new FormData();
      formData.append('content', content || '');
      formData.append('message_type', 'incoming');
      try {
        const buffer = Buffer.from(attachment.base64, 'base64');
        const blob = new Blob([buffer], { type: attachment.mimetype });
        formData.append('attachments[]', blob, attachment.filename);
        
        return this.request(
          `/public/api/v1/inboxes/${this.inboxId}/contacts/${contactIdentifier}/conversations/${conversationId}/messages`,
          'POST',
          formData
        );
      } catch (e: any) {
        this.logger.error(`Erro ao processar anexo para o Chatwoot: ${e.message}`);
      }
    }

    // Envia mensagem simulando o usuário na API Pública
    return this.request(
      `/public/api/v1/inboxes/${this.inboxId}/contacts/${contactIdentifier}/conversations/${conversationId}/messages`,
      'POST',
      {
        content,
        message_type: 'incoming', // Incoming do ponto de vista do atendente do Chatwoot
      }
    );
  }
}