import { Injectable } from '@nestjs/common';
import { readChatwootRuntimeConfig } from '@dosc-syspro/config';
import {
  DEFAULT_CHATWOOT_INTEGRATION_SETTINGS,
  chatwootIntegrationSettingsSchema,
} from '@dosc-syspro/contracts/chatwoot';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsIntegrationSecretsService } from './settings-integration-secrets.service';

export type StoredChatwootContextSettings = {
  url: string;
  accountId: string;
  apiToken: string;
  platformApiToken: string;
  inboxId: string;
  inboxIdentifier: string;
  webhookSecret: string;
  webhookMaxSkewSeconds: number;
  incomingMediaMode?: 'link' | 'attachment';
  systemBotApiToken: string;
  isStored: boolean;
};

@Injectable()
export class SettingsChatwootConfigStoreService {
  private static readonly CHATWOOT_CONFIG_KEY = 'chatwoot_integration_config';
  private static readonly CHATWOOT_API_TOKEN_KEY = 'chatwoot_api_token';
  private static readonly CHATWOOT_PLATFORM_API_TOKEN_KEY = 'chatwoot_platform_api_token';
  private static readonly CHATWOOT_WEBHOOK_SECRET_KEY = 'chatwoot_webhook_secret';
  private static readonly CHATWOOT_SYSTEM_BOT_TOKEN_KEY = 'chatwoot_system_bot_token';

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsSecrets: SettingsIntegrationSecretsService,
  ) {}

  async readStoredIntegrationSettings(): Promise<StoredChatwootContextSettings> {
    const [configSetting, apiTokenSetting, platformApiTokenSetting, webhookSecretSetting, systemBotTokenSetting] = await Promise.all([
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsChatwootConfigStoreService.CHATWOOT_CONFIG_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsChatwootConfigStoreService.CHATWOOT_API_TOKEN_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsChatwootConfigStoreService.CHATWOOT_PLATFORM_API_TOKEN_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsChatwootConfigStoreService.CHATWOOT_WEBHOOK_SECRET_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsChatwootConfigStoreService.CHATWOOT_SYSTEM_BOT_TOKEN_KEY },
        select: { value: true },
      }),
    ]);

    const runtime = readChatwootRuntimeConfig();
    const fallback: StoredChatwootContextSettings = {
      ...DEFAULT_CHATWOOT_INTEGRATION_SETTINGS,
      url: runtime.url,
      accountId: runtime.accountId,
      apiToken: this.settingsSecrets.decryptOptional(apiTokenSetting?.value) ?? runtime.apiToken,
      platformApiToken: this.settingsSecrets.decryptOptional(platformApiTokenSetting?.value) ?? runtime.platformApiToken,
      inboxId: runtime.inboxId,
      inboxIdentifier: runtime.inboxIdentifier,
      webhookSecret: this.settingsSecrets.decryptOptional(webhookSecretSetting?.value) ?? runtime.webhookSecret,
      webhookMaxSkewSeconds: runtime.webhookMaxSkewSeconds ?? DEFAULT_CHATWOOT_INTEGRATION_SETTINGS.webhookMaxSkewSeconds,
      incomingMediaMode: runtime.incomingMediaMode ?? DEFAULT_CHATWOOT_INTEGRATION_SETTINGS.incomingMediaMode,
      systemBotApiToken: this.settingsSecrets.decryptOptional(systemBotTokenSetting?.value) ?? '',
      isStored: false,
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

      if (!validation.success) {
        return fallback;
      }

      return {
        ...validation.data,
        systemBotApiToken: this.settingsSecrets.decryptOptional(systemBotTokenSetting?.value) ?? '',
        isStored: true,
      };
    } catch {
      return fallback;
    }
  }
}
