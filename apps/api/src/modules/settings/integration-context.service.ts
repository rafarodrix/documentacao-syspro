import { Injectable, Logger } from '@nestjs/common';
import { createDecipheriv, createHash } from 'crypto';
import { readChatwootRuntimeConfig, readEvolutionRuntimeConfig } from '@dosc-syspro/config';
import { DEFAULT_EVOLUTION_SETTINGS, evolutionSettingsSchema } from '@dosc-syspro/contracts/evolution';
import { PrismaService } from '../../prisma/prisma.service';

const ENV_DEFAULT_CONNECTION_KEY = 'env:default';

function readTrimmedString(...values: unknown[]): string {
  for (const value of values) {
    const normalized = String(value ?? '').trim();
    if (normalized) return normalized;
  }
  return '';
}

export type ResolvedIntegrationContext = {
  source: 'database' | 'env';
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

  constructor(private readonly prisma: PrismaService) {}

  async getDefaultContext(): Promise<ResolvedIntegrationContext | null> {
    let connection: any = null;
    try {
      connection = await (this.prisma as any).integrationConnection.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: [{ companyId: 'asc' }, { createdAt: 'asc' }],
      });
    } catch (error: any) {
      this.logger.warn(
        `[integration_context] getDefaultContext database lookup failed; falling back to env runtime: ${error?.code ?? 'unknown'} ${error?.message ?? 'unknown_error'}`
      );
    }

    return this.toResolvedContext(connection) ?? await this.readEnvFallback();
  }

  async listActiveContexts(filters?: { companyIds?: string[] | null }): Promise<ResolvedIntegrationContext[]> {
    const companyIds = Array.isArray(filters?.companyIds)
      ? Array.from(new Set(filters!.companyIds.map((item) => String(item ?? '').trim()).filter(Boolean)))
      : [];

    let rows: any[] = [];
    try {
      rows = await (this.prisma as any).integrationConnection.findMany({
        where: {
          status: 'ACTIVE',
          ...(companyIds.length ? { companyId: { in: companyIds } } : {}),
        },
        orderBy: [{ companyId: 'asc' }, { createdAt: 'asc' }],
      });
    } catch (error: any) {
      this.logger.warn(
        `[integration_context] listActiveContexts database lookup failed; falling back to env runtime: ${error?.code ?? 'unknown'} ${error?.message ?? 'unknown_error'}`,
      );
    }

    const contexts = rows
      .map((row) => this.toResolvedContext(row))
      .filter((item): item is ResolvedIntegrationContext => item !== null);

    if (contexts.length > 0) {
      return contexts;
    }

    const fallback = await this.readEnvFallback();
    return fallback ? [fallback] : [];
  }

  async resolveByConnectionKey(connectionKey?: string | null): Promise<ResolvedIntegrationContext | null> {
    const normalized = String(connectionKey ?? '').trim();
    if (!normalized || normalized === ENV_DEFAULT_CONNECTION_KEY) {
      return this.readEnvFallback();
    }

    let connection: any = null;
    try {
      connection = await (this.prisma as any).integrationConnection.findUnique({
        where: { id: normalized },
      });
    } catch (error: any) {
      this.logger.warn(
        `[integration_context] resolveByConnectionKey database lookup failed; falling back to env runtime: ${error?.code ?? 'unknown'} ${error?.message ?? 'unknown_error'}`
      );
    }

    return this.toResolvedContext(connection) ?? await this.readEnvFallback();
  }

  async resolveForEvolutionWebhook(payload: any): Promise<ResolvedIntegrationContext | null> {
    const instanceId = readTrimmedString(
      payload?.instanceId,
      payload?.data?.instanceId,
      payload?.data?.instance?.instanceId,
      payload?.data?.instance?.id,
      payload?.instance?.instanceId,
      payload?.instance?.id,
      payload?.sender,
    );
    const instance = readTrimmedString(
      payload?.instance,
      payload?.instanceName,
      payload?.data?.instance,
      payload?.data?.instanceName,
      payload?.data?.instance?.instanceName,
      payload?.data?.instance?.name,
      payload?.instance?.instanceName,
      payload?.instance?.name,
    );
    const groupJid = readTrimmedString(
      payload?.data?.key?.remoteJid,
      payload?.data?.Info?.Chat,
      payload?.data?.info?.Chat,
      payload?.key?.remoteJid,
      payload?.Info?.Chat,
      payload?.info?.Chat,
    );
    const hasExplicitMatchInput = Boolean(instanceId || instance);
    const orFilters = [
      ...(instanceId ? [{ evolutionInstanceId: instanceId }] : []),
      ...(instance ? [{ evolutionInstance: instance }] : []),
    ];

    let candidates: any[] = [];
    try {
      candidates = await (this.prisma as any).integrationConnection.findMany({
        where: {
          status: 'ACTIVE',
          ...(orFilters.length ? { OR: orFilters } : {}),
        },
        orderBy: [{ createdAt: 'asc' }],
      });
    } catch (error: any) {
      this.logger.warn(
        `[integration_context] resolveForEvolutionWebhook database lookup failed; falling back to env runtime: ${error?.code ?? 'unknown'} ${error?.message ?? 'unknown_error'}`
      );
    }

    const groupMatched = groupJid.endsWith('@g.us')
      ? candidates
          .map((row) => this.toResolvedContext(row))
          .find((context): context is ResolvedIntegrationContext =>
            Boolean(context && this.contextAllowsGroup(context, groupJid))
          )
      : null;
    if (groupMatched) return groupMatched;

    const matched = this.toResolvedContext(candidates?.[0]);
    if (matched) return matched;

    const allActiveContexts = await this.listActiveContexts();
    if (allActiveContexts.length === 1) {
      const [singleContext] = allActiveContexts;
      return singleContext;
    }

    if (hasExplicitMatchInput) return null;
    return await this.readEnvFallback();
  }

  async resolveForChatwootWebhook(payload: any): Promise<ResolvedIntegrationContext | null> {
    const message = payload?.message && typeof payload.message === 'object' ? payload.message : null;
    const accountId = String(
      payload?.account?.id ??
      payload?.account_id ??
      payload?.conversation?.account_id ??
      message?.account_id ??
      ''
    ).trim();
    const inboxId = String(
      payload?.inbox?.id ??
      payload?.inbox_id ??
      payload?.conversation?.inbox_id ??
      message?.inbox_id ??
      ''
    ).trim();
    const inboxIdentifier = String(
      payload?.inbox?.identifier ??
      payload?.conversation?.inbox_identifier ??
      payload?.conversation?.meta?.inbox?.identifier ??
      message?.inbox_identifier ??
      ''
    ).trim();

    let candidates: any[] = [];
    try {
      candidates = await (this.prisma as any).integrationConnection.findMany({
        where: {
          status: 'ACTIVE',
          ...(accountId ? { chatwootAccountId: accountId } : {}),
        },
        orderBy: [{ createdAt: 'asc' }],
      });
    } catch (error: any) {
      this.logger.warn(
        `[integration_context] resolveForChatwootWebhook database lookup failed; falling back to env runtime: ${error?.code ?? 'unknown'} ${error?.message ?? 'unknown_error'}`
      );
    }

    const matched = (candidates as any[]).find((row) => {
      if (inboxId && String(row?.chatwootInboxId ?? '').trim() === inboxId) return true;
      if (inboxIdentifier && String(row?.chatwootInboxIdentifier ?? '').trim() === inboxIdentifier) return true;
      return !inboxId && !inboxIdentifier;
    });

    return this.toResolvedContext(matched ?? candidates?.[0]) ?? await this.readEnvFallback();
  }

  private toResolvedContext(row: any): ResolvedIntegrationContext | null {
    if (!row) return null;
    const runtimeChatwoot = readChatwootRuntimeConfig();

    const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata as Record<string, unknown> : {};
    const evolutionMetadata =
      metadata.evolution && typeof metadata.evolution === 'object'
        ? metadata.evolution as Record<string, unknown>
        : metadata;

    return {
      source: 'database',
      connectionId: row.id,
      connectionKey: row.id,
      companyId: row.companyId ?? null,
      name: row.name,
      evolution: {
        apiUrl: String(row.evolutionApiUrl ?? '').trim(),
        apiKey: this.decrypt(row.evolutionApiKeyEncrypted),
        instance: String(row.evolutionInstance ?? '').trim(),
        instanceId: String(row.evolutionInstanceId ?? '').trim(),
        instanceToken: this.readOptionalString(evolutionMetadata.instanceToken),
        webhookSecret: this.decryptOptional(row.evolutionWebhookSecretEncrypted) ?? undefined,
        allowedGroupJids: this.readStringList(evolutionMetadata.groupJids, evolutionMetadata.allowedGroupJids),
        allowedGroups: this.readGroupList(evolutionMetadata.groups, evolutionMetadata.allowedGroups),
      },
      chatwoot: {
        url: String(row.chatwootUrl ?? '').trim(),
        apiToken: this.decrypt(row.chatwootApiTokenEncrypted),
        platformApiToken: runtimeChatwoot.platformApiToken || undefined,
        accountId: String(row.chatwootAccountId ?? '').trim(),
        inboxId: String(row.chatwootInboxId ?? '').trim(),
        inboxIdentifier: String(row.chatwootInboxIdentifier ?? '').trim(),
        webhookSecret: this.decryptOptional(row.chatwootWebhookSecretEncrypted) ?? undefined,
        webhookMaxSkewSeconds: this.readWebhookSkew(metadata),
        incomingMediaMode: runtimeChatwoot.incomingMediaMode,
      },
    };
  }

  private contextAllowsGroup(context: ResolvedIntegrationContext, groupJid: string): boolean {
    const allowed = [
      ...(context.evolution.allowedGroupJids ?? []),
      ...(context.evolution.allowedGroups ?? []).map((item) => item.jid),
    ];
    return allowed.map((item) => item.toLowerCase()).includes(groupJid.trim().toLowerCase());
  }

  private async readEnvFallback(): Promise<ResolvedIntegrationContext | null> {
    const evolution = readEvolutionRuntimeConfig();
    const chatwoot = readChatwootRuntimeConfig();
    const storedEvolution = await this.readStoredEvolutionSettings();
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
      chatwoot.url ||
      chatwoot.apiToken ||
      chatwoot.accountId ||
      chatwoot.inboxId ||
      chatwoot.inboxIdentifier
    );

    if (!hasAnyValue) return null;

    return {
      source: 'env',
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
        url: chatwoot.url,
        apiToken: chatwoot.apiToken,
        platformApiToken: chatwoot.platformApiToken || undefined,
        accountId: chatwoot.accountId,
        inboxId: chatwoot.inboxId,
        inboxIdentifier: chatwoot.inboxIdentifier,
        webhookSecret: chatwoot.webhookSecret || undefined,
        webhookMaxSkewSeconds: chatwoot.webhookMaxSkewSeconds ?? 300,
        incomingMediaMode: chatwoot.incomingMediaMode,
      },
    };
  }

  private async readStoredEvolutionSettings() {
    try {
      const row = await this.prisma.systemSetting.findUnique({
        where: { key: 'evolution_config' },
        select: { value: true },
      });

      if (!row?.value) {
        return DEFAULT_EVOLUTION_SETTINGS;
      }

      const parsed = JSON.parse(row.value);
      const validation = evolutionSettingsSchema.safeParse(parsed);
      return validation.success ? validation.data : DEFAULT_EVOLUTION_SETTINGS;
    } catch {
      return DEFAULT_EVOLUTION_SETTINGS;
    }
  }

  private readWebhookSkew(metadata: Record<string, unknown>): number {
    const chatwoot =
      metadata.chatwoot && typeof metadata.chatwoot === 'object'
        ? metadata.chatwoot as Record<string, unknown>
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
        return Array.from(new Set(
          value.map((item) => String(item ?? '').trim()).filter(Boolean),
        ));
      }

      if (typeof value === 'string' && value.trim()) {
        return Array.from(new Set(
          value.split(',').map((item) => item.trim()).filter(Boolean),
        ));
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

  private resolveEncryptionKey(): Buffer {
    const raw = process.env.INTEGRATION_CONFIG_ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET;
    if (!raw || !raw.trim()) {
      throw new Error('INTEGRATION_CONFIG_ENCRYPTION_KEY (ou BETTER_AUTH_SECRET) obrigatoria para criptografia');
    }
    return createHash('sha256').update(raw).digest();
  }

  private decrypt(payload: string): string {
    const [ivB64, tagB64, dataB64] = String(payload || '').split(':');
    if (!ivB64 || !tagB64 || !dataB64) throw new Error('Payload criptografado invalido');
    const key = this.resolveEncryptionKey();
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(dataB64, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return plain.toString('utf8');
  }

  private decryptOptional(payload?: string | null): string | null {
    if (!payload) return null;
    return this.decrypt(payload);
  }
}
