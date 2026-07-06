import { Injectable } from '@nestjs/common';
import { SettingsIntegrationSecretsService } from './settings-integration-secrets.service';
import type { ResolvedIntegrationContext } from './integration-context.service';
import type { IntegrationConnectionRecord } from './integration-connections.types';
import type { StoredChatwootContextSettings } from './settings-chatwoot-config-store.service';

@Injectable()
export class IntegrationContextMapperService {
  constructor(
    private readonly settingsSecrets: SettingsIntegrationSecretsService,
  ) {}

  toResolvedContext(
    row: IntegrationConnectionRecord | null,
    storedChatwoot: StoredChatwootContextSettings,
  ): ResolvedIntegrationContext | null {
    if (!row) return null;

    const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const evolutionMetadata =
      metadata.evolution && typeof metadata.evolution === 'object'
        ? (metadata.evolution as Record<string, unknown>)
        : metadata;

    return {
      source: 'database',
      connectionId: row.id,
      connectionKey: row.id,
      companyId: row.companyId ?? null,
      name: row.name,
      evolution: {
        apiUrl: String(row.evolutionApiUrl ?? '').trim(),
        apiKey: this.settingsSecrets.decrypt(row.evolutionApiKeyEncrypted),
        instance: String(row.evolutionInstance ?? '').trim(),
        instanceId: String(row.evolutionInstanceId ?? '').trim(),
        instanceToken: this.readOptionalString(evolutionMetadata.instanceToken),
        webhookSecret: this.settingsSecrets.decryptOptional(row.evolutionWebhookSecretEncrypted) ?? undefined,
        allowedGroupJids: this.readStringList(evolutionMetadata.groupJids, evolutionMetadata.allowedGroupJids),
        allowedGroups: this.readGroupList(evolutionMetadata.groups, evolutionMetadata.allowedGroups),
      },
      chatwoot: {
        url: String(row.chatwootUrl ?? '').trim(),
        apiToken: this.settingsSecrets.decrypt(row.chatwootApiTokenEncrypted),
        platformApiToken: storedChatwoot.platformApiToken || undefined,
        systemBotApiToken: storedChatwoot.systemBotApiToken || undefined,
        accountId: String(row.chatwootAccountId ?? '').trim(),
        inboxId: String(row.chatwootInboxId ?? '').trim(),
        inboxIdentifier: String(row.chatwootInboxIdentifier ?? '').trim(),
        webhookSecret: this.settingsSecrets.decryptOptional(row.chatwootWebhookSecretEncrypted) ?? undefined,
        webhookMaxSkewSeconds: this.readWebhookSkew(metadata),
        incomingMediaMode: storedChatwoot.incomingMediaMode,
      },
    };
  }

  contextAllowsGroup(context: ResolvedIntegrationContext, groupJid: string): boolean {
    const allowed = [
      ...(context.evolution.allowedGroupJids ?? []),
      ...(context.evolution.allowedGroups ?? []).map((item) => item.jid),
    ];
    return allowed.map((item) => item.toLowerCase()).includes(groupJid.trim().toLowerCase());
  }

  private readWebhookSkew(metadata: Record<string, unknown>): number {
    const chatwoot =
      metadata.chatwoot && typeof metadata.chatwoot === 'object'
        ? (metadata.chatwoot as Record<string, unknown>)
        : metadata;
    const raw = chatwoot.webhookMaxSkewSeconds;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 300;
  }

  private readOptionalString(value: unknown): string | undefined {
    const normalized = String(value ?? '').trim();
    return normalized || undefined;
  }

  private readStringList(...values: unknown[]): string[] {
    for (const value of values) {
      if (Array.isArray(value)) {
        return Array.from(new Set(value.map((item) => String(item ?? '').trim()).filter(Boolean)));
      }

      if (typeof value === 'string' && value.trim()) {
        return Array.from(new Set(value.split(',').map((item) => item.trim()).filter(Boolean)));
      }
    }

    return [];
  }

  private readGroupList(...values: unknown[]): Array<{ jid: string; name?: string }> {
    for (const value of values) {
      if (!Array.isArray(value)) continue;
      return value
        .map((item) => {
          if (typeof item === 'string') {
            const jid = item.trim();
            return jid ? { jid } : null;
          }

          if (item && typeof item === 'object') {
            const source = item as Record<string, unknown>;
            const jid = String(source.jid ?? source.groupJid ?? '').trim();
            const name = String(source.name ?? source.label ?? '').trim();
            return jid ? { jid, ...(name ? { name } : {}) } : null;
          }

          return null;
        })
        .filter((item): item is { jid: string; name?: string } => item !== null);
    }

    return [];
  }
}
