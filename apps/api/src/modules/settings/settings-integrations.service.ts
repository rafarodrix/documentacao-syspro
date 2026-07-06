import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import {
  DEFAULT_EVOLUTION_SETTINGS,
  evolutionSettingsSchema,
  type EvolutionSettingsInput,
} from '@dosc-syspro/contracts/evolution';
import {
  DEFAULT_CHATWOOT_INTEGRATION_SETTINGS,
  DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS,
  chatwootBehaviorSettingsSchema,
  chatwootIntegrationSettingsSchema,
  type ChatwootBehaviorSettingsInput,
  type ChatwootIntegrationSettingsInput,
} from '@dosc-syspro/contracts/chatwoot';
import { readChatwootRuntimeConfig, readEvolutionRuntimeConfig } from '@dosc-syspro/config';
import {
  DEFAULT_GOOGLE_CALENDAR_SETTINGS,
  googleCalendarSettingsSchema,
  storageR2SettingsSchema,
  type GoogleCalendarSettingsInput,
  type StorageR2SettingsInput,
} from '@dosc-syspro/contracts/settings';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationConnectionsService } from './integration-connections.service';
import { IntegrationContextService } from './integration-context.service';
import { ChatwootClient } from '../integrations/chatwoot/chatwoot.client';
import { R2StorageService } from '../integrations/storage/r2-storage.service';
import { ensureRequiredEvolutionSubscribe } from './evolution-webhook-subscribe';

