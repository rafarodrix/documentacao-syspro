import { Injectable, Logger } from '@nestjs/common';
import { readChatwootRuntimeConfig, readEvolutionRuntimeConfig } from '@dosc-syspro/config';
import { DEFAULT_CHATWOOT_INTEGRATION_SETTINGS } from '@dosc-syspro/contracts/chatwoot';
import { IntegrationConnectionsRepository } from './integration-connections.repository';
import { IntegrationContextMapperService } from './integration-context-mapper.service';
import { SettingsChatwootConfigStoreService, type StoredChatwootContextSettings } from './settings-chatwoot-config-store.service';
import { SettingsEvolutionConfigService } from './settings-evolution-config.service';
import type { IntegrationConnectionRecord } from './integration-connections.types';

const ENV_DEFAULT_CONNECTION_KEY = 'env:default';
type UnknownRecord = Record<string, unknown>;

function readTrimmedString(...values: unknown[]): string {
  for (const value of values) {
    const normalized = String(value ?? '').trim();
    if (normalized) return normalized;
  }
  return '';
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' ? (value as UnknownRecord) : null;
}

function readPath(source: unknown, path: readonly string[]): unknown {
  let current: unknown = source;
  for (const segment of path) {
    const record = asRecord(current);
    if (!record) return undefined;
    current = record[segment];
  }
  return current;
}

function readTrimmedAtPaths(source: unknown, paths: ReadonlyArray<readonly string[]>): string {
  return readTrimmedString(...paths.map((path) => readPath(source, path)));
}

export type ResolvedIntegrationContext = {
  source: 'database' | 'settings' | 'env';
  connectionId: string | null;
  connectionKey: string;
  companyId: string | null;
  name: string;
  evolution: {
    apiUrl: string;
    apiKey: string;
    instance: string;
    instanceId: string;
    instanceToken?: string;
    webhookSecret?: string;
    allowedGroupJids?: string[];
    allowedGroups?: Array<{ jid: string; name?: string }>;
  };
  chatwoot: {
    url: string;
    apiToken: string;
    platformApiToken?: string;
    systemBotApiToken?: string;
    accountId: string;
    inboxId: string;
    inboxIdentifier: string;
    webhookSecret?: string;
    webhookMaxSkewSeconds: number;
    incomingMediaMode?: 'link' | 'attachment';
  };
};

@Injectable()
export class IntegrationContextService {
  private readonly logger = new Logger(IntegrationContextService.name);

  constructor(
    private readonly integrationConnectionsRepository: IntegrationConnectionsRepository,
    private readonly integrationContextMapper: IntegrationContextMapperService,
    private readonly chatwootConfigStore: SettingsChatwootConfigStoreService,
    private readonly evolutionConfig: SettingsEvolutionConfigService,
  ) {}

  async getDefaultContext(): Promise<ResolvedIntegrationContext | null> {
    const storedChatwoot = await this.chatwootConfigStore.readStoredIntegrationSettings();
    const connection = await this.tryReadConnection(
      'getDefaultContext',
      () => this.integrationConnectionsRepository.findFirstActive(),
      null,
    );

    return this.integrationContextMapper.toResolvedContext(connection, storedChatwoot) ?? await this.readEnvFallback(storedChatwoot);
  }

  async listActiveContexts(filters?: { companyIds?: string[] | null }): Promise<ResolvedIntegrationContext[]> {
    const storedChatwoot = await this.chatwootConfigStore.readStoredIntegrationSettings();
    const companyIds = Array.isArray(filters?.companyIds)
      ? Array.from(new Set(filters.companyIds.map((item) => String(item ?? '').trim()).filter(Boolean)))
      : [];

    const rows = await this.tryReadConnections(
      'listActiveContexts',
      () => this.integrationConnectionsRepository.listActive({ companyIds }),
    );

    const contexts = rows
      .map((row) => this.integrationContextMapper.toResolvedContext(row, storedChatwoot))
      .filter((item): item is ResolvedIntegrationContext => item !== null);

    if (contexts.length > 0) {
      return contexts;
    }

    const fallback = await this.readEnvFallback(storedChatwoot);
    return fallback ? [fallback] : [];
  }

