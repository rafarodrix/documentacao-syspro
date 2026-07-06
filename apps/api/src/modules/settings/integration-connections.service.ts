import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ensureRequiredEvolutionSubscribe } from './evolution-webhook-subscribe';

type UpsertConnectionInput = {
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

@Injectable()
export class IntegrationConnectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId?: string) {
    const rows = await (this.prisma as any).integrationConnection.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });

    return (rows as any[]).map((row: any) => this.toOutput(row));
  }

  async getById(id: string) {
    const row = await (this.prisma as any).integrationConnection.findUnique({ where: { id } });
    if (!row) return null;
    return this.toOutput(row);
  }

  async create(input: UpsertConnectionInput) {
    await this.validateInput(input);
    const created = await (this.prisma as any).integrationConnection.create({
      data: this.toDatabaseInput(input),
    });
    return this.toOutput(created);
  }

  async update(id: string, input: Partial<UpsertConnectionInput>) {
    const current = await (this.prisma as any).integrationConnection.findUnique({ where: { id } });
    if (!current) return null;

    const merged: UpsertConnectionInput = {
      companyId: input.companyId ?? current.companyId,
      name: input.name ?? current.name,
      status: input.status ?? current.status,
      evolutionApiUrl: input.evolutionApiUrl ?? current.evolutionApiUrl,
      evolutionApiKey: input.evolutionApiKey ?? this.decrypt(current.evolutionApiKeyEncrypted),
      evolutionInstance: input.evolutionInstance ?? current.evolutionInstance,
      evolutionInstanceId: input.evolutionInstanceId ?? current.evolutionInstanceId,
      evolutionWebhookSecret: input.evolutionWebhookSecret ?? this.decryptOptional(current.evolutionWebhookSecretEncrypted),
      chatwootUrl: input.chatwootUrl ?? current.chatwootUrl,
      chatwootApiToken: input.chatwootApiToken ?? this.decrypt(current.chatwootApiTokenEncrypted),
      chatwootAccountId: input.chatwootAccountId ?? current.chatwootAccountId,
      chatwootInboxId: input.chatwootInboxId ?? current.chatwootInboxId,
      chatwootInboxIdentifier: input.chatwootInboxIdentifier ?? current.chatwootInboxIdentifier,
      chatwootWebhookSecret: input.chatwootWebhookSecret ?? this.decryptOptional(current.chatwootWebhookSecretEncrypted),
      metadata: (input.metadata ?? current.metadata) as Record<string, unknown> | null,
    };

    await this.validateInput(merged, id);
    const updated = await (this.prisma as any).integrationConnection.update({
      where: { id },
      data: this.toDatabaseInput(merged),
    });
    return this.toOutput(updated);
  }

  async remove(id: string) {
    await (this.prisma as any).integrationConnection.delete({ where: { id } });
    return { success: true };
  }

  async test(id: string) {
    const row = await (this.prisma as any).integrationConnection.findUnique({ where: { id } });
    if (!row) return null;

    const evolutionApiKey = this.decrypt(row.evolutionApiKeyEncrypted);
    const chatwootApiToken = this.decrypt(row.chatwootApiTokenEncrypted);

    const evolution = await this.testEvolution(
      row.evolutionApiUrl,
      evolutionApiKey,
      row.evolutionInstance,
      row.evolutionInstanceId,
      row.metadata
    );
    const chatwoot = await this.testChatwoot(
      row.chatwootUrl,
      chatwootApiToken,
      row.chatwootAccountId,
      row.chatwootInboxId,
      row.chatwootInboxIdentifier
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
    metadata?: Record<string, unknown> | null
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
    } catch (error: any) {
      return { ok: false, endpoint: statusEndpoint, error: error?.message ?? 'network_error' };
    }
  }

  private readEvolutionConnectConfig(metadata?: Record<string, unknown> | null) {
    const source = metadata && typeof metadata === 'object' ? metadata : {};
    const evolution = source && typeof source.evolution === 'object' && source.evolution ? (source.evolution as Record<string, unknown>) : source;

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
    inboxIdentifier?: string | null
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

      const payload: any = await res.json().catch(() => null);
      const list = Array.isArray(payload) ? payload : Array.isArray(payload?.payload) ? payload.payload : [];

      if (inboxId) {
        const hit = list.find((item: any) => item?.id?.toString?.() === inboxId);
        if (!hit) return { ok: false, endpoint, error: `Inbox id ${inboxId} nao encontrado na conta ${accountId}` };
      }

      if (inboxIdentifier) {
        const hit = list.find((item: any) => item?.identifier?.toString?.() === inboxIdentifier);
        if (!hit) return { ok: false, endpoint, error: `Inbox identifier ${inboxIdentifier} nao encontrado` };
      }

      return { ok: true, endpoint };
    } catch (error: any) {
      return { ok: false, endpoint, error: error?.message ?? 'network_error' };
    }
  }

  private async validateInput(input: UpsertConnectionInput, excludeId?: string) {
    if (!input.name?.trim()) throw new Error('name obrigatorio');
    if (!input.companyId?.trim()) throw new Error('companyId obrigatorio');
    if (!input.evolutionApiUrl?.trim()) throw new Error('evolutionApiUrl obrigatorio');
    if (!input.evolutionApiKey?.trim()) throw new Error('evolutionApiKey obrigatorio');
    if (!input.evolutionInstance?.trim()) throw new Error('evolutionInstance obrigatorio');
    if (!input.chatwootUrl?.trim()) throw new Error('chatwootUrl obrigatorio');
    if (!input.chatwootApiToken?.trim()) throw new Error('chatwootApiToken obrigatorio');
    if (!input.chatwootAccountId?.toString().trim()) throw new Error('chatwootAccountId obrigatorio');
    if (!input.chatwootInboxId && !input.chatwootInboxIdentifier) {
      throw new Error('Defina chatwootInboxId ou chatwootInboxIdentifier');
    }
    if (input.chatwootInboxIdentifier && /^\d+$/.test(input.chatwootInboxIdentifier)) {
      throw new Error('chatwootInboxIdentifier nao deve ser numerico');
    }

    const normalizedCompanyId = input.companyId.trim();
    const company = await this.prisma.company.findUnique({
      where: { id: normalizedCompanyId },
      select: { id: true, deletedAt: true },
    });

    if (!company || company.deletedAt) {
      throw new Error('companyId invalido');
    }

    const inputGroupJids = this.readConnectionGroupJids(input.metadata);
    const evolutionConflict = await (this.prisma as any).integrationConnection.findFirst({
      where: {
        status: 'ACTIVE',
        evolutionApiUrl: input.evolutionApiUrl.trim(),
        ...(input.evolutionInstanceId?.trim()
          ? { evolutionInstanceId: input.evolutionInstanceId.trim() }
          : { evolutionInstance: input.evolutionInstance.trim() }),
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, name: true, companyId: true },
    });

    if ((input.status ?? 'ACTIVE') === 'ACTIVE' && evolutionConflict) {
      if (inputGroupJids.length === 0) {
        throw new Error(`Instancia Evolution ja vinculada pela conexao ${evolutionConflict.name}.`);
      }

      const sameInstanceConnections = await (this.prisma as any).integrationConnection.findMany({
        where: {
          status: 'ACTIVE',
          evolutionApiUrl: input.evolutionApiUrl.trim(),
          ...(input.evolutionInstanceId?.trim()
            ? { evolutionInstanceId: input.evolutionInstanceId.trim() }
            : { evolutionInstance: input.evolutionInstance.trim() }),
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true, name: true, metadata: true },
      });
      const groupConflict = (sameInstanceConnections as any[]).find((row) => {
        const existingGroupJids = this.readConnectionGroupJids(row.metadata);
        return existingGroupJids.some((jid) => inputGroupJids.includes(jid));
      });

      if (groupConflict) {
        throw new Error(`Grupo Evolution ja vinculado pela conexao ${groupConflict.name}.`);
      }
    }

    const inboxConflict = await (this.prisma as any).integrationConnection.findFirst({
      where: {
        status: 'ACTIVE',
        chatwootUrl: input.chatwootUrl.trim(),
        chatwootAccountId: input.chatwootAccountId.toString().trim(),
        ...(input.chatwootInboxId
          ? { chatwootInboxId: input.chatwootInboxId.toString().trim() }
          : { chatwootInboxIdentifier: input.chatwootInboxIdentifier?.trim() || null }),
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, name: true, companyId: true },
    });

    if ((input.status ?? 'ACTIVE') === 'ACTIVE' && inboxConflict) {
      throw new Error(`Inbox do Chatwoot ja vinculada pela conexao ${inboxConflict.name}.`);
    }
  }

  private toDatabaseInput(input: UpsertConnectionInput) {
    return {
      companyId: input.companyId ?? null,
      name: input.name.trim(),
      status: input.status ?? 'ACTIVE',
      evolutionApiUrl: input.evolutionApiUrl.trim(),
      evolutionApiKeyEncrypted: this.encrypt(input.evolutionApiKey.trim()),
      evolutionInstance: input.evolutionInstance.trim(),
      evolutionInstanceId: input.evolutionInstanceId?.trim() || null,
      evolutionWebhookSecretEncrypted: input.evolutionWebhookSecret?.trim() ? this.encrypt(input.evolutionWebhookSecret.trim()) : null,
      chatwootUrl: input.chatwootUrl.trim(),
      chatwootApiTokenEncrypted: this.encrypt(input.chatwootApiToken.trim()),
      chatwootAccountId: input.chatwootAccountId.toString().trim(),
      chatwootInboxId: input.chatwootInboxId?.toString().trim() || null,
      chatwootInboxIdentifier: input.chatwootInboxIdentifier?.trim() || null,
      chatwootWebhookSecretEncrypted: input.chatwootWebhookSecret?.trim() ? this.encrypt(input.chatwootWebhookSecret.trim()) : null,
      metadata: input.metadata ?? null,
    };
  }

  private readConnectionGroupJids(metadata?: Record<string, unknown> | null): string[] {
    const source = metadata && typeof metadata === 'object' ? metadata : {};
    const evolution = source && typeof source.evolution === 'object' && source.evolution ? (source.evolution as Record<string, unknown>) : source;
    const raw =
      Array.isArray(evolution.allowedGroups) ? evolution.allowedGroups :
      Array.isArray(evolution.groups) ? evolution.groups :
      Array.isArray(evolution.allowedGroupJids) ? evolution.allowedGroupJids :
      Array.isArray(evolution.groupJids) ? evolution.groupJids :
      typeof evolution.allowedGroupJids === 'string' ? evolution.allowedGroupJids.split(',') :
      typeof evolution.groupJids === 'string' ? evolution.groupJids.split(',') :
      [];

    return Array.from(new Set(
      raw
        .map((item: any) => String(typeof item === 'string' ? item : item?.jid ?? item?.groupJid ?? '').trim().toLowerCase())
        .filter((item: string) => item.endsWith('@g.us')),
    ));
  }

  private toOutput(row: any) {
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

  private resolveEncryptionKey(): Buffer {
    const raw = process.env.INTEGRATION_CONFIG_ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET;
    if (!raw || !raw.trim()) {
      throw new Error('INTEGRATION_CONFIG_ENCRYPTION_KEY (ou BETTER_AUTH_SECRET) obrigatoria para criptografia');
    }
    return createHash('sha256').update(raw).digest();
  }

  private encrypt(plain: string): string {
    const key = this.resolveEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
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
