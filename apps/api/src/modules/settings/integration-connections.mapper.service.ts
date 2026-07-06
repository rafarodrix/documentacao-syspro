import { Injectable } from '@nestjs/common';
import { SettingsIntegrationSecretsService } from './settings-integration-secrets.service';
import type {
  IntegrationConnectionDatabaseInput,
  IntegrationConnectionOutput,
  IntegrationConnectionRecord,
  IntegrationConnectionUpsertInput,
} from './integration-connections.types';

@Injectable()
export class IntegrationConnectionsMapperService {
  constructor(
    private readonly settingsSecrets: SettingsIntegrationSecretsService,
  ) {}

  mergeForUpdate(
    current: IntegrationConnectionRecord,
    input: Partial<IntegrationConnectionUpsertInput>,
  ): IntegrationConnectionUpsertInput {
    return {
      companyId: input.companyId ?? current.companyId,
      name: input.name ?? current.name,
      status: input.status ?? current.status,
      evolutionApiUrl: input.evolutionApiUrl ?? current.evolutionApiUrl,
      evolutionApiKey: input.evolutionApiKey ?? this.settingsSecrets.decrypt(current.evolutionApiKeyEncrypted),
      evolutionInstance: input.evolutionInstance ?? current.evolutionInstance,
      evolutionInstanceId: input.evolutionInstanceId ?? current.evolutionInstanceId,
      evolutionWebhookSecret:
        input.evolutionWebhookSecret ?? this.settingsSecrets.decryptOptional(current.evolutionWebhookSecretEncrypted),
      chatwootUrl: input.chatwootUrl ?? current.chatwootUrl,
      chatwootApiToken: input.chatwootApiToken ?? this.settingsSecrets.decrypt(current.chatwootApiTokenEncrypted),
      chatwootAccountId: input.chatwootAccountId ?? current.chatwootAccountId,
      chatwootInboxId: input.chatwootInboxId ?? current.chatwootInboxId,
      chatwootInboxIdentifier: input.chatwootInboxIdentifier ?? current.chatwootInboxIdentifier,
      chatwootWebhookSecret:
        input.chatwootWebhookSecret ?? this.settingsSecrets.decryptOptional(current.chatwootWebhookSecretEncrypted),
      metadata: (input.metadata ?? current.metadata) as Record<string, unknown> | null,
    };
  }

  toDatabaseInput(input: IntegrationConnectionUpsertInput): IntegrationConnectionDatabaseInput {
    return {
      companyId: input.companyId ?? null,
      name: input.name.trim(),
      status: input.status ?? 'ACTIVE',
      evolutionApiUrl: input.evolutionApiUrl.trim(),
      evolutionApiKeyEncrypted: this.settingsSecrets.encrypt(input.evolutionApiKey.trim()),
      evolutionInstance: input.evolutionInstance.trim(),
      evolutionInstanceId: input.evolutionInstanceId?.trim() || null,
      evolutionWebhookSecretEncrypted: input.evolutionWebhookSecret?.trim()
        ? this.settingsSecrets.encrypt(input.evolutionWebhookSecret.trim())
        : null,
      chatwootUrl: input.chatwootUrl.trim(),
      chatwootApiTokenEncrypted: this.settingsSecrets.encrypt(input.chatwootApiToken.trim()),
      chatwootAccountId: input.chatwootAccountId.toString().trim(),
      chatwootInboxId: input.chatwootInboxId?.toString().trim() || null,
      chatwootInboxIdentifier: input.chatwootInboxIdentifier?.trim() || null,
      chatwootWebhookSecretEncrypted: input.chatwootWebhookSecret?.trim()
        ? this.settingsSecrets.encrypt(input.chatwootWebhookSecret.trim())
        : null,
      metadata: input.metadata ?? null,
    };
  }

  toOutput(row: IntegrationConnectionRecord): IntegrationConnectionOutput {
    return {
      id: row.id,
      companyId: row.companyId,
      name: row.name,
      status: row.status,
      evolutionApiUrl: row.evolutionApiUrl,
      evolutionInstance: row.evolutionInstance,
      evolutionInstanceId: row.evolutionInstanceId,
      chatwootUrl: row.chatwootUrl,
      chatwootAccountId: row.chatwootAccountId,
      chatwootInboxId: row.chatwootInboxId,
      chatwootInboxIdentifier: row.chatwootInboxIdentifier,
      hasEvolutionApiKey: Boolean(row.evolutionApiKeyEncrypted),
      hasEvolutionWebhookSecret: Boolean(row.evolutionWebhookSecretEncrypted),
      hasChatwootApiToken: Boolean(row.chatwootApiTokenEncrypted),
      hasChatwootWebhookSecret: Boolean(row.chatwootWebhookSecretEncrypted),
      metadata: row.metadata,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
