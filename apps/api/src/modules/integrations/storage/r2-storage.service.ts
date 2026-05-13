import { Injectable, Logger } from '@nestjs/common';
import { readR2RuntimeConfig } from '@dosc-syspro/config';
import {
  DEFAULT_STORAGE_R2_SETTINGS,
  storageR2SettingsSchema,
  type StorageR2Settings,
} from '@dosc-syspro/contracts/settings';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createDecipheriv, createHash } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';

type StorageScope = 'default' | 'tickets' | 'chatwoot' | 'evolution';

type ResolvedStorageTarget = {
  source: 'database' | 'env' | 'none';
  configured: boolean;
  fallbackToDatabase: boolean;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicBaseUrl: string;
  signedUrlTtlSeconds: number;
  prefix: string;
};

@Injectable()
export class R2StorageService {
  static readonly STORAGE_CONFIG_KEY = 'storage_r2_config';
  static readonly STORAGE_ACCESS_KEY_ID_KEY = 'storage_r2_access_key_id';
  static readonly STORAGE_SECRET_ACCESS_KEY_KEY = 'storage_r2_secret_access_key';

  private readonly logger = new Logger(R2StorageService.name);
  private clientCache = new Map<string, S3Client>();

  constructor(private readonly prisma: PrismaService) {}

  async isEnabled(scope: StorageScope = 'default'): Promise<boolean> {
    const target = await this.resolveTarget(scope);
    return target.configured;
  }

  async shouldFallbackToDatabase(): Promise<boolean> {
    const settings = await this.readStoredSettings();
    return settings.fallbackToDatabase;
  }

  async getDiagnostics() {
    const [target, defaultTarget, ticketsTarget, evolutionTarget, chatwootTarget] = await Promise.all([
      this.resolveTarget('default'),
      this.resolveTarget('default'),
      this.resolveTarget('tickets'),
      this.resolveTarget('evolution'),
      this.resolveTarget('chatwoot'),
    ]);
    const issues: string[] = [];

    if (!target.endpoint) issues.push('Endpoint R2 ausente.');
    if (!target.accessKeyId) issues.push('Access Key ID ausente.');
    if (!target.secretAccessKey) issues.push('Secret Access Key ausente.');
    if (!target.bucketName) issues.push('Bucket padrao ausente.');
    if (target.configured && !target.publicBaseUrl) {
      issues.push('Public Base URL ausente; o sistema usara URLs assinadas temporarias.');
    }

    return {
      provider: 'Cloudflare R2',
      configured: target.configured,
      source: target.source,
      fallbackToDatabase: target.fallbackToDatabase,
      mode: target.publicBaseUrl ? 'public_base_url' : 'signed_url',
      endpointHost: this.extractUrlHost(target.endpoint),
      bucketName: target.bucketName || null,
      publicBaseUrl: target.publicBaseUrl || null,
      signedUrlTtlSeconds: target.signedUrlTtlSeconds,
      hasAccessKeyId: Boolean(target.accessKeyId),
      hasSecretAccessKey: Boolean(target.secretAccessKey),
      modules: {
        default: {
          bucketName: defaultTarget.bucketName || null,
          prefix: defaultTarget.prefix || 'shared',
        },
        tickets: {
          bucketName: ticketsTarget.bucketName || null,
          prefix: ticketsTarget.prefix || 'tickets',
        },
        evolution: {
          bucketName: evolutionTarget.bucketName || null,
          prefix: evolutionTarget.prefix || 'evolution-media',
        },
        chatwoot: {
          bucketName: chatwootTarget.bucketName || null,
          prefix: chatwootTarget.prefix || 'chatwoot-media',
        },
      },
      issues,
    };
  }

  async readStoredSettings(): Promise<StorageR2Settings> {
    const databaseSettings = await this.readDatabaseSettings();
    return databaseSettings ?? this.buildRuntimeFallbackSettings();
  }

  private async readDatabaseSettings(): Promise<StorageR2Settings | null> {
    const [configSetting, accessKeySetting, secretKeySetting] = await Promise.all([
      this.prisma.systemSetting.findUnique({
        where: { key: R2StorageService.STORAGE_CONFIG_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: R2StorageService.STORAGE_ACCESS_KEY_ID_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: R2StorageService.STORAGE_SECRET_ACCESS_KEY_KEY },
        select: { value: true },
      }),
    ]);

    if (!configSetting?.value) {
      return null;
    }

    try {
      const parsed = JSON.parse(configSetting.value);
      const validation = storageR2SettingsSchema.safeParse({
        ...parsed,
        accessKeyId: accessKeySetting?.value ? this.decryptOptional(accessKeySetting.value) ?? '' : '',
        secretAccessKey: secretKeySetting?.value ? this.decryptOptional(secretKeySetting.value) ?? '' : '',
      });
      return validation.success ? validation.data : null;
    } catch {
      return null;
    }
  }