  async resolveByConnectionKey(connectionKey?: string | null): Promise<ResolvedIntegrationContext | null> {
    const storedChatwoot = await this.chatwootConfigStore.readStoredIntegrationSettings();
    const normalized = String(connectionKey ?? '').trim();
    if (!normalized || normalized === ENV_DEFAULT_CONNECTION_KEY) {
      return this.readEnvFallback(storedChatwoot);
    }

    const connection = await this.tryReadConnection(
      'resolveByConnectionKey',
      () => this.integrationConnectionsRepository.findById(normalized),
      null,
    );

    return this.integrationContextMapper.toResolvedContext(connection, storedChatwoot) ?? await this.readEnvFallback(storedChatwoot);
  }

  async resolveForEvolutionWebhook(payload: unknown): Promise<ResolvedIntegrationContext | null> {
    const storedChatwoot = await this.chatwootConfigStore.readStoredIntegrationSettings();
    const instanceId = readTrimmedAtPaths(payload, [
      ['instanceId'],
      ['data', 'instanceId'],
      ['data', 'instance', 'instanceId'],
      ['data', 'instance', 'id'],
      ['instance', 'instanceId'],
      ['instance', 'id'],
      ['sender'],
    ]);
    const instance = readTrimmedAtPaths(payload, [
      ['instance'],
      ['instanceName'],
      ['data', 'instance'],
      ['data', 'instanceName'],
      ['data', 'instance', 'instanceName'],
      ['data', 'instance', 'name'],
      ['instance', 'instanceName'],
      ['instance', 'name'],
    ]);
    const groupJid = readTrimmedAtPaths(payload, [
      ['data', 'key', 'remoteJid'],
      ['data', 'Info', 'Chat'],
      ['data', 'info', 'Chat'],
      ['key', 'remoteJid'],
      ['Info', 'Chat'],
      ['info', 'Chat'],
    ]);
    const hasExplicitMatchInput = Boolean(instanceId || instance);
    const orFilters: Record<string, string>[] = [];
    if (instanceId) {
      orFilters.push({ evolutionInstanceId: instanceId });
    }
    if (instance) {
      orFilters.push({ evolutionInstance: instance });
    }

    const candidates = await this.tryReadConnections(
      'resolveForEvolutionWebhook',
      () => this.integrationConnectionsRepository.listActive({ orFilters, orderBy: 'createdAtAsc' }),
    );

    const groupMatched = groupJid.endsWith('@g.us')
      ? candidates
          .map((row) => this.integrationContextMapper.toResolvedContext(row, storedChatwoot))
          .find((context): context is ResolvedIntegrationContext =>
            Boolean(context && this.integrationContextMapper.contextAllowsGroup(context, groupJid))
          )
      : null;
    if (groupMatched) return groupMatched;

    const matched = this.integrationContextMapper.toResolvedContext(candidates[0] ?? null, storedChatwoot);
    if (matched) return matched;

    const allActiveContexts = await this.listActiveContexts();
    if (allActiveContexts.length === 1) {
      const [singleContext] = allActiveContexts;
      return singleContext;
    }

    if (hasExplicitMatchInput) return null;
    return await this.readEnvFallback(storedChatwoot);
  }

  async resolveForChatwootWebhook(payload: unknown): Promise<ResolvedIntegrationContext | null> {
    const storedChatwoot = await this.chatwootConfigStore.readStoredIntegrationSettings();
    const accountId = readTrimmedAtPaths(payload, [
      ['account', 'id'],
      ['account_id'],
      ['conversation', 'account_id'],
      ['message', 'account_id'],
    ]);
    const inboxId = readTrimmedAtPaths(payload, [
      ['inbox', 'id'],
      ['inbox_id'],
      ['conversation', 'inbox_id'],
      ['message', 'inbox_id'],
    ]);
    const inboxIdentifier = readTrimmedAtPaths(payload, [
      ['inbox', 'identifier'],
      ['conversation', 'inbox_identifier'],
      ['conversation', 'meta', 'inbox', 'identifier'],
      ['message', 'inbox_identifier'],
    ]);

    const candidates = await this.tryReadConnections(
      'resolveForChatwootWebhook',
      () => this.integrationConnectionsRepository.listActive({ accountId, orderBy: 'createdAtAsc' }),
    );

    const matched = candidates.find((row) => {
      if (inboxId && String(row.chatwootInboxId ?? '').trim() === inboxId) return true;
      if (inboxIdentifier && String(row.chatwootInboxIdentifier ?? '').trim() === inboxIdentifier) return true;
      return !inboxId && !inboxIdentifier;
    });

    return this.integrationContextMapper.toResolvedContext(matched ?? candidates[0] ?? null, storedChatwoot) ?? await this.readEnvFallback(storedChatwoot);
  }

