import { Injectable } from '@nestjs/common';
import { ensureRequiredEvolutionSubscribe } from './evolution-webhook-subscribe';
import { SettingsIntegrationSecretsService } from './settings-integration-secrets.service';
import type { IntegrationConnectionRecord } from './integration-connections.types';

@Injectable()
export class IntegrationConnectionsTesterService {
  constructor(
    private readonly settingsSecrets: SettingsIntegrationSecretsService,
  ) {}

  async testConnection(row: IntegrationConnectionRecord) {
    const evolutionApiKey = this.settingsSecrets.decrypt(row.evolutionApiKeyEncrypted);
    const chatwootApiToken = this.settingsSecrets.decrypt(row.chatwootApiTokenEncrypted);

    const evolution = await this.testEvolution(
      row.evolutionApiUrl,
      evolutionApiKey,
      row.evolutionInstance,
      row.evolutionInstanceId,
      row.metadata,
    );
    const chatwoot = await this.testChatwoot(
      row.chatwootUrl,
      chatwootApiToken,
      row.chatwootAccountId,
      row.chatwootInboxId,
      row.chatwootInboxIdentifier,
    );

    return {
      connectionId: row.id,
      status: evolution.ok && chatwoot.ok ? 'ok' : 'error',
      checkedAt: new Date().toISOString(),
      evolution,
      chatwoot,
    };
  }

  private async testEvolution(
    apiUrl: string,
    apiKey: string,
    instance: string,
    instanceId?: string | null,
    metadata?: Record<string, unknown> | null,
  ) {
    const base = apiUrl.replace(/\/+$/, '');
    const statusEndpoint = '/instance/status';
    const statusHeaders: Record<string, string> = { apikey: apiKey };
    if (instanceId?.trim()) {
      statusHeaders.instanceId = instanceId.trim();
    }

    try {
      const statusRes = await fetch(`${base}${statusEndpoint}`, { method: 'GET', headers: statusHeaders });
      if (!statusRes.ok) {
        const body = await statusRes.text().catch(() => 'unknown_error');
        return { ok: false, endpoint: statusEndpoint, error: `${statusRes.status} - ${body}` };
      }

      const connectConfig = this.readEvolutionConnectConfig(metadata);
      if (instanceId && connectConfig) {
        const connectEndpoint = '/instance/connect';
        const connectRes = await fetch(`${base}${connectEndpoint}`, {
          method: 'POST',
          headers: {
            apikey: apiKey,
            instanceId: instanceId.toString(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(connectConfig),
        });

        if (!connectRes.ok) {
          const body = await connectRes.text().catch(() => 'unknown_error');
          return { ok: false, endpoint: connectEndpoint, error: `${connectRes.status} - ${body}` };
        }

        return {
          ok: true,
          endpoint: connectEndpoint,
          instance,
          instanceId,
          webhookUrl: connectConfig.webhookUrl ?? '',
        };
      }

      return {
        ok: true,
        endpoint: statusEndpoint,
        instance,
        instanceId: instanceId ?? null,
      };
    } catch (error: unknown) {
      return { ok: false, endpoint: statusEndpoint, error: this.readErrorMessage(error) };
    }
  }

  private readEvolutionConnectConfig(metadata?: Record<string, unknown> | null) {
    const source = metadata && typeof metadata === 'object' ? metadata : {};
    const evolution =
      source && typeof source.evolution === 'object' && source.evolution
        ? (source.evolution as Record<string, unknown>)
        : source;

    const webhookUrl = typeof evolution.webhookUrl === 'string' ? evolution.webhookUrl.trim() : '';
    const phone = typeof evolution.phone === 'string' ? evolution.phone.trim() : '';
    const immediate = typeof evolution.immediate === 'boolean' ? evolution.immediate : true;
    const subscribe = Array.isArray(evolution.subscribe)
      ? evolution.subscribe.map((item) => String(item ?? '').trim()).filter(Boolean)
      : [];
    const rabbitmqEnable = evolution.rabbitmqEnable === true || evolution.rabbitmqEnable === 'enabled' ? 'enabled' : undefined;
    const websocketEnable = evolution.websocketEnable === true || evolution.websocketEnable === 'enabled' ? 'enabled' : undefined;
    const natsEnable = evolution.natsEnable === true || evolution.natsEnable === 'enabled' ? 'enabled' : undefined;

    if (!webhookUrl) return null;

    return {
      webhookUrl,
      subscribe: ensureRequiredEvolutionSubscribe(subscribe),
      immediate,
      ...(phone ? { phone } : {}),
      ...(rabbitmqEnable ? { rabbitmqEnable } : {}),
      ...(websocketEnable ? { websocketEnable } : {}),
      ...(natsEnable ? { natsEnable } : {}),
    };
  }

  private async testChatwoot(
    url: string,
    apiToken: string,
    accountId: string,
    inboxId?: string | null,
    inboxIdentifier?: string | null,
  ) {
    const base = url.replace(/\/+$/, '');
    const endpoint = `/api/v1/accounts/${accountId}/inboxes`;
    try {
      const res = await fetch(`${base}${endpoint}`, {
        method: 'GET',
        headers: { api_access_token: apiToken },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => 'unknown_error');
        return { ok: false, endpoint, error: `${res.status} - ${body}` };
      }

      const payload = await res.json().catch(() => null);
      const list = this.readChatwootInboxList(payload);

      if (inboxId) {
        const hit = list.find((item) => item.id === inboxId);
        if (!hit) return { ok: false, endpoint, error: `Inbox id ${inboxId} nao encontrado na conta ${accountId}` };
      }

      if (inboxIdentifier) {
        const hit = list.find((item) => item.identifier === inboxIdentifier);
        if (!hit) return { ok: false, endpoint, error: `Inbox identifier ${inboxIdentifier} nao encontrado` };
      }

      return { ok: true, endpoint };
    } catch (error: unknown) {
      return { ok: false, endpoint, error: this.readErrorMessage(error) };
    }
  }

  private readChatwootInboxList(payload: unknown): Array<{ id: string; identifier: string }> {
    const candidateList =
      Array.isArray(payload) ? payload :
      payload && typeof payload === 'object' && Array.isArray((payload as { payload?: unknown }).payload)
        ? (payload as { payload: unknown[] }).payload
        : [];

    return candidateList
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as Record<string, unknown>;
        return {
          id: String(row.id ?? '').trim(),
          identifier: String(row.identifier ?? '').trim(),
        };
      })
      .filter((item): item is { id: string; identifier: string } => Boolean(item?.id || item?.identifier));
  }

  private readErrorMessage(error: unknown) {
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message?: unknown }).message ?? 'network_error');
    }
    return 'network_error';
  }
}