  async uploadBuffer(input: {
    buffer: Buffer;
    filename: string;
    contentType: string;
    prefix?: string;
    scope?: StorageScope;
  }): Promise<{ key: string; url: string }> {
    const target = await this.resolveTarget(input.scope ?? 'default');
    if (!target.configured) {
      throw new Error('R2 nao configurado no contexto efetivo.');
    }

    const key = this.buildObjectKey(target.prefix, input.prefix, input.filename);
    const client = this.getClient(target);

    await client.send(new PutObjectCommand({
      Bucket: target.bucketName,
      Key: key,
      Body: input.buffer,
      ContentType: input.contentType,
    }));

    if (target.publicBaseUrl) {
      return {
        key,
        url: `${target.publicBaseUrl}/${key}`,
      };
    }

    const url = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: target.bucketName,
        Key: key,
      }),
      { expiresIn: target.signedUrlTtlSeconds },
    );

    return { key, url };
  }

  async getObjectUrl(key: string, scope: StorageScope = 'default'): Promise<string> {
    const target = await this.resolveTarget(scope);
    if (!target.configured) {
      throw new Error('R2 nao configurado no contexto efetivo.');
    }

    if (target.publicBaseUrl) {
      return `${target.publicBaseUrl}/${key}`;
    }

    const client = this.getClient(target);
    return getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: target.bucketName,
        Key: key,
      }),
      { expiresIn: target.signedUrlTtlSeconds },
    );
  }

  private async resolveTarget(scope: StorageScope): Promise<ResolvedStorageTarget> {
    const databaseSettings = await this.readDatabaseSettings();
    const runtimeSettings = this.buildRuntimeFallbackSettings();
    const databaseTarget = databaseSettings ? this.buildTargetFromSettings(databaseSettings, scope, 'database') : null;
    if (databaseTarget?.configured) {
      return databaseTarget;
    }

    const runtimeTarget = this.buildTargetFromSettings(runtimeSettings, scope, 'env');
    if (runtimeTarget.configured) {
      return runtimeTarget;
    }

    return {
      ...runtimeTarget,
      source: 'none',
    };
  }

  private getClient(target: ResolvedStorageTarget): S3Client {
    const cacheKey = `${target.endpoint}|${target.accessKeyId}|${target.bucketName}`;
    const cached = this.clientCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const client = new S3Client({
      region: 'auto',
      endpoint: target.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: target.accessKeyId,
        secretAccessKey: target.secretAccessKey,
      },
    });

    this.clientCache.set(cacheKey, client);
    this.logger.log(JSON.stringify({
      flow: 'storage',
      stage: 'r2_client_initialized',
      endpoint: target.endpoint || null,
      bucketName: target.bucketName || null,
      hasPublicBaseUrl: Boolean(target.publicBaseUrl),
      signedUrlTtlSeconds: target.signedUrlTtlSeconds,
      source: target.source,
    }));

    return client;
  }

  private buildObjectKey(basePrefix: string, extraPrefix: string | undefined, filename: string): string {
    const segments = [basePrefix, extraPrefix]
      .map((value) => String(value ?? '').replace(/^\/+|\/+$/g, '').trim())
      .filter(Boolean);
    const prefix = segments.join('/') || 'shared';
    const sanitizedFilename = filename
      .normalize('NFKD')
      .replace(/[^\x00-\x7F]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'arquivo';

    return `${prefix}/${Date.now()}-${sanitizedFilename}`;
  }

  private extractUrlHost(value: string): string | null {
    try {
      return new URL(value).host;
    } catch {
      return null;
    }
  }

  private buildRuntimeFallbackSettings(): StorageR2Settings {
    const runtime = readR2RuntimeConfig();
    return {
      ...DEFAULT_STORAGE_R2_SETTINGS,
      endpoint: runtime.endpoint,
      accessKeyId: runtime.accessKeyId,
      secretAccessKey: runtime.secretAccessKey,
      signedUrlTtlSeconds: runtime.signedUrlTtlSeconds || DEFAULT_STORAGE_R2_SETTINGS.signedUrlTtlSeconds,
      defaultBucketName: runtime.bucketName,
      defaultPublicBaseUrl: runtime.publicBaseUrl,
    };
  }

  private buildTargetFromSettings(
    settings: StorageR2Settings,
    scope: StorageScope,
    source: 'database' | 'env',
  ): ResolvedStorageTarget {
    const moduleBinding = settings.modules[scope] ?? settings.modules.default;
    const bucketName = moduleBinding.bucketName.trim() || settings.defaultBucketName.trim();
    const publicBaseUrl = moduleBinding.publicBaseUrl.trim() || settings.defaultPublicBaseUrl.trim();
    const endpoint = settings.endpoint.trim();
    const accessKeyId = settings.accessKeyId.trim();
    const secretAccessKey = settings.secretAccessKey.trim();

    return {
      source,
      configured: Boolean(endpoint && accessKeyId && secretAccessKey && bucketName),
      fallbackToDatabase: settings.fallbackToDatabase,
      endpoint,
      accessKeyId,
      secretAccessKey,
      bucketName,
      publicBaseUrl,
      signedUrlTtlSeconds: settings.signedUrlTtlSeconds,
      prefix: moduleBinding.prefix.trim() || DEFAULT_STORAGE_R2_SETTINGS.modules[scope].prefix,
    };
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
