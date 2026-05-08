import { Injectable, Logger } from '@nestjs/common';
import type { ChatwootConnectionConfig } from './chatwoot.client';

@Injectable()
export class ChatwootPlatformClient {
  private readonly logger = new Logger(ChatwootPlatformClient.name);

  async createPlatformUser(
    config: ChatwootConnectionConfig,
    input: { name: string; email: string; displayName?: string; customAttributes?: Record<string, unknown> },
  ): Promise<any> {
    const password = this.buildPlatformPassword();
    return this.platformRequest(config, '/platform/api/v1/users', 'POST', {
      name: input.name,
      display_name: input.displayName ?? input.name,
      email: input.email,
      password,
      custom_attributes: input.customAttributes ?? {},
    });
  }

  async updatePlatformUser(
    config: ChatwootConnectionConfig,
    userId: string,
    input: { name: string; email: string; displayName?: string; customAttributes?: Record<string, unknown> },
  ): Promise<any> {
    return this.platformRequest(config, `/platform/api/v1/users/${userId}`, 'PATCH', {
      name: input.name,
      display_name: input.displayName ?? input.name,
      email: input.email,
      custom_attributes: input.customAttributes ?? {},
    });
  }

  async createAccountUser(
    config: ChatwootConnectionConfig,
    userId: string,
    role: 'agent' | 'administrator',
  ): Promise<any> {
    return this.platformRequest(
      config,
      `/platform/api/v1/accounts/${config.accountId}/account_users`,
      'POST',
      { user_id: Number(userId), role },
    );
  }

  async getUserSsoLink(config: ChatwootConnectionConfig, userId: string): Promise<string> {
    const response = await this.platformRequest(config, `/platform/api/v1/users/${userId}/login`, 'GET');
    const url = String(response?.url ?? '').trim();
    if (!url) throw new Error(`Nao foi possivel obter link SSO do usuario Chatwoot ${userId}`);
    return url;
  }

  async deletePlatformUser(config: ChatwootConnectionConfig, userId: string): Promise<void> {
    await this.platformRequest(config, `/platform/api/v1/users/${userId}`, 'DELETE');
  }

  private buildPlatformPassword(): string {
    return `Syspro!${Math.random().toString(36).slice(2, 8)}9A`;
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
    const headers: Record<string, string> = { api_access_token: config.platformApiToken };

    let requestBody: string | undefined;
    if (body) {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
    }

    const response = await fetch(url, { method, headers, body: requestBody });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown_error');
      throw new Error(`Chatwoot Platform API error (${method} ${endpoint}): ${response.status} - ${errorText}`);
    }

    if (response.status === 204) return null;
    return response.json();
  }
}