@Injectable()
export class SettingsIntegrationsService {
  private static readonly EVOLUTION_CONFIG_KEY = 'evolution_config';
  private static readonly EVOLUTION_QRCODE_KEY_PREFIX = 'evolution_qrcode:';
  private static readonly EVOLUTION_STATUS_KEY_PREFIX = 'evolution_status:';
  private static readonly CHATWOOT_BEHAVIOR_SETTINGS_KEY = 'chatwoot_behavior_settings';
  private static readonly CHATWOOT_CONFIG_KEY = 'chatwoot_integration_config';
  private static readonly CHATWOOT_API_TOKEN_KEY = 'chatwoot_api_token';
  private static readonly CHATWOOT_PLATFORM_API_TOKEN_KEY = 'chatwoot_platform_api_token';
  private static readonly CHATWOOT_SYSTEM_BOT_TOKEN_KEY = 'chatwoot_system_bot_token';
  private static readonly CHATWOOT_WEBHOOK_SECRET_KEY = 'chatwoot_webhook_secret';
  private static readonly GOOGLE_CALENDAR_CONFIG_KEY = 'google_calendar_config';
  private static readonly GOOGLE_CALENDAR_CLIENT_SECRET_KEY = 'google_calendar_client_secret';
  private static readonly GOOGLE_CALENDAR_REFRESH_TOKEN_KEY = 'google_calendar_refresh_token';
  private static readonly STORAGE_CONFIG_KEY = R2StorageService.STORAGE_CONFIG_KEY;
  private static readonly STORAGE_ACCESS_KEY_ID_KEY = R2StorageService.STORAGE_ACCESS_KEY_ID_KEY;
  private static readonly STORAGE_SECRET_ACCESS_KEY_KEY = R2StorageService.STORAGE_SECRET_ACCESS_KEY_KEY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationConnections: IntegrationConnectionsService,
    private readonly integrationContext: IntegrationContextService,
    private readonly chatwootClient: ChatwootClient,
    private readonly r2StorageService: R2StorageService,
  ) {}

  async getEvolutionSettings() {
    return { success: true, settings: await this.readStoredEvolutionSettings() };
  }

  async setEvolutionSettings(input: EvolutionSettingsInput) {
    const parsed = evolutionSettingsSchema.parse(input);
    const setting = await this.prisma.systemSetting.upsert({
      where: { key: SettingsIntegrationsService.EVOLUTION_CONFIG_KEY },
      update: { value: JSON.stringify(parsed) },
      create: {
        key: SettingsIntegrationsService.EVOLUTION_CONFIG_KEY,
        value: JSON.stringify(parsed),
        description: 'Configuracao global Evolution',
      },
    });

    return {
      success: true,
      settings: parsed,
      updatedAt: setting.updatedAt,
    };
  }

  async getEvolutionInstanceStatus() {
    const [context, settings] = await Promise.all([
      this.integrationContext.getDefaultContext(),
      this.readStoredEvolutionSettings(),
    ]);
    const instanceId = String(context?.evolution.instanceId || settings.instanceId || '').trim();
    const instance = String(context?.evolution.instance || settings.instance || '').trim();

    if (!instanceId) {
      return {
        success: true,
        data: {
          configured: false,
          instance,
          instanceId: null,
          status: 'NOT_CONFIGURED',
          event: null,
          receivedAt: null,
          details: {},
        },
      };
    }

    const stored = await this.readStoredEvolutionStatus(instanceId);
    return {
      success: true,
      data: {
        configured: Boolean(context?.evolution.apiUrl && context?.evolution.apiKey && instanceId),
        instance,
        instanceId,
        status: stored?.status ?? 'UNKNOWN',
        event: stored?.event ?? null,
        receivedAt: stored?.receivedAt ?? null,
        details: stored?.details ?? {},
      },
    };
  }

  async getEvolutionQrCode() {
    const [context, settings] = await Promise.all([
      this.integrationContext.getDefaultContext(),
      this.readStoredEvolutionSettings(),
    ]);

    if (!context?.evolution?.apiUrl || !context?.evolution?.apiKey) {
      return {
        success: false,
        error: 'EVOLUTION_CONTEXT_NOT_CONFIGURED',
        message: 'Evolution API URL ou API key nao configurada no contexto efetivo.',
      };
    }

    const instance = String(context.evolution.instance || settings.instance || '').trim();
    if (!instance) {
      return {
        success: false,
        error: 'EVOLUTION_INSTANCE_NOT_CONFIGURED',
        message: 'Instancia Evolution nao configurada.',
      };
    }

    const result = await this.connectEvolutionInstance({
      apiUrl: context.evolution.apiUrl,
      apiKey: context.evolution.apiKey,
      instance,
      instanceId: context.evolution.instanceId || settings.instanceId || '',
      phone: settings.phone,
      webhookUrl: settings.webhookUrl,
      subscribe: settings.subscribe,
      immediate: settings.immediate,
    });

    return {
      success: result.ok,
      data: result.ok
        ? {
            instance,
            endpoint: result.endpoint,
            qrCode: result.qrCode,
            code: result.code,
            receivedAt: result.receivedAt,
          }
        : undefined,
      error: result.ok ? undefined : 'EVOLUTION_QRCODE_FAILED',
      message: result.ok
        ? result.qrCode
          ? 'QR Code recebido pelo webhook da Evolution.'
          : 'Conexao aplicada na Evolution; aguardando evento QRCode no webhook.'
        : result.error,
    };
  }

  async getEvolutionDiagnostics() {
    const [defaultContext, activeContexts, storedSettings] = await Promise.all([
      this.integrationContext.getDefaultContext(),
      this.integrationContext.listActiveContexts(),
      this.readStoredEvolutionSettings(),
    ]);

    const runtime = readEvolutionRuntimeConfig();
    const chatwootDiagnostics = defaultContext
      ? await this.chatwootClient.inspectInboxConfiguration(defaultContext.chatwoot)
      : null;
    const issues: string[] = [];

    if (!defaultContext) {
      issues.push('Nenhum contexto de integracao ativo foi resolvido.');
    }

    if (defaultContext?.source === 'env') {
      issues.push('O backend esta usando o fallback de ambiente `env:default`.');
    }

    if (!defaultContext?.evolution.apiUrl?.trim()) {
      issues.push('Evolution API URL ausente no contexto efetivo.');
    }

    if (!defaultContext?.evolution.apiKey?.trim()) {
      issues.push('Evolution API key ausente no contexto efetivo.');
    }

    if (!defaultContext?.evolution.instance?.trim()) {
      issues.push('Evolution instance ausente no contexto efetivo.');
    }

    if (!runtime.apiUrl?.trim()) {
      issues.push('EVOLUTION_API_URL ausente no runtime do backend.');
    }

    if (!runtime.apiKey?.trim()) {
      issues.push('EVOLUTION_API_KEY ausente no runtime do backend.');
    }

    if (!String(runtime.instance ?? '').trim() && !String(storedSettings.instance ?? '').trim()) {
      issues.push('Nenhuma instance foi encontrada nem nas variaveis de ambiente nem em `evolution_config`.');
    }

    return {
      success: true,
      data: {
        resolvedDefaultContext: defaultContext
          ? {
              source: defaultContext.source,
              connectionKey: defaultContext.connectionKey,
              connectionId: defaultContext.connectionId,
              companyId: defaultContext.companyId,
              name: defaultContext.name,
              evolution: {
                apiUrl: defaultContext.evolution.apiUrl || null,
                hasApiKey: Boolean(defaultContext.evolution.apiKey),
                instance: defaultContext.evolution.instance || null,
                instanceId: defaultContext.evolution.instanceId || null,
                hasInstanceToken: Boolean(defaultContext.evolution.instanceToken),
              },
            }
          : null,
        runtime: {
          apiUrl: runtime.apiUrl || null,
          hasApiKey: Boolean(runtime.apiKey),
          instance: String(runtime.instance ?? '').trim() || null,
        },
        storedSettings: {
          instance: String(storedSettings.instance ?? '').trim() || null,
          instanceId: String(storedSettings.instanceId ?? '').trim() || null,
          hasInstanceToken: Boolean(storedSettings.instanceToken),
        },
        activeConnections: activeContexts.map((context) => ({
          source: context.source,
          connectionKey: context.connectionKey,
          connectionId: context.connectionId,
          companyId: context.companyId,
          name: context.name,
          evolution: {
            apiUrl: context.evolution.apiUrl || null,
            hasApiKey: Boolean(context.evolution.apiKey),
            instance: context.evolution.instance || null,
            instanceId: context.evolution.instanceId || null,
          },
          chatwoot: {
            accountId: context.chatwoot.accountId || null,
            inboxId: context.chatwoot.inboxId || null,
            inboxIdentifier: context.chatwoot.inboxIdentifier || null,
          },
        })),
        chatwootDiagnostics,
        issues,
      },
    };
  }

  async getChatwootBehaviorSettings() {
    return {
      success: true,
      data: await this.readStoredChatwootBehaviorSettings(),
    };
  }

  async getChatwootIntegrationSettings() {
    return {
      success: true,
      data: await this.readStoredChatwootIntegrationSettings(),
    };
  }

  async setChatwootIntegrationSettings(input: ChatwootIntegrationSettingsInput) {
    const parsed = chatwootIntegrationSettingsSchema.parse(input);
    const sanitized = {
      ...parsed,
      apiToken: parsed.apiToken.trim(),
      platformApiToken: parsed.platformApiToken.trim(),
      webhookSecret: parsed.webhookSecret.trim(),
    };
    const { apiToken, platformApiToken, webhookSecret, ...storedConfig } = sanitized;

    await this.prisma.$transaction(async (tx) => {
      await tx.systemSetting.upsert({
        where: { key: SettingsIntegrationsService.CHATWOOT_CONFIG_KEY },
        update: { value: JSON.stringify(storedConfig) },
        create: {
          key: SettingsIntegrationsService.CHATWOOT_CONFIG_KEY,
          value: JSON.stringify(storedConfig),
          description: 'Configuracao principal da integracao Chatwoot',
        },
      });

      await this.upsertEncryptedOptionalSetting(
        tx,
        SettingsIntegrationsService.CHATWOOT_API_TOKEN_KEY,
        apiToken,
        'API token principal do Chatwoot',
      );
      await this.upsertEncryptedOptionalSetting(
        tx,
        SettingsIntegrationsService.CHATWOOT_PLATFORM_API_TOKEN_KEY,
        platformApiToken,
        'Platform API token do Chatwoot',
      );
      await this.upsertEncryptedOptionalSetting(
        tx,
        SettingsIntegrationsService.CHATWOOT_WEBHOOK_SECRET_KEY,
        webhookSecret,
        'Webhook secret do Chatwoot',
      );
    });

    return {
      success: true,
      data: sanitized,
      message: 'Configuracoes da integracao Chatwoot salvas.',
    };
  }

  async setChatwootBehaviorSettings(input: ChatwootBehaviorSettingsInput) {
    const parsed = chatwootBehaviorSettingsSchema.parse(input);
    const normalizedBotToken = parsed.systemMessageApiToken.trim();
    const sanitized = {
      ...parsed,
      systemMessageApiToken: normalizedBotToken,
    };
    const { systemMessageApiToken, ...storedBehavior } = sanitized;

    await this.prisma.$transaction(async (tx) => {
      await tx.systemSetting.upsert({
        where: { key: SettingsIntegrationsService.CHATWOOT_BEHAVIOR_SETTINGS_KEY },
        update: { value: JSON.stringify(storedBehavior) },
        create: {
          key: SettingsIntegrationsService.CHATWOOT_BEHAVIOR_SETTINGS_KEY,
          value: JSON.stringify(storedBehavior),
          description: 'Configuracoes operacionais do webhook Chatwoot',
        },
      });

      await this.upsertEncryptedOptionalSetting(
        tx,
        SettingsIntegrationsService.CHATWOOT_SYSTEM_BOT_TOKEN_KEY,
        systemMessageApiToken,
        'Token criptografado da identidade tecnica do Chatwoot',
      );
    });

    return {
      success: true,
      data: sanitized,
      message: 'Configuracoes do Chatwoot salvas.',
    };
  }

  async getIntegrationDiagnostics() {
    const [defaultContext, activeContexts, chatwootBehavior, chatwootConfig] = await Promise.all([
      this.integrationContext.getDefaultContext(),
      this.integrationContext.listActiveContexts(),
      this.readStoredChatwootBehaviorSettings(),
      this.readStoredChatwootIntegrationSettings(),
    ]);

    const chatwootDiagnostics = defaultContext
      ? await this.chatwootClient.inspectInboxConfiguration(defaultContext.chatwoot)
      : null;
    const storageDiagnostics = await this.r2StorageService.getDiagnostics();

    return {
      success: true,
      chatwoot: {
        configured: Boolean(defaultContext?.chatwoot?.url && defaultContext?.chatwoot?.accountId && defaultContext?.chatwoot?.apiToken),
        source: defaultContext?.source ?? null,
        activeConnections: activeContexts.length,
        runtime: {
          hasUrl: Boolean(chatwootConfig.url),
          hasAccountId: Boolean(chatwootConfig.accountId),
          hasApiToken: Boolean(chatwootConfig.apiToken),
          hasPlatformApiToken: Boolean(chatwootConfig.platformApiToken),
          hasSystemMessageBotToken: Boolean(chatwootBehavior.systemMessageApiToken),
          hasInboxId: Boolean(chatwootConfig.inboxId),
          hasInboxIdentifier: Boolean(chatwootConfig.inboxIdentifier),
          hasWebhookSecret: Boolean(chatwootConfig.webhookSecret),
        },
        diagnostics: chatwootDiagnostics,
        behavior: chatwootBehavior,
      },
      storage: {
        ...storageDiagnostics,
      },
    };
  }

  async getStorageConfig() {
    return {
      success: true,
      data: await this.r2StorageService.readStoredSettings(),
    };
  }

  async getGoogleCalendarConfig() {
    return {
      success: true,
      data: await this.readStoredGoogleCalendarSettings(),
    };
  }

  async setStorageConfig(input: StorageR2SettingsInput) {
    const parsed = storageR2SettingsSchema.parse(input);
    const sanitized = {
      ...parsed,
      endpoint: parsed.endpoint.trim(),
      accessKeyId: parsed.accessKeyId.trim(),
      secretAccessKey: parsed.secretAccessKey.trim(),
      defaultBucketName: parsed.defaultBucketName.trim(),
      defaultPublicBaseUrl: parsed.defaultPublicBaseUrl.trim(),
    };
    const { accessKeyId, secretAccessKey, ...storedConfig } = sanitized;

    await this.prisma.$transaction(async (tx) => {
      await tx.systemSetting.upsert({
        where: { key: SettingsIntegrationsService.STORAGE_CONFIG_KEY },
        update: { value: JSON.stringify(storedConfig) },
        create: {
          key: SettingsIntegrationsService.STORAGE_CONFIG_KEY,
          value: JSON.stringify(storedConfig),
          description: 'Configuracao principal do storage R2 por modulo',
        },
      });

      await this.upsertEncryptedOptionalSetting(
        tx,
        SettingsIntegrationsService.STORAGE_ACCESS_KEY_ID_KEY,
        accessKeyId,
        'Access Key ID do Cloudflare R2',
      );
      await this.upsertEncryptedOptionalSetting(
        tx,
        SettingsIntegrationsService.STORAGE_SECRET_ACCESS_KEY_KEY,
        secretAccessKey,
        'Secret Access Key do Cloudflare R2',
      );
    });

    return {
      success: true,
      data: sanitized,
      message: 'Configuracao de storage salva com sucesso.',
    };
  }

  async setGoogleCalendarConfig(input: GoogleCalendarSettingsInput) {
    const parsed = googleCalendarSettingsSchema.parse(input);
    const sanitized = {
      ...parsed,
      calendarId: parsed.calendarId.trim(),
      timeZone: parsed.timeZone.trim(),
      clientId: parsed.clientId.trim(),
      clientSecret: parsed.clientSecret.trim(),
      refreshToken: parsed.refreshToken.trim(),
      eventTitlePrefix: parsed.eventTitlePrefix.trim(),
    };
    const { clientSecret, refreshToken, ...storedConfig } = sanitized;

    await this.prisma.$transaction(async (tx) => {
      await tx.systemSetting.upsert({
        where: { key: SettingsIntegrationsService.GOOGLE_CALENDAR_CONFIG_KEY },
        update: { value: JSON.stringify(storedConfig) },
        create: {
          key: SettingsIntegrationsService.GOOGLE_CALENDAR_CONFIG_KEY,
          value: JSON.stringify(storedConfig),
          description: 'Configuracao principal da integracao Google Agenda',
        },
      });

      await this.upsertEncryptedOptionalSetting(
        tx,
        SettingsIntegrationsService.GOOGLE_CALENDAR_CLIENT_SECRET_KEY,
        clientSecret,
        'Client Secret da integracao Google Agenda',
      );
      await this.upsertEncryptedOptionalSetting(
        tx,
        SettingsIntegrationsService.GOOGLE_CALENDAR_REFRESH_TOKEN_KEY,
        refreshToken,
        'Refresh Token da integracao Google Agenda',
      );
    });

    return {
      success: true,
      data: sanitized,
      message: 'Configuracao do Google Agenda salva com sucesso.',
    };
  }

  async listIntegrationConnections(companyId?: string) {
    const rows = await this.integrationConnections.list(companyId?.trim() || undefined);
    return { success: true, data: rows };
  }

  async getIntegrationConnection(id: string) {
    const row = await this.integrationConnections.getById(id);
    if (!row) throw new NotFoundException('Integracao nao encontrada');
    return { success: true, data: row };
  }

  async createIntegrationConnection(body: any) {
    const created = await this.integrationConnections.create(body);
    return { success: true, data: created };
  }

  async updateIntegrationConnection(id: string, body: any) {
    const updated = await this.integrationConnections.update(id, body);
    if (!updated) throw new NotFoundException('Integracao nao encontrada');
    return { success: true, data: updated };
  }

  async deleteIntegrationConnection(id: string) {
    await this.integrationConnections.remove(id);
    return { success: true };
  }

  async testIntegrationConnection(id: string) {
    const result = await this.integrationConnections.test(id);
    if (!result) throw new NotFoundException('Integracao nao encontrada');
    return { success: true, data: result };
  }

  private async readStoredChatwootBehaviorSettings() {
    const [behaviorSetting, systemBotTokenSetting] = await Promise.all([
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsIntegrationsService.CHATWOOT_BEHAVIOR_SETTINGS_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsIntegrationsService.CHATWOOT_SYSTEM_BOT_TOKEN_KEY },
        select: { value: true },
      }),
    ]);

    const fallback = {
      ...DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS,
      systemMessageApiToken: systemBotTokenSetting?.value ? this.decryptOptional(systemBotTokenSetting.value) ?? '' : '',
    };

    if (!behaviorSetting?.value) {
      return fallback;
    }

    try {
      const parsed = JSON.parse(behaviorSetting.value);
      const validation = chatwootBehaviorSettingsSchema.safeParse({
        ...parsed,
        systemMessageApiToken: systemBotTokenSetting?.value ? this.decryptOptional(systemBotTokenSetting.value) ?? '' : '',
      });
      return validation.success ? validation.data : fallback;
    } catch {
      return fallback;
    }
  }

  private async readStoredChatwootIntegrationSettings() {
    const [configSetting, apiTokenSetting, platformApiTokenSetting, webhookSecretSetting] = await Promise.all([
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsIntegrationsService.CHATWOOT_CONFIG_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsIntegrationsService.CHATWOOT_API_TOKEN_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsIntegrationsService.CHATWOOT_PLATFORM_API_TOKEN_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsIntegrationsService.CHATWOOT_WEBHOOK_SECRET_KEY },
        select: { value: true },
      }),
    ]);

    const runtime = readChatwootRuntimeConfig();
    const fallback = {
      ...DEFAULT_CHATWOOT_INTEGRATION_SETTINGS,
      url: runtime.url,
      accountId: runtime.accountId,
      apiToken: apiTokenSetting?.value ? this.decryptOptional(apiTokenSetting.value) ?? '' : runtime.apiToken,
      platformApiToken: platformApiTokenSetting?.value
        ? this.decryptOptional(platformApiTokenSetting.value) ?? ''
        : runtime.platformApiToken,
      inboxId: runtime.inboxId,
      inboxIdentifier: runtime.inboxIdentifier,
      webhookSecret: webhookSecretSetting?.value ? this.decryptOptional(webhookSecretSetting.value) ?? '' : runtime.webhookSecret,
      webhookMaxSkewSeconds: runtime.webhookMaxSkewSeconds ?? DEFAULT_CHATWOOT_INTEGRATION_SETTINGS.webhookMaxSkewSeconds,
      incomingMediaMode: runtime.incomingMediaMode,
    };

    if (!configSetting?.value) {
      return fallback;
    }

    try {
      const parsed = JSON.parse(configSetting.value);
      const validation = chatwootIntegrationSettingsSchema.safeParse({
        ...parsed,
        apiToken: apiTokenSetting?.value ? this.decryptOptional(apiTokenSetting.value) ?? '' : runtime.apiToken,
        platformApiToken: platformApiTokenSetting?.value
          ? this.decryptOptional(platformApiTokenSetting.value) ?? ''
          : runtime.platformApiToken,
        webhookSecret: webhookSecretSetting?.value
          ? this.decryptOptional(webhookSecretSetting.value) ?? ''
          : runtime.webhookSecret,
      });
      return validation.success ? validation.data : fallback;
    } catch {
      return fallback;
    }
  }

  private async readStoredGoogleCalendarSettings() {
    const [configSetting, clientSecretSetting, refreshTokenSetting] = await Promise.all([
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsIntegrationsService.GOOGLE_CALENDAR_CONFIG_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsIntegrationsService.GOOGLE_CALENDAR_CLIENT_SECRET_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsIntegrationsService.GOOGLE_CALENDAR_REFRESH_TOKEN_KEY },
        select: { value: true },
      }),
    ]);

    const fallback = {
      ...DEFAULT_GOOGLE_CALENDAR_SETTINGS,
      clientSecret: clientSecretSetting?.value ? this.decryptOptional(clientSecretSetting.value) ?? '' : '',
      refreshToken: refreshTokenSetting?.value ? this.decryptOptional(refreshTokenSetting.value) ?? '' : '',
    };

    if (!configSetting?.value) {
      return fallback;
    }

    try {
      const parsed = JSON.parse(configSetting.value);
      const validation = googleCalendarSettingsSchema.safeParse({
        ...parsed,
        clientSecret: clientSecretSetting?.value ? this.decryptOptional(clientSecretSetting.value) ?? '' : '',
        refreshToken: refreshTokenSetting?.value ? this.decryptOptional(refreshTokenSetting.value) ?? '' : '',
      });
      return validation.success ? validation.data : fallback;
    } catch {
      return fallback;
    }
  }

  private async upsertEncryptedOptionalSetting(
    tx: Prisma.TransactionClient,
    key: string,
    value: string,
    description: string,
  ) {
    if (value) {
      const encrypted = this.encrypt(value);
      await tx.systemSetting.upsert({
        where: { key },
        update: { value: encrypted },
        create: {
          key,
          value: encrypted,
          description,
        },
      });
      return;
    }

    await tx.systemSetting.deleteMany({
      where: { key },
    });
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

  private async readStoredEvolutionSettings() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: SettingsIntegrationsService.EVOLUTION_CONFIG_KEY },
      select: { value: true },
    });

    if (!setting?.value) {
      return DEFAULT_EVOLUTION_SETTINGS;
    }

    try {
      const parsed = JSON.parse(setting.value);
      const validation = evolutionSettingsSchema.safeParse(parsed);
      return validation.success ? validation.data : DEFAULT_EVOLUTION_SETTINGS;
    } catch {
      return DEFAULT_EVOLUTION_SETTINGS;
    }
  }

  private async connectEvolutionInstance(input: {
    apiUrl: string;
    apiKey: string;
    instance: string;
    instanceId?: string;
    phone?: string;
    webhookUrl?: string;
    subscribe?: string[];
    immediate?: boolean;
  }): Promise<{
    ok: boolean;
    endpoint?: string;
    qrCode?: string | null;
    code?: string | null;
    receivedAt?: string | null;
    error?: string;
  }> {
    const base = input.apiUrl.replace(/\/+$/, '');
    const instanceId = input.instanceId?.trim();
    const webhookUrl = input.webhookUrl?.trim();
    const endpoint = '/instance/connect';
    const requestedAt = new Date();

    if (!instanceId) {
      return { ok: false, endpoint, error: 'Instance ID obrigatorio para POST /instance/connect na Evolution Go.' };
    }

    if (!webhookUrl) {
      return { ok: false, endpoint, error: 'Webhook URL obrigatoria para conectar a instancia Evolution Go.' };
    }

    const subscribe = ensureRequiredEvolutionSubscribe(input.subscribe);
    const connectRes = await fetch(`${base}${endpoint}`, {
      method: 'POST',
      headers: {
        apikey: input.apiKey,
        'Content-Type': 'application/json',
        instanceId,
      },
      body: JSON.stringify({
        webhookUrl,
        subscribe,
        immediate: input.immediate !== false,
        ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
      }),
    }).catch((error: any) => ({
      ok: false,
      status: 0,
      json: async () => ({}),
      text: async () => error?.message ?? 'network_error',
    }) as Response);

    if (!connectRes.ok) {
      const body = await connectRes.text().catch(() => 'unknown_error');
      return { ok: false, endpoint, error: `${endpoint}=status ${connectRes.status} ${body}` };
    }

    await this.upsertStoredEvolutionStatus({
      instanceId,
      event: 'connect_requested',
      status: 'CONNECT_REQUESTED',
      details: {
        webhookUrl,
        subscribe,
        hasPhone: Boolean(input.phone?.trim()),
      },
    });

    const connectPayload: any = await connectRes.json().catch(() => ({}));
    const responseQrCode = this.normalizeEvolutionQrCodeResponse(connectPayload);
    if (responseQrCode.qrCode || responseQrCode.code) {
      return { ok: true, endpoint, ...responseQrCode };
    }

    const storedQrCode = await this.waitForStoredEvolutionQrCode(instanceId, requestedAt);
    return { ok: true, endpoint, ...storedQrCode };
  }

  private normalizeEvolutionQrCodeResponse(payload: any): {
    qrCode?: string | null;
    code?: string | null;
    receivedAt?: string | null;
  } {
    const source = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
    const qrCode =
      this.readOptionalString(source?.qrCode) ??
      this.readOptionalString(source?.qrcode) ??
      this.readOptionalString(source?.Qrcode) ??
      this.readOptionalString(source?.QRCode) ??
      this.readOptionalString(source?.base64) ??
      this.readOptionalString(payload?.qrCode) ??
      this.readOptionalString(payload?.qrcode);
    const code =
      this.readOptionalString(source?.code) ??
      this.readOptionalString(source?.Code) ??
      this.readOptionalString(payload?.code);
    const receivedAt =
      this.readOptionalString(source?.receivedAt) ??
      this.readOptionalString(payload?.receivedAt);

    return {
      qrCode,
      code,
      receivedAt,
    };
  }

  private async waitForStoredEvolutionQrCode(instanceId: string, minReceivedAt: Date) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const stored = await this.readStoredEvolutionQrCode(instanceId, minReceivedAt);
      if (stored?.qrCode || stored?.code) return stored;
      await this.sleep(750);
    }

    return { qrCode: null, code: null, receivedAt: null };
  }

  private async readStoredEvolutionQrCode(instanceId: string, minReceivedAt: Date) {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: `${SettingsIntegrationsService.EVOLUTION_QRCODE_KEY_PREFIX}${instanceId}` },
      select: { value: true, updatedAt: true },
    });

    if (!row?.value) return null;

    try {
      const parsed = JSON.parse(row.value);
      const receivedAt = this.readOptionalString(parsed?.receivedAt) ?? row.updatedAt.toISOString();
      if (new Date(receivedAt).getTime() < minReceivedAt.getTime()) {
        return null;
      }

      return {
        qrCode: this.readOptionalString(parsed?.qrCode),
        code: this.readOptionalString(parsed?.code),
        receivedAt,
      };
    } catch {
      return null;
    }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async upsertStoredEvolutionStatus(input: {
    instanceId: string;
    event: string;
    status: string;
    details?: Record<string, unknown>;
  }) {
    const payload = {
      instanceId: input.instanceId,
      event: input.event,
      status: input.status,
      details: input.details ?? {},
      receivedAt: new Date().toISOString(),
    };

    await this.prisma.systemSetting.upsert({
      where: { key: `${SettingsIntegrationsService.EVOLUTION_STATUS_KEY_PREFIX}${input.instanceId}` },
      update: { value: JSON.stringify(payload) },
      create: {
        key: `${SettingsIntegrationsService.EVOLUTION_STATUS_KEY_PREFIX}${input.instanceId}`,
        value: JSON.stringify(payload),
        description: 'Ultimo status operacional recebido da Evolution Go',
      },
    });
  }

  private async readStoredEvolutionStatus(instanceId: string) {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: `${SettingsIntegrationsService.EVOLUTION_STATUS_KEY_PREFIX}${instanceId}` },
      select: { value: true, updatedAt: true },
    });

    if (!row?.value) return null;

    try {
      const parsed = JSON.parse(row.value);
      return {
        status: this.readOptionalString(parsed?.status) ?? 'UNKNOWN',
        event: this.readOptionalString(parsed?.event),
        receivedAt: this.readOptionalString(parsed?.receivedAt) ?? row.updatedAt.toISOString(),
        details: parsed?.details && typeof parsed.details === 'object' ? parsed.details : {},
      };
    } catch {
      return null;
    }
  }

  private readOptionalString(value: unknown): string | null {
    const normalized = String(value ?? '').trim();
    return normalized || null;
  }
}
