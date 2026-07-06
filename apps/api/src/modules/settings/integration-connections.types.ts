export type IntegrationConnectionUpsertInput = {
  companyId?: string | null;
  name: string;
  status?: 'ACTIVE' | 'INACTIVE';
  evolutionApiUrl: string;
  evolutionApiKey: string;
  evolutionInstance: string;
  evolutionInstanceId?: string | null;
  evolutionWebhookSecret?: string | null;
  chatwootUrl: string;
  chatwootApiToken: string;
  chatwootAccountId: string;
  chatwootInboxId?: string | null;
  chatwootInboxIdentifier?: string | null;
  chatwootWebhookSecret?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type IntegrationConnectionRecord = {
  id: string;
  companyId: string | null;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  evolutionApiUrl: string;
  evolutionApiKeyEncrypted: string;
  evolutionInstance: string;
  evolutionInstanceId: string | null;
  evolutionWebhookSecretEncrypted: string | null;
  chatwootUrl: string;
  chatwootApiTokenEncrypted: string;
  chatwootAccountId: string;
  chatwootInboxId: string | null;
  chatwootInboxIdentifier: string | null;
  chatwootWebhookSecretEncrypted: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type IntegrationConnectionDatabaseInput = {
  companyId: string | null;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  evolutionApiUrl: string;
  evolutionApiKeyEncrypted: string;
  evolutionInstance: string;
  evolutionInstanceId: string | null;
  evolutionWebhookSecretEncrypted: string | null;
  chatwootUrl: string;
  chatwootApiTokenEncrypted: string;
  chatwootAccountId: string;
  chatwootInboxId: string | null;
  chatwootInboxIdentifier: string | null;
  chatwootWebhookSecretEncrypted: string | null;
  metadata: Record<string, unknown> | null;
};

export type IntegrationConnectionOutput = {
  id: string;
  companyId: string | null;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  evolutionApiUrl: string;
  evolutionInstance: string;
  evolutionInstanceId: string | null;
  chatwootUrl: string;
  chatwootAccountId: string;
  chatwootInboxId: string | null;
  chatwootInboxIdentifier: string | null;
  hasEvolutionApiKey: boolean;
  hasEvolutionWebhookSecret: boolean;
  hasChatwootApiToken: boolean;
  hasChatwootWebhookSecret: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};