  async getChatwootSystemBotApiToken(): Promise<string | undefined> {
    const stored = await this.chatwootConfigStore.readStoredIntegrationSettings();
    return stored.systemBotApiToken || undefined;
  }

  private async readEnvFallback(
    storedChatwoot: StoredChatwootContextSettings,
  ): Promise<ResolvedIntegrationContext | null> {
    const evolution = readEvolutionRuntimeConfig();
    const chatwoot = readChatwootRuntimeConfig();
    const resolvedChatwoot = {
      ...DEFAULT_CHATWOOT_INTEGRATION_SETTINGS,
      ...chatwoot,
      ...storedChatwoot,
      webhookMaxSkewSeconds: storedChatwoot.webhookMaxSkewSeconds || chatwoot.webhookMaxSkewSeconds || 300,
      incomingMediaMode: storedChatwoot.incomingMediaMode || chatwoot.incomingMediaMode,
    };
    const storedEvolution = await this.evolutionConfig.readStoredSettings();
    const resolvedEvolutionInstance = readTrimmedString(
      evolution.instance,
      storedEvolution.instance,
    );
    const resolvedEvolutionInstanceId = readTrimmedString(
      storedEvolution.instanceId,
    );
    const resolvedEvolutionInstanceToken = readTrimmedString(
      evolution.instanceToken,
      storedEvolution.instanceToken,
    );
    const hasAnyValue = Boolean(
      evolution.apiUrl ||
      evolution.apiKey ||
      resolvedEvolutionInstance ||
      resolvedEvolutionInstanceId ||
      resolvedEvolutionInstanceToken ||
      resolvedChatwoot.url ||
      resolvedChatwoot.apiToken ||
      resolvedChatwoot.accountId ||
      resolvedChatwoot.inboxId ||
      resolvedChatwoot.inboxIdentifier
    );

    if (!hasAnyValue) return null;

    return {
      source: storedChatwoot.isStored ? 'settings' : 'env',
      connectionId: null,
      connectionKey: ENV_DEFAULT_CONNECTION_KEY,
      companyId: null,
      name: 'Runtime Environment',
      evolution: {
        apiUrl: evolution.apiUrl,
        apiKey: evolution.apiKey,
        instance: resolvedEvolutionInstance,
        instanceId: resolvedEvolutionInstanceId,
        instanceToken: resolvedEvolutionInstanceToken || undefined,
        webhookSecret: undefined,
        allowedGroupJids: [],
        allowedGroups: [],
      },
      chatwoot: {
        url: resolvedChatwoot.url,
        apiToken: resolvedChatwoot.apiToken,
        platformApiToken: resolvedChatwoot.platformApiToken || undefined,
        systemBotApiToken: resolvedChatwoot.systemBotApiToken || undefined,
        accountId: resolvedChatwoot.accountId,
        inboxId: resolvedChatwoot.inboxId,
        inboxIdentifier: resolvedChatwoot.inboxIdentifier,
        webhookSecret: resolvedChatwoot.webhookSecret || undefined,
        webhookMaxSkewSeconds: resolvedChatwoot.webhookMaxSkewSeconds ?? 300,
        incomingMediaMode: resolvedChatwoot.incomingMediaMode,
      },
    };
  }

  private async tryReadConnection<T>(
    scope: string,
    reader: () => Promise<T>,
    fallback: T,
  ): Promise<T> {
    try {
      return await reader();
    } catch (error: unknown) {
      this.logger.warn(
        `[integration_context] ${scope} database lookup failed; falling back to env runtime: ${this.readErrorLabel(error)}`,
      );
      return fallback;
    }
  }

  private async tryReadConnections(
    scope: string,
    reader: () => Promise<IntegrationConnectionRecord[]>,
  ): Promise<IntegrationConnectionRecord[]> {
    try {
      return await reader();
    } catch (error: unknown) {
      this.logger.warn(
        `[integration_context] ${scope} database lookup failed; falling back to env runtime: ${this.readErrorLabel(error)}`,
      );
      return [];
    }
  }

  private readErrorLabel(error: unknown) {
    if (!error || typeof error !== 'object') {
      return 'unknown unknown_error';
    }

    const errorRecord = error as { code?: unknown; message?: unknown };
    return `${String(errorRecord.code ?? 'unknown')} ${String(errorRecord.message ?? 'unknown_error')}`;
  }
}
