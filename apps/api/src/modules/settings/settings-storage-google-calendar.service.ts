import { Injectable } from '@nestjs/common';
import {
  DEFAULT_GOOGLE_CALENDAR_SETTINGS,
  googleCalendarSettingsSchema,
  storageR2SettingsSchema,
  type GoogleCalendarSettingsInput,
  type StorageR2SettingsInput,
} from '@dosc-syspro/contracts/settings';
import { PrismaService } from '../../prisma/prisma.service';
import { R2StorageService } from '../integrations/storage/r2-storage.service';
import { SettingsIntegrationSecretsService } from './settings-integration-secrets.service';

@Injectable()
export class SettingsStorageGoogleCalendarService {
  private static readonly GOOGLE_CALENDAR_CONFIG_KEY = 'google_calendar_config';
  private static readonly GOOGLE_CALENDAR_CLIENT_SECRET_KEY = 'google_calendar_client_secret';
  private static readonly GOOGLE_CALENDAR_REFRESH_TOKEN_KEY = 'google_calendar_refresh_token';
  private static readonly STORAGE_CONFIG_KEY = R2StorageService.STORAGE_CONFIG_KEY;
  private static readonly STORAGE_ACCESS_KEY_ID_KEY = R2StorageService.STORAGE_ACCESS_KEY_ID_KEY;
  private static readonly STORAGE_SECRET_ACCESS_KEY_KEY = R2StorageService.STORAGE_SECRET_ACCESS_KEY_KEY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2StorageService: R2StorageService,
    private readonly settingsSecrets: SettingsIntegrationSecretsService,
  ) {}

  async getStorageConfig() {
    return {
      success: true,
      data: await this.r2StorageService.readStoredSettings(),
    };
  }

  async getStorageDiagnostics() {
    return this.r2StorageService.getDiagnostics();
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
        where: { key: SettingsStorageGoogleCalendarService.STORAGE_CONFIG_KEY },
        update: { value: JSON.stringify(storedConfig) },
        create: {
          key: SettingsStorageGoogleCalendarService.STORAGE_CONFIG_KEY,
          value: JSON.stringify(storedConfig),
          description: 'Configuracao principal do storage R2 por modulo',
        },
      });

      await this.settingsSecrets.upsertEncryptedOptionalSetting(
        tx,
        SettingsStorageGoogleCalendarService.STORAGE_ACCESS_KEY_ID_KEY,
        accessKeyId,
        'Access Key ID do Cloudflare R2',
      );
      await this.settingsSecrets.upsertEncryptedOptionalSetting(
        tx,
        SettingsStorageGoogleCalendarService.STORAGE_SECRET_ACCESS_KEY_KEY,
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
        where: { key: SettingsStorageGoogleCalendarService.GOOGLE_CALENDAR_CONFIG_KEY },
        update: { value: JSON.stringify(storedConfig) },
        create: {
          key: SettingsStorageGoogleCalendarService.GOOGLE_CALENDAR_CONFIG_KEY,
          value: JSON.stringify(storedConfig),
          description: 'Configuracao principal da integracao Google Agenda',
        },
      });

      await this.settingsSecrets.upsertEncryptedOptionalSetting(
        tx,
        SettingsStorageGoogleCalendarService.GOOGLE_CALENDAR_CLIENT_SECRET_KEY,
        clientSecret,
        'Client Secret da integracao Google Agenda',
      );
      await this.settingsSecrets.upsertEncryptedOptionalSetting(
        tx,
        SettingsStorageGoogleCalendarService.GOOGLE_CALENDAR_REFRESH_TOKEN_KEY,
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

  private async readStoredGoogleCalendarSettings() {
    const [configSetting, clientSecretSetting, refreshTokenSetting] = await Promise.all([
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsStorageGoogleCalendarService.GOOGLE_CALENDAR_CONFIG_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsStorageGoogleCalendarService.GOOGLE_CALENDAR_CLIENT_SECRET_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsStorageGoogleCalendarService.GOOGLE_CALENDAR_REFRESH_TOKEN_KEY },
        select: { value: true },
      }),
    ]);

    const fallback = {
      ...DEFAULT_GOOGLE_CALENDAR_SETTINGS,
      clientSecret: this.settingsSecrets.decryptOptional(clientSecretSetting?.value) ?? '',
      refreshToken: this.settingsSecrets.decryptOptional(refreshTokenSetting?.value) ?? '',
    };

    if (!configSetting?.value) {
      return fallback;
    }

    try {
      const parsed = JSON.parse(configSetting.value);
      const validation = googleCalendarSettingsSchema.safeParse({
        ...parsed,
        clientSecret: this.settingsSecrets.decryptOptional(clientSecretSetting?.value) ?? '',
        refreshToken: this.settingsSecrets.decryptOptional(refreshTokenSetting?.value) ?? '',
      });
      return validation.success ? validation.data : fallback;
    } catch {
      return fallback;
    }
  }
}
