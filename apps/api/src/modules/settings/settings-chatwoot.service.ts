import { Injectable } from '@nestjs/common';
import {
  DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS,
  DEFAULT_CHATWOOT_INTEGRATION_SETTINGS,
  chatwootBehaviorSettingsSchema,
  chatwootIntegrationSettingsSchema,
  type ChatwootBehaviorSettingsInput,
  type ChatwootIntegrationSettingsInput,
} from '@dosc-syspro/contracts/chatwoot';
import { readChatwootRuntimeConfig } from '@dosc-syspro/config';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationContextService } from './integration-context.service';
import { ChatwootClient } from '../integrations/chatwoot/chatwoot.client';
import { SettingsIntegrationSecretsService } from './settings-integration-secrets.service';

@Injectable()
export class SettingsChatwootService {
  private static readonly CHATWOOT_BEHAVIOR_SETTINGS_KEY = 'chatwoot_behavior_settings';
  private static readonly CHATWOOT_CONFIG_KEY = 'chatwoot_integration_config';
  private static readonly CHATWOOT_API_TOKEN_KEY = 'chatwoot_api_token';
  private static readonly CHATWOOT_PLATFORM_API_TOKEN_KEY = 'chatwoot_platform_api_token';
  private static readonly CHATWOOT_SYSTEM_BOT_TOKEN_KEY = 'chatwoot_system_bot_token';
  private static readonly CHATWOOT_WEBHOOK_SECRET_KEY = 'chatwoot_webhook_secret';

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationContext: IntegrationContextService,
    private readonly chatwootClient: ChatwootClient,
    private readonly settingsSecrets: SettingsIntegrationSecretsService,
  ) {}

  async getBehaviorSettings() {
    return {
      success: true,
      data: await this.readStoredBehaviorSettings(),
    };
  }

  async getIntegrationSettings() {
    return {
      success: true,
      data: await this.readStoredIntegrationSettings(),
    };
  }

  async setIntegrationSettings(input: ChatwootIntegrationSettingsInput) {
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
        where: { key: SettingsChatwootService.CHATWOOT_CONFIG_KEY },
        update: { value: JSON.stringify(storedConfig) },
        create: {
          key: SettingsChatwootService.CHATWOOT_CONFIG_KEY,
          value: JSON.stringify(storedConfig),
          description: 'Configuracao principal da integracao Chatwoot',
        },
      });

      await this.settingsSecrets.upsertEncryptedOptionalSetting(
        tx,
        SettingsChatwootService.CHATWOOT_API_TOKEN_KEY,
        apiToken,
        'API token principal do Chatwoot',
      );
      await this.settingsSecrets.upsertEncryptedOptionalSetting(
        tx,
        SettingsChatwootService.CHATWOOT_PLATFORM_API_TOKEN_KEY,
        platformApiToken,
        'Platform API token do Chatwoot',
      );
      await this.settingsSecrets.upsertEncryptedOptionalSetting(
        tx,
        SettingsChatwootService.CHATWOOT_WEBHOOK_SECRET_KEY,
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

  async setBehaviorSettings(input: ChatwootBehaviorSettingsInput) {
    const parsed = chatwootBehaviorSettingsSchema.parse(input);
    const normalizedBotToken = parsed.systemMessageApiToken.trim();
    const sanitized = {
      ...parsed,
      systemMessageApiToken: normalizedBotToken,
    };
    const { systemMessageApiToken, ...storedBehavior } = sanitized;

    await this.prisma.$transaction(async (tx) => {
      await tx.systemSetting.upsert({
        where: { key: SettingsChatwootService.CHATWOOT_BEHAVIOR_SETTINGS_KEY },
        update: { value: JSON.stringify(storedBehavior) },
        create: {
          key: SettingsChatwootService.CHATWOOT_BEHAVIOR_SETTINGS_KEY,
          value: JSON.stringify(storedBehavior),
          description: 'Configuracoes operacionais do webhook Chatwoot',
        },
      });

      await this.settingsSecrets.upsertEncryptedOptionalSetting(
        tx,
        SettingsChatwootService.CHATWOOT_SYSTEM_BOT_TOKEN_KEY,
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

  async getDiagnostics() {
    const [defaultContext, activeContexts, chatwootBehavior, chatwootConfig] = await Promise.all([
      this.integrationContext.getDefaultContext(),
      this.integrationContext.listActiveContexts(),
      this.readStoredBehaviorSettings(),
      this.readStoredIntegrationSettings(),
    ]);

    const chatwootDiagnostics = defaultContext
      ? await this.chatwootClient.inspectInboxConfiguration(defaultContext.chatwoot)
      : null;

    return {
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
    };
  }

  private async readStoredBehaviorSettings() {
    const [behaviorSetting, systemBotTokenSetting] = await Promise.all([
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsChatwootService.CHATWOOT_BEHAVIOR_SETTINGS_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsChatwootService.CHATWOOT_SYSTEM_BOT_TOKEN_KEY },
        select: { value: true },
      }),
    ]);

    const fallback = {
      ...DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS,
      systemMessageApiToken: this.settingsSecrets.decryptOptional(systemBotTokenSetting?.value) ?? '',
    };

    if (!behaviorSetting?.value) {
      return fallback;
    }

    try {
      const parsed = JSON.parse(behaviorSetting.value);
      const validation = chatwootBehaviorSettingsSchema.safeParse({
        ...parsed,
        systemMessageApiToken: this.settingsSecrets.decryptOptional(systemBotTokenSetting?.value) ?? '',
      });
      return validation.success ? validation.data : fallback;
    } catch {
      return fallback;
    }
  }

  private async readStoredIntegrationSettings() {
    const [configSetting, apiTokenSetting, platformApiTokenSetting, webhookSecretSetting] = await Promise.all([
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsChatwootService.CHATWOOT_CONFIG_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsChatwootService.CHATWOOT_API_TOKEN_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsChatwootService.CHATWOOT_PLATFORM_API_TOKEN_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsChatwootService.CHATWOOT_WEBHOOK_SECRET_KEY },
        select: { value: true },
      }),
    ]);

    const runtime = readChatwootRuntimeConfig();
    const fallback = {
      ...DEFAULT_CHATWOOT_INTEGRATION_SETTINGS,
      url: runtime.url,
      accountId: runtime.accountId,
      apiToken: this.settingsSecrets.decryptOptional(apiTokenSetting?.value) ?? runtime.apiToken,
      platformApiToken: this.settingsSecrets.decryptOptional(platformApiTokenSetting?.value) ?? runtime.platformApiToken,
      inboxId: runtime.inboxId,
      inboxIdentifier: runtime.inboxIdentifier,
      webhookSecret: this.settingsSecrets.decryptOptional(webhookSecretSetting?.value) ?? runtime.webhookSecret,
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
        apiToken: this.settingsSecrets.decryptOptional(apiTokenSetting?.value) ?? runtime.apiToken,
        platformApiToken: this.settingsSecrets.decryptOptional(platformApiTokenSetting?.value) ?? runtime.platformApiToken,
        webhookSecret: this.settingsSecrets.decryptOptional(webhookSecretSetting?.value) ?? runtime.webhookSecret,
      });
      return validation.success ? validation.data : fallback;
    } catch {
      return fallback;
    }
  }
}
