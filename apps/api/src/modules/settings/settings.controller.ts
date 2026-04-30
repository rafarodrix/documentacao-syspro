import { Controller, Get, Put, Body, Param, Post, Delete, Query, NotFoundException, Req, Logger, Patch, ForbiddenException } from '@nestjs/common';
import { CompanyStatus, ContractStatus, Role } from '@prisma/client';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationConnectionsService } from './integration-connections.service';
import {
  platformNotificationsResponseSchema,
  type PlatformNotificationItem,
} from '@dosc-syspro/contracts/platform-notifications';
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
import { readChatwootRuntimeConfig, readEvolutionRuntimeConfig, readR2RuntimeConfig } from '@dosc-syspro/config';
import {
  DEFAULT_REMOTE_MODULE_SETTINGS,
  remoteModuleSettingsSchema,
  type RemoteModuleSettingsInput,
} from '@dosc-syspro/contracts/remote';
import {
  buildDefaultInterstateIcmsSettings,
  DEFAULT_COMPANY_INACTIVATION_REASON_OPTIONS,
  DEFAULT_CONTRACT_BLOCK_REASON_OPTIONS,
  interstateIcmsSettingsSchema,
  type InterstateIcmsSettings,
  type SettingsContractsAdminView,
  SETTING_KEYS,
  settingsSchema,
  settingsPreferencesSchema,
  settingsAccessProfileUpsertSchema,
  settingsPermissionsMatrixVisibilityUpdateSchema,
  settingsUserAccessProfileCreateSchema,
  type SettingsInput,
  type SettingsOutput,
} from '@dosc-syspro/contracts/settings';
import {
  batchReadjustContractsSchema,
  createContractSchema,
  contractStatusSchema,
  DEFAULT_CONTRACT_TAX_RATE,
  type ContractStatusValue,
  type UpdateContractOutput,
  updateContractSchema,
} from '@dosc-syspro/contracts/contract';
import {
  DEFAULT_TICKET_MODULE_SETTINGS,
  ticketModuleSettingsSchema,
  type TicketModuleSettings,
} from '@dosc-syspro/contracts/ticket';
import {
  automationModuleSettingsSchema,
  type AutomationModuleSettings,
} from '@dosc-syspro/contracts/automation';
import { sefazRoutesSchema, type SefazRoutesInput } from '@dosc-syspro/contracts/sefaz-routes';
import type { Request } from 'express';
import { SettingsPermissionsService } from './permissions/permissions.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { SettingsSefazMonitorService } from './sefaz-monitor.service';
import { TicketsService } from '../tickets/tickets.service';
import { assertInternalApiKey } from '../../common/auth/internal-api-auth';
import { IntegrationContextService } from './integration-context.service';
import { ChatwootClient } from '../integrations/chatwoot/chatwoot.client';
import { serializeContractBlockReason, type ContractBlockReason } from '@dosc-syspro/core';
import { AutomationSettingsService } from '../automation/automation-settings.service';

@Controller('settings')
export class SettingsController {
  private static readonly EVOLUTION_CONFIG_KEY = 'evolution_config';
  private static readonly EVOLUTION_QRCODE_KEY_PREFIX = 'evolution_qrcode:';
  private static readonly EVOLUTION_STATUS_KEY_PREFIX = 'evolution_status:';
  private static readonly CHATWOOT_BEHAVIOR_SETTINGS_KEY = 'chatwoot_behavior_settings';
  private static readonly CHATWOOT_CONFIG_KEY = 'chatwoot_integration_config';
  private static readonly CHATWOOT_API_TOKEN_KEY = 'chatwoot_api_token';
  private static readonly CHATWOOT_PLATFORM_API_TOKEN_KEY = 'chatwoot_platform_api_token';
  private static readonly CHATWOOT_SYSTEM_BOT_TOKEN_KEY = 'chatwoot_system_bot_token';
  private static readonly CHATWOOT_WEBHOOK_SECRET_KEY = 'chatwoot_webhook_secret';
  private static readonly DEFAULT_GENERAL_SETTINGS: SettingsOutput = {
    minimumWage: 1,
    maintenanceMode: false,
    supportEmail: 'equipe@trilinksoftware.com.br',
    supportPhone: '34997713731',
    rbacMatrixEnabled: true,
    preferences: {
      companyInactivationReasons: DEFAULT_COMPANY_INACTIVATION_REASON_OPTIONS,
      contractBlockReasons: DEFAULT_CONTRACT_BLOCK_REASON_OPTIONS,
    },
  };
  private readonly logger = new Logger(SettingsController.name);
  private static readonly TICKETS_SETTINGS_KEY = AutomationSettingsService.TICKETS_SETTINGS_KEY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationConnections: IntegrationConnectionsService,
    private readonly integrationContext: IntegrationContextService,
    private readonly chatwootClient: ChatwootClient,
    private readonly settingsPermissionsService: SettingsPermissionsService,
    private readonly authorizationService: AuthorizationService,
    private readonly sefazMonitorService: SettingsSefazMonitorService,
    private readonly ticketsService: TicketsService,
    private readonly automationSettingsService: AutomationSettingsService,
  ) {}

  @Get('general')
  async getGeneralSettings(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');

    const settings = await this.prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['minimumWage', 'maintenanceMode', 'supportEmail', 'supportPhone', 'rbacMatrixEnabled', SETTING_KEYS.PREFERENCES],
        },
      },
    });

    const configMap = settings.reduce<Record<string, string>>((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});

    const rawData = {
      minimumWage: configMap.minimumWage,
      maintenanceMode: configMap.maintenanceMode,
      supportEmail: configMap.supportEmail,
      supportPhone: configMap.supportPhone,
      rbacMatrixEnabled: configMap.rbacMatrixEnabled,
      preferences: configMap[SETTING_KEYS.PREFERENCES],
    };

    const normalizedData = this.normalizeGeneralSettings(rawData);
    const validation = settingsSchema.safeParse(normalizedData);
    const data = validation.success ? validation.data : this.buildSafeGeneralSettings(normalizedData);

    if (!validation.success) {
      this.logger.warn(
        `Configuracoes gerais invalidas no banco; aplicando fallback seguro. Campos: ${validation.error.issues
          .map((issue) => issue.path.join('.'))
          .join(', ')}`,
      );
    }

    return { success: true, data };
  }

  private normalizeGeneralSettings(input: {
    minimumWage?: string;
    maintenanceMode?: string;
    supportEmail?: string;
    supportPhone?: string;
    rbacMatrixEnabled?: string;
    preferences?: string;
  }): SettingsOutput {
    const parsedMinimumWage = Number(input.minimumWage);
    const normalizedPhone = this.normalizeDigits(input.supportPhone);
    const normalizedEmail = (input.supportEmail ?? '').trim();

    const parsedPreferences = settingsPreferencesSchema.safeParse(this.parseJsonSetting(input.preferences));

    return {
      minimumWage:
        Number.isFinite(parsedMinimumWage) && parsedMinimumWage >= 1
          ? parsedMinimumWage
          : SettingsController.DEFAULT_GENERAL_SETTINGS.minimumWage,
      maintenanceMode: input.maintenanceMode === 'true',
      supportEmail: normalizedEmail || SettingsController.DEFAULT_GENERAL_SETTINGS.supportEmail,
      supportPhone: normalizedPhone || SettingsController.DEFAULT_GENERAL_SETTINGS.supportPhone,
      rbacMatrixEnabled: input.rbacMatrixEnabled !== 'false',
      preferences: parsedPreferences.success
        ? parsedPreferences.data
        : SettingsController.DEFAULT_GENERAL_SETTINGS.preferences,
    };
  }

  private buildSafeGeneralSettings(input: {
    minimumWage: number;
    maintenanceMode: boolean;
    supportEmail: string;
    supportPhone: string;
    rbacMatrixEnabled: boolean;
    preferences: SettingsOutput["preferences"];
  }): SettingsOutput {
    const supportEmailValidation = settingsSchema.shape.supportEmail.safeParse(input.supportEmail);
    const supportPhoneValidation = settingsSchema.shape.supportPhone.safeParse(this.normalizeDigits(input.supportPhone));

    return {
      minimumWage: Number.isFinite(input.minimumWage) && input.minimumWage >= 1
        ? input.minimumWage
        : SettingsController.DEFAULT_GENERAL_SETTINGS.minimumWage,
      maintenanceMode: input.maintenanceMode,
      supportEmail: supportEmailValidation.success
        ? supportEmailValidation.data
        : SettingsController.DEFAULT_GENERAL_SETTINGS.supportEmail,
      supportPhone: supportPhoneValidation.success
        ? supportPhoneValidation.data
        : SettingsController.DEFAULT_GENERAL_SETTINGS.supportPhone,
      rbacMatrixEnabled: input.rbacMatrixEnabled,
      preferences: settingsPreferencesSchema.safeParse(input.preferences).success
        ? input.preferences
        : SettingsController.DEFAULT_GENERAL_SETTINGS.preferences,
    };
  }

  private normalizeDigits(value?: string): string {
    return (value ?? '').replace(/\D+/g, '');
  }

  private parseJsonSetting(value?: string) {
    if (!value?.trim()) return undefined;
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }

  @Put('general')
  async updateGeneralSettings(@Req() req: Request, @Body() body: SettingsInput) {
    await this.authorizationService.assertPermission(req.headers, 'settings:edit');
    const parsed = settingsSchema.parse(body);

    await this.prisma.$transaction([
      this.prisma.systemSetting.upsert({
        where: { key: 'minimumWage' },
        update: { value: String(parsed.minimumWage) },
        create: { key: 'minimumWage', value: String(parsed.minimumWage), description: 'Salario minimo base' },
      }),
      this.prisma.systemSetting.upsert({
        where: { key: 'maintenanceMode' },
        update: { value: String(parsed.maintenanceMode) },
        create: { key: 'maintenanceMode', value: String(parsed.maintenanceMode), description: 'Modo manutencao' },
      }),
      this.prisma.systemSetting.upsert({
        where: { key: 'supportEmail' },
        update: { value: parsed.supportEmail },
        create: { key: 'supportEmail', value: parsed.supportEmail, description: 'Email de suporte' },
      }),
      this.prisma.systemSetting.upsert({
        where: { key: 'supportPhone' },
        update: { value: parsed.supportPhone },
        create: { key: 'supportPhone', value: parsed.supportPhone, description: 'Telefone de suporte' },
      }),
      this.prisma.systemSetting.upsert({
        where: { key: 'rbacMatrixEnabled' },
        update: { value: String(parsed.rbacMatrixEnabled) },
        create: { key: 'rbacMatrixEnabled', value: String(parsed.rbacMatrixEnabled), description: 'Visibilidade da matriz RBAC' },
      }),
      this.prisma.systemSetting.upsert({
        where: { key: SETTING_KEYS.PREFERENCES },
        update: { value: JSON.stringify(parsed.preferences) },
        create: {
          key: SETTING_KEYS.PREFERENCES,
          value: JSON.stringify(parsed.preferences),
          description: 'Preferencias globais e catalogos centralizados de motivos',
        },
      }),
    ]);

    return { success: true, message: 'Configuracoes salvas.' };
  }

  @Get('sefaz-routes')
  async getSefazRoutes(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:edit');
    const routes = await this.sefazMonitorService.getConfiguredRoutes();
    return { success: true, data: routes };
  }

  @Put('sefaz-routes')
  async updateSefazRoutes(@Req() req: Request, @Body() body: SefazRoutesInput) {
    await this.authorizationService.assertPermission(req.headers, 'settings:edit');
    const parsed = sefazRoutesSchema.parse(body);

    await this.prisma.systemSetting.upsert({
      where: { key: 'sefazRoutes' },
      update: { value: JSON.stringify(parsed) },
      create: {
        key: 'sefazRoutes',
        value: JSON.stringify(parsed),
        description: 'Rotas de monitoramento SEFAZ por UF/servico',
      },
    });

    return { success: true, message: 'Rotas SEFAZ salvas com sucesso.' };
  }

  @Get('tax/interstate-icms')
  async getInterstateIcmsSettings(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');

    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: SETTING_KEYS.INTERSTATE_ICMS },
      select: { value: true },
    });

    if (!setting?.value) {
      return { success: true, data: buildDefaultInterstateIcmsSettings() };
    }

    try {
      const parsed = JSON.parse(setting.value);
      const validation = interstateIcmsSettingsSchema.safeParse(parsed);
      return {
        success: true,
        data: validation.success ? validation.data : buildDefaultInterstateIcmsSettings(),
      };
    } catch {
      return { success: true, data: buildDefaultInterstateIcmsSettings() };
    }
  }

  @Put('tax/interstate-icms')
  async updateInterstateIcmsSettings(@Req() req: Request, @Body() body: InterstateIcmsSettings) {
    await this.authorizationService.assertPermission(req.headers, 'settings:edit');
    const parsed = interstateIcmsSettingsSchema.parse(body);

    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_KEYS.INTERSTATE_ICMS },
      update: { value: JSON.stringify(parsed) },
      create: {
        key: SETTING_KEYS.INTERSTATE_ICMS,
        value: JSON.stringify(parsed),
        description: 'Tabela interestadual de ICMS por origem e destino',
      },
    });

    return { success: true, message: 'Configuracao interestadual salva com sucesso.' };
  }

  @Post('sefaz/check')
  async runSefazCheck(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:edit');
    const result = await this.sefazMonitorService.runFullCheck();
    return {
      success: true,
      count: result.count,
      changedCount: result.changedCount,
      message: `Verificacao concluida (${result.count} rotas, ${result.changedCount} alteracoes).`,
    };
  }

  @Post('sefaz/check/internal')
  async runSefazCheckInternal(@Req() req: Request) {
    const internalApiKeyHeader = Array.isArray(req.headers['x-internal-api-key'])
      ? req.headers['x-internal-api-key'][0]
      : req.headers['x-internal-api-key'];
    assertInternalApiKey(internalApiKeyHeader);
    const result = await this.sefazMonitorService.runFullCheck();
    return { ok: true, ...result };
  }

  @Get('remote/module-settings')
  async getRemoteModuleSettings(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:edit');

    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'remote.module.settings' },
        select: { value: true },
      });

      if (!setting?.value) {
        return { success: true, data: DEFAULT_REMOTE_MODULE_SETTINGS };
      }

      const parsed = JSON.parse(setting.value);
      const validation = remoteModuleSettingsSchema.safeParse(parsed);
      if (!validation.success) {
        return { success: true, data: DEFAULT_REMOTE_MODULE_SETTINGS };
      }

      return { success: true, data: validation.data };
    } catch {
      return { success: true, data: DEFAULT_REMOTE_MODULE_SETTINGS };
    }
  }

  @Get('tickets')
  async getTicketModuleSettings(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');
    return { success: true, data: await this.automationSettingsService.readMergedTicketModuleSettings() };
  }

  @Put('tickets')
  async updateTicketModuleSettings(@Req() req: Request, @Body() body: TicketModuleSettings) {
    await this.authorizationService.assertPermission(req.headers, 'settings:edit');
    const automationSettings = await this.automationSettingsService.readAutomationModuleSettings();
    const parsed = ticketModuleSettingsSchema.parse(
      this.automationSettingsService.mergeAutomationSettingsIntoTicketSettings(body, automationSettings),
    );

    await this.prisma.systemSetting.upsert({
      where: { key: SettingsController.TICKETS_SETTINGS_KEY },
      update: { value: JSON.stringify(parsed) },
      create: {
        key: SettingsController.TICKETS_SETTINGS_KEY,
        value: JSON.stringify(parsed),
        description: 'Configuracoes globais do modulo de tickets',
      },
    });

    return { success: true, message: 'Configuracoes do modulo de tickets salvas.', data: parsed };
  }

  @Get('automations')
  async getAutomationModuleSettings(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');
    const data = await this.automationSettingsService.readAutomationModuleSettings();
    return { success: true, data };
  }

  @Put('automations')
  async updateAutomationModuleSettings(@Req() req: Request, @Body() body: AutomationModuleSettings) {
    await this.authorizationService.assertPermission(req.headers, 'settings:edit');
    const parsed = automationModuleSettingsSchema.parse(body);

    await this.prisma.systemSetting.upsert({
      where: { key: AutomationSettingsService.AUTOMATIONS_SETTINGS_KEY },
      update: { value: JSON.stringify(parsed) },
      create: {
        key: AutomationSettingsService.AUTOMATIONS_SETTINGS_KEY,
        value: JSON.stringify(parsed),
        description: 'Configuracoes globais do modulo de automacoes',
      },
    });

    return { success: true, message: 'Configuracoes do modulo de automacoes salvas.', data: parsed };
  }

  @Put('remote/module-settings')
  async updateRemoteModuleSettings(@Req() req: Request, @Body() body: RemoteModuleSettingsInput) {
    await this.authorizationService.assertPermission(req.headers, 'settings:edit');
    const parsed = remoteModuleSettingsSchema.parse(body);

    await this.prisma.systemSetting.upsert({
      where: { key: 'remote.module.settings' },
      update: { value: JSON.stringify(parsed) },
      create: {
        key: 'remote.module.settings',
        value: JSON.stringify(parsed),
        description: 'Configuracoes globais do modulo remoto',
      },
    });

    return { success: true, message: 'Configuracoes do modulo remoto salvas.', data: parsed };
  }

  @Get('evolution')
  async getEvolutionSettings() {
    return { success: true, settings: await this.readStoredEvolutionSettings() };
  }

  @Put('evolution')
  async setEvolutionSettings(@Body() input: EvolutionSettingsInput) {
    const parsed = evolutionSettingsSchema.parse(input);
    const setting = await this.prisma.systemSetting.upsert({
      where: { key: SettingsController.EVOLUTION_CONFIG_KEY },
      update: { value: JSON.stringify(parsed) },
      create: {
        key: SettingsController.EVOLUTION_CONFIG_KEY,
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

  @Get('evolution/status')
  async getEvolutionInstanceStatus(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');

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

  @Post('evolution/qrcode')
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

  @Get('evolution/diagnostics')
  async getEvolutionDiagnostics(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');

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

  @Get('chatwoot/behavior')
  async getChatwootBehaviorSettings(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');
    return {
      success: true,
      data: await this.readStoredChatwootBehaviorSettings(),
    };
  }

  @Get('chatwoot/config')
  async getChatwootIntegrationSettings(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');
    return {
      success: true,
      data: await this.readStoredChatwootIntegrationSettings(),
    };
  }

  @Put('chatwoot/config')
  async setChatwootIntegrationSettings(@Req() req: Request, @Body() input: ChatwootIntegrationSettingsInput) {
    await this.authorizationService.assertPermission(req.headers, 'settings:edit');
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
        where: { key: SettingsController.CHATWOOT_CONFIG_KEY },
        update: { value: JSON.stringify(storedConfig) },
        create: {
          key: SettingsController.CHATWOOT_CONFIG_KEY,
          value: JSON.stringify(storedConfig),
          description: 'Configuracao principal da integracao Chatwoot',
        },
      });

      await this.upsertEncryptedOptionalSetting(tx, SettingsController.CHATWOOT_API_TOKEN_KEY, apiToken, 'API token principal do Chatwoot');
      await this.upsertEncryptedOptionalSetting(
        tx,
        SettingsController.CHATWOOT_PLATFORM_API_TOKEN_KEY,
        platformApiToken,
        'Platform API token do Chatwoot',
      );
      await this.upsertEncryptedOptionalSetting(
        tx,
        SettingsController.CHATWOOT_WEBHOOK_SECRET_KEY,
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

  @Put('chatwoot/behavior')
  async setChatwootBehaviorSettings(@Req() req: Request, @Body() input: ChatwootBehaviorSettingsInput) {
    await this.authorizationService.assertPermission(req.headers, 'settings:edit');
    const parsed = chatwootBehaviorSettingsSchema.parse(input);
    const normalizedBotToken = parsed.systemMessageApiToken.trim();
    const sanitized = {
      ...parsed,
      systemMessageApiToken: normalizedBotToken,
    };
    const { systemMessageApiToken, ...storedBehavior } = sanitized;

    await this.prisma.$transaction(async (tx) => {
      await tx.systemSetting.upsert({
        where: { key: SettingsController.CHATWOOT_BEHAVIOR_SETTINGS_KEY },
        update: { value: JSON.stringify(storedBehavior) },
        create: {
          key: SettingsController.CHATWOOT_BEHAVIOR_SETTINGS_KEY,
          value: JSON.stringify(storedBehavior),
          description: 'Configuracoes operacionais do webhook Chatwoot',
        },
      });

      if (systemMessageApiToken) {
        await tx.systemSetting.upsert({
          where: { key: SettingsController.CHATWOOT_SYSTEM_BOT_TOKEN_KEY },
          update: { value: this.encrypt(systemMessageApiToken) },
          create: {
            key: SettingsController.CHATWOOT_SYSTEM_BOT_TOKEN_KEY,
            value: this.encrypt(systemMessageApiToken),
            description: 'Token criptografado da identidade tecnica do Chatwoot',
          },
        });
      } else {
        await tx.systemSetting.deleteMany({
          where: { key: SettingsController.CHATWOOT_SYSTEM_BOT_TOKEN_KEY },
        });
      }
    });

    return {
      success: true,
      data: sanitized,
      message: 'Configuracoes do Chatwoot salvas.',
    };
  }

  @Get('integrations/diagnostics')
  async getIntegrationDiagnostics(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');

    const [defaultContext, activeContexts, chatwootBehavior, chatwootConfig] = await Promise.all([
      this.integrationContext.getDefaultContext(),
      this.integrationContext.listActiveContexts(),
      this.readStoredChatwootBehaviorSettings(),
      this.readStoredChatwootIntegrationSettings(),
    ]);

    const r2Runtime = readR2RuntimeConfig();
    const chatwootDiagnostics = defaultContext
      ? await this.chatwootClient.inspectInboxConfiguration(defaultContext.chatwoot)
      : null;

    const r2Configured = Boolean(
      r2Runtime.endpoint &&
      r2Runtime.accessKeyId &&
      r2Runtime.secretAccessKey &&
      r2Runtime.bucketName,
    );
    const r2Issues: string[] = [];
    if (!r2Runtime.endpoint) r2Issues.push('R2_ENDPOINT ausente no runtime.');
    if (!r2Runtime.accessKeyId) r2Issues.push('R2_ACCESS_KEY_ID ausente no runtime.');
    if (!r2Runtime.secretAccessKey) r2Issues.push('R2_SECRET_ACCESS_KEY ausente no runtime.');
    if (!r2Runtime.bucketName) r2Issues.push('R2_BUCKET_NAME ausente no runtime.');
    if (r2Configured && !r2Runtime.publicBaseUrl) {
      r2Issues.push('R2_PUBLIC_BASE_URL ausente; anexos usarao URLs assinadas temporarias.');
    }

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
        provider: 'Cloudflare R2',
        configured: r2Configured,
        mode: r2Runtime.publicBaseUrl ? 'public_base_url' : 'signed_url',
        endpointHost: this.safeUrlHost(r2Runtime.endpoint),
        bucketName: r2Runtime.bucketName || null,
        publicBaseUrl: r2Runtime.publicBaseUrl || null,
        signedUrlTtlSeconds: r2Runtime.signedUrlTtlSeconds,
        hasAccessKeyId: Boolean(r2Runtime.accessKeyId),
        hasSecretAccessKey: Boolean(r2Runtime.secretAccessKey),
        issues: r2Issues,
      },
    };
  }

  @Get('integrations/connections')
  async listIntegrationConnections(@Query('companyId') companyId?: string) {
    const rows = await this.integrationConnections.list(companyId?.trim() || undefined);
    return { success: true, data: rows };
  }

  @Get('integrations/connections/:id')
  async getIntegrationConnection(@Param('id') id: string) {
    const row = await this.integrationConnections.getById(id);
    if (!row) throw new NotFoundException('Integracao nao encontrada');
    return { success: true, data: row };
  }

  @Post('integrations/connections')
  async createIntegrationConnection(@Body() body: any) {
    const created = await this.integrationConnections.create(body);
    return { success: true, data: created };
  }

  @Put('integrations/connections/:id')
  async updateIntegrationConnection(@Param('id') id: string, @Body() body: any) {
    const updated = await this.integrationConnections.update(id, body);
    if (!updated) throw new NotFoundException('Integracao nao encontrada');
    return { success: true, data: updated };
  }

  @Delete('integrations/connections/:id')
  async deleteIntegrationConnection(@Param('id') id: string) {
    await this.integrationConnections.remove(id);
    return { success: true };
  }

  @Post('integrations/connections/:id/test')
  async testIntegrationConnection(@Param('id') id: string) {
    const result = await this.integrationConnections.test(id);
    if (!result) throw new NotFoundException('Integracao nao encontrada');
    return { success: true, data: result };
  }

  @Get('permissions')
  async getPermissionsCatalog(@Req() req: Request) {
    return this.settingsPermissionsService.getCatalog(req.headers);
  }

  @Get('permissions/admin-view')
  async getPermissionsAdminView(@Req() req: Request) {
    return this.settingsPermissionsService.getAdminView(req.headers);
  }

  @Put('permissions/matrix-visibility')
  async updatePermissionsMatrixVisibility(@Req() req: Request, @Body() body: { enabled?: boolean }) {
    const parsed = settingsPermissionsMatrixVisibilityUpdateSchema.parse(body);
    return this.settingsPermissionsService.updateMatrixVisibility(parsed.enabled, req.headers);
  }

  @Post('permissions/profiles')
  async savePermissionsProfile(@Req() req: Request, @Body() body: unknown) {
    const parsed = settingsAccessProfileUpsertSchema.parse(body);
    return this.settingsPermissionsService.saveProfile(parsed, req.headers);
  }

  @Post('permissions/assignments')
  async assignPermissionsProfile(@Req() req: Request, @Body() body: unknown) {
    const parsed = settingsUserAccessProfileCreateSchema.parse(body);
    return this.settingsPermissionsService.assignProfile(parsed, req.headers);
  }

  @Delete('permissions/assignments/:id')
  async removePermissionsAssignment(@Req() req: Request, @Param('id') id: string) {
    return this.settingsPermissionsService.removeAssignment(id, req.headers);
  }

  @Get('authorization/context')
  async getAuthorizationContext(@Req() req: Request) {
    const data = await this.authorizationService.getCurrentAuthorizationContext(req.headers);
    return { success: true, data };
  }

  @Get('contracts/system-params')
  async getContractSystemParams(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'contracts:view');

    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: SETTING_KEYS.MIN_WAGE },
      select: { value: true },
    });

    return {
      success: true,
      data: {
        minimumWage: setting?.value ? Number(setting.value) : 1412,
      },
    };
  }

  @Get('contracts/admin-view')
  async getContractsAdminView(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'contracts:view');

    const [contracts, companies] = await Promise.all([
      this.prisma.contract.findMany({
        select: {
          id: true,
          companyId: true,
          percentage: true,
          minimumWage: true,
          taxRate: true,
          programmerRate: true,
          contractNumber: true,
          notes: true,
          status: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true,
          company: {
            select: {
              id: true,
              razaoSocial: true,
              cnpj: true,
            },
          },
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.company.findMany({
        where: { deletedAt: null, status: { not: CompanyStatus.INACTIVE } },
        orderBy: { razaoSocial: 'asc' },
        select: { id: true, razaoSocial: true, cnpj: true },
      }),
    ]);

    const data: SettingsContractsAdminView = {
      contracts: contracts.map((contract) => ({
        id: contract.id,
        companyId: contract.companyId,
        percentage: Number(contract.percentage),
        minimumWage: Number(contract.minimumWage),
        taxRate: Number(contract.taxRate),
        programmerRate: Number(contract.programmerRate),
        contractNumber: contract.contractNumber,
        notes: contract.notes,
        status: contract.status,
        startDate: contract.startDate.toISOString(),
        endDate: contract.endDate?.toISOString() ?? null,
        createdAt: contract.createdAt.toISOString(),
        updatedAt: contract.updatedAt.toISOString(),
        company: contract.company,
      })),
      companies,
    };

    return { success: true, data };
  }

  @Get('contracts/:id/suspend-impact')
  async getContractSuspendImpact(@Req() req: Request, @Param('id') id: string) {
    await this.authorizationService.assertPermission(req.headers, 'contracts:view');

    const contract = await this.prisma.contract.findUnique({
      where: { id },
      select: {
        id: true,
        companyId: true,
        company: {
          select: {
            razaoSocial: true,
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrato nao encontrado.');
    }

    const [activeContracts, totalLinkedUsers, blockedUsersCount] = await Promise.all([
      this.prisma.contract.count({
        where: {
          companyId: contract.companyId,
          status: ContractStatus.ACTIVE,
          id: { not: id },
        },
      }),
      this.prisma.membership.count({
        where: { companyId: contract.companyId },
      }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          role: { in: [Role.CLIENTE_ADMIN, Role.CLIENTE_USER] },
          memberships: { some: { companyId: contract.companyId } },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        companyName: contract.company.razaoSocial,
        willBlockCompany: activeContracts === 0,
        blockedUsersCount,
        totalLinkedUsers,
      },
    };
  }

  @Post('contracts')
  async createContract(@Req() req: Request, @Body() body: unknown) {
    await this.assertContractsWriteAccess(req.headers);
    const parsed = createContractSchema.parse(body);

    const company = await this.prisma.company.findUnique({
      where: { id: parsed.companyId },
      select: { cnpj: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa nao encontrada.');
    }

    await this.prisma.contract.create({
      data: {
        companyId: parsed.companyId,
        percentage: parsed.percentage,
        minimumWage: parsed.minimumWage,
        taxRate: parsed.allowTaxOverride ? parsed.taxRate : DEFAULT_CONTRACT_TAX_RATE,
        programmerRate: parsed.programmerRate,
        status: parsed.status,
        startDate: parsed.startDate ? new Date(parsed.startDate) : new Date(),
        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
        contractNumber: company.cnpj,
        notes: parsed.notes?.trim() || null,
      },
    });

    await this.prisma.company.update({
      where: { id: parsed.companyId },
      data: { status: CompanyStatus.ACTIVE, deletedAt: null, observacoes: null },
    });

    await this.prisma.user.updateMany({
      where: {
        deletedAt: null,
        role: { in: [Role.CLIENTE_ADMIN, Role.CLIENTE_USER] },
        memberships: { some: { companyId: parsed.companyId } },
      },
      data: { isActive: true },
    });

    return { success: true, message: 'Contrato criado com sucesso!' };
  }

  @Put('contracts/:id')
  async updateContract(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    await this.assertContractsWriteAccess(req.headers);
    const parsed = updateContractSchema.parse({ ...(body as object), id }) as UpdateContractOutput;

    const company = await this.prisma.company.findUnique({
      where: { id: parsed.companyId },
      select: { cnpj: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa nao encontrada.');
    }

    await this.prisma.contract.update({
      where: { id: parsed.id },
      data: {
        percentage: parsed.percentage,
        minimumWage: parsed.minimumWage,
        taxRate: parsed.allowTaxOverride ? parsed.taxRate : DEFAULT_CONTRACT_TAX_RATE,
        programmerRate: parsed.programmerRate,
        status: parsed.status,
        startDate: parsed.startDate ? new Date(parsed.startDate) : undefined,
        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
        contractNumber: company.cnpj,
        notes: parsed.notes?.trim() || null,
      },
    });

    return { success: true, message: 'Contrato atualizado com sucesso.' };
  }

  @Post('contracts/batch-readjust')
  async batchReadjustContracts(@Req() req: Request, @Body() body: unknown) {
    await this.assertContractsWriteAccess(req.headers);
    const parsed = batchReadjustContractsSchema.parse(body);

    const activeContractIds = await this.prisma.contract.findMany({
      where: { status: ContractStatus.ACTIVE },
      select: { id: true },
    });

    let affected = 0;
    for (let i = 0; i < activeContractIds.length; i += 50) {
      const chunkIds = activeContractIds.slice(i, i + 50).map((item) => item.id);
      if (!chunkIds.length) continue;

      const result = await this.prisma.contract.updateMany({
        where: {
          id: { in: chunkIds },
          status: ContractStatus.ACTIVE,
        },
        data: {
          minimumWage: parsed.minimumWage,
          updatedAt: new Date(),
        },
      });

      affected += result.count;
    }

    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_KEYS.MIN_WAGE },
      update: { value: String(parsed.minimumWage) },
      create: {
        key: SETTING_KEYS.MIN_WAGE,
        value: String(parsed.minimumWage),
        description: 'Salario minimo base',
      },
    });

    return { success: true, data: { affected } };
  }

  @Patch('contracts/:id/status')
  async updateContractStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { status?: ContractStatusValue; reason?: ContractBlockReason | null; details?: string | null },
  ) {
    await this.assertContractsWriteAccess(req.headers);
    const parsedStatus = contractStatusSchema.safeParse(body?.status);
    if (!parsedStatus.success) {
      throw new ForbiddenException('Status do contrato invalido.');
    }

    const contract = await this.prisma.contract.findUnique({
      where: { id },
      select: { id: true, companyId: true },
    });

    if (!contract) {
      throw new NotFoundException('Contrato nao encontrado.');
    }

    const isDeactivating = parsedStatus.data !== 'ACTIVE';

    await this.prisma.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id },
        data: { status: parsedStatus.data },
      });

      const activeContracts = await tx.contract.count({
        where: {
          companyId: contract.companyId,
          status: ContractStatus.ACTIVE,
          id: { not: id },
        },
      });

      if (isDeactivating && activeContracts === 0) {
        const blockReason = body?.reason ? serializeContractBlockReason(body.reason, body.details ?? undefined) : null;

        await tx.company.update({
          where: { id: contract.companyId },
          data: {
            status: CompanyStatus.SUSPENDED,
            observacoes: blockReason,
          },
        });

        await tx.user.updateMany({
          where: {
            deletedAt: null,
            role: { in: [Role.CLIENTE_ADMIN, Role.CLIENTE_USER] },
            memberships: { some: { companyId: contract.companyId } },
          },
          data: { isActive: false },
        });
      }

      if (!isDeactivating) {
        await tx.company.update({
          where: { id: contract.companyId },
          data: {
            status: CompanyStatus.ACTIVE,
            deletedAt: null,
            observacoes: null,
          },
        });

        await tx.user.updateMany({
          where: {
            deletedAt: null,
            role: { in: [Role.CLIENTE_ADMIN, Role.CLIENTE_USER] },
            memberships: { some: { companyId: contract.companyId } },
          },
          data: { isActive: true },
        });
      }
    });

    return { success: true, message: 'Status do contrato atualizado.' };
  }

  @Get('remote/admin-view')
  async getRemoteAdminView(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');
    const requester = await this.authorizationService.getRequester(req.headers);
    const companyScope = await this.authorizationService.resolveCompanyAccessScope(
      requester,
      'companies:view_own',
      'companies:view_all',
    );

    const companies = await this.prisma.company.findMany({
      where: companyScope.isGlobal
        ? { deletedAt: null }
        : { deletedAt: null, id: { in: companyScope.companyIds.length ? companyScope.companyIds : ['__none__'] } },
      select: {
        id: true,
        nomeFantasia: true,
        razaoSocial: true,
      },
      orderBy: [{ nomeFantasia: 'asc' }, { razaoSocial: 'asc' }],
      take: 200,
    });

    return {
      success: true,
      data: {
        companyOptions: companies.map((company) => ({
          id: company.id,
          label: company.nomeFantasia?.trim() || company.razaoSocial,
        })),
      },
    };
  }

  @Get('platform-notifications')
  async getPlatformNotifications(@Req() req: Request) {
    const requester = await this.authorizationService.getRequester(req.headers);
    const systemUser = await this.authorizationService.userHasPermission(requester, 'tools:all');
    const includeContracts = await this.authorizationService.userHasPermission(requester, 'settings:edit');
    const ticketsResponse = await this.ticketsService.findAll(
      { page: '1', pageSize: '50' },
      req.headers,
    );

    const items = this.sortNotifications([
      ...(ticketsResponse.success ? this.buildTicketNotifications(ticketsResponse.data ?? []) : []),
      ...(systemUser ? await this.buildSystemOperationalNotifications(includeContracts) : []),
    ]).slice(0, 12);

    return platformNotificationsResponseSchema.parse({
      items,
      unreadCount: items.filter((item) => item.level !== 'info').length,
      generatedAt: new Date().toISOString(),
    });
  }

  @Get(':key')
  async getSetting(@Param('key') key: string) {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    return { value: setting?.value || '' };
  }

  @Put(':key')
  async setSetting(@Param('key') key: string, @Body('value') value: string) {
    const setting = await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value, description: 'Configuracao Global' },
    });
    return { success: true, value: setting.value };
  }

  private minutesBetween(now: Date, dateLike: string | Date) {
    const date = new Date(dateLike);
    return Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
  }

  private buildTicketNotifications(tickets: Array<{ id: string; status: string; priority: string; updatedAt: string; ticketNumber: string | null; subject: string | null }>): PlatformNotificationItem[] {
    const now = new Date();
    const items: PlatformNotificationItem[] = [];

    for (const ticket of tickets) {
      const status = String(ticket.status || '').toUpperCase();
      if (status === 'RESOLVED' || status === 'ARCHIVED') continue;

      const mins = this.minutesBetween(now, ticket.updatedAt);
      const hours = Math.max(1, Math.floor(mins / 60));
      const href = `/portal/tickets/${ticket.id}`;
      const number = ticket.ticketNumber || String(ticket.id);
      const title = ticket.subject || 'Sem assunto';

      if ((ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL') && mins >= 240) {
        items.push({
          id: `ticket-high-${ticket.id}`,
          level: 'critical',
          title: 'Chamado critico sem resposta',
          description: `#${number} ${title} sem atualizacao ha ${hours}h.`,
          href,
          createdAt: ticket.updatedAt,
        });
        continue;
      }

      if (mins >= 1440) {
        items.push({
          id: `ticket-stale-${ticket.id}`,
          level: 'warning',
          title: 'Chamado parado ha mais de 24h',
          description: `#${number} ${title} sem atualizacao ha ${hours}h.`,
          href,
          createdAt: ticket.updatedAt,
        });
        continue;
      }

      if (mins <= 30) {
        items.push({
          id: `ticket-recent-${ticket.id}`,
          level: 'info',
          title: 'Chamado atualizado recentemente',
          description: `#${number} ${title} atualizado nos ultimos ${Math.max(1, mins)} min.`,
          href,
          createdAt: ticket.updatedAt,
        });
      }
    }

    return items;
  }

  private async buildSystemOperationalNotifications(includeContracts: boolean): Promise<PlatformNotificationItem[]> {
    const now = new Date();
    const in30Days = new Date(now);
    in30Days.setDate(now.getDate() + 30);

    const [contracts, sefazRecords, evolutionStatusRows] = await Promise.all([
      includeContracts
        ? this.prisma.contract.findMany({
            where: {
              status: 'ACTIVE',
              endDate: { not: null, lte: in30Days },
            },
            include: { company: { select: { razaoSocial: true } } },
            orderBy: { endDate: 'asc' },
            take: 8,
          })
        : Promise.resolve([]),
      this.prisma.sefazStatusCurrent.findMany({
        where: { uf: 'MG' },
        orderBy: { checkedAt: 'desc' },
        distinct: ['service'],
        take: 2,
      }),
      this.prisma.systemSetting.findMany({
        where: {
          key: { startsWith: SettingsController.EVOLUTION_STATUS_KEY_PREFIX },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
    ]);

    const items: PlatformNotificationItem[] = [];

    for (const contract of contracts) {
      if (!contract.endDate) continue;
      const isExpired = contract.endDate < now;
      const days = Math.ceil((contract.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      items.push({
        id: `contract-${contract.id}`,
        level: isExpired ? 'critical' : 'warning',
        title: isExpired ? 'Contrato vencido' : 'Contrato proximo do vencimento',
        description: isExpired
          ? `${contract.company.razaoSocial} com contrato vencido.`
          : `${contract.company.razaoSocial} vence em ${days} dia(s).`,
        href: '/portal/contratos',
        createdAt: contract.updatedAt.toISOString(),
      });
    }

    for (const sefaz of sefazRecords) {
      if (sefaz.status === 'ONLINE') continue;
      items.push({
        id: `sefaz-${sefaz.service}-${sefaz.id}`,
        level: sefaz.status === 'OFFLINE' ? 'critical' : 'warning',
        title: `SEFAZ ${sefaz.service} ${sefaz.status === 'OFFLINE' ? 'indisponivel' : 'instavel'}`,
        description: `UF ${sefaz.uf} com latencia ${sefaz.latency}ms.`,
        href: '/portal',
        createdAt: sefaz.checkedAt.toISOString(),
      });
    }

    for (const row of evolutionStatusRows) {
      const status = this.parseEvolutionStatusNotification(row.value, row.updatedAt);
      if (!status || (status.status !== 'LOGGED_OUT' && status.status !== 'QR_TIMEOUT')) continue;

      items.push({
        id: `evolution-${row.key}`,
        level: status.status === 'LOGGED_OUT' ? 'critical' : 'warning',
        title: status.status === 'LOGGED_OUT' ? 'Evolution desconectada' : 'QR Code da Evolution expirado',
        description: `${status.instanceLabel} - ultimo evento: ${status.eventLabel}.`,
        href: '/portal/configuracoes?tab=integrations',
        createdAt: status.receivedAt,
      });
    }

    return items;
  }

  private parseEvolutionStatusNotification(value: string, updatedAt: Date): {
    status: string;
    eventLabel: string;
    instanceLabel: string;
    receivedAt: string;
  } | null {
    try {
      const parsed = JSON.parse(value);
      const status = String(parsed?.status ?? '').trim().toUpperCase();
      if (!status) return null;

      return {
        status,
        eventLabel: String(parsed?.event ?? status).trim() || status,
        instanceLabel: String(parsed?.instanceId ?? 'Instancia Evolution').trim() || 'Instancia Evolution',
        receivedAt: String(parsed?.receivedAt ?? '').trim() || updatedAt.toISOString(),
      };
    } catch {
      return null;
    }
  }

  private sortNotifications(items: PlatformNotificationItem[]) {
    const levelWeight = {
      critical: 3,
      warning: 2,
      info: 1,
    } as const;

    return [...items].sort((a, b) => {
      const levelDiff = levelWeight[b.level] - levelWeight[a.level];
      if (levelDiff !== 0) return levelDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  private safeUrlHost(value: string | null | undefined) {
    if (!value) return null;
    try {
      return new URL(value).host;
    } catch {
      return value;
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

    const subscribe = this.withRequiredEvolutionSubscribe(input.subscribe);
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
    }).catch((error: any) => ({ ok: false, status: 0, json: async () => ({}), text: async () => error?.message ?? 'network_error' }) as Response);

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

  private withRequiredEvolutionSubscribe(values?: string[]) {
    const current = new Set((values?.length ? values : ['MESSAGE']).map((value) => String(value).trim()).filter(Boolean));
    if (current.has('ALL')) return ['ALL'];
    current.add('MESSAGE');
    current.add('QRCODE');
    current.add('CONNECTION');
    return Array.from(current);
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
      where: { key: `${SettingsController.EVOLUTION_QRCODE_KEY_PREFIX}${instanceId}` },
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
      where: { key: `${SettingsController.EVOLUTION_STATUS_KEY_PREFIX}${input.instanceId}` },
      update: { value: JSON.stringify(payload) },
      create: {
        key: `${SettingsController.EVOLUTION_STATUS_KEY_PREFIX}${input.instanceId}`,
        value: JSON.stringify(payload),
        description: 'Ultimo status operacional recebido da Evolution Go',
      },
    });
  }

  private async readStoredEvolutionStatus(instanceId: string) {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: `${SettingsController.EVOLUTION_STATUS_KEY_PREFIX}${instanceId}` },
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

  private async assertContractsWriteAccess(rawHeaders: Request['headers']) {
    await this.authorizationService.assertPermission(rawHeaders, 'contracts:edit');
    const requester = await this.authorizationService.getRequester(rawHeaders);
    if (requester.role !== Role.ADMIN) {
      throw new ForbiddenException('Permissao negada.');
    }
  }

  private async readStoredChatwootBehaviorSettings() {
    const [behaviorSetting, systemBotTokenSetting] = await Promise.all([
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsController.CHATWOOT_BEHAVIOR_SETTINGS_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsController.CHATWOOT_SYSTEM_BOT_TOKEN_KEY },
        select: { value: true },
      }),
    ]);

    const fallback = {
      ...DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS,
      systemMessageApiToken: systemBotTokenSetting?.value ? this.decryptOptional(systemBotTokenSetting.value) ?? "" : "",
    };

    if (!behaviorSetting?.value) {
      return fallback;
    }

    try {
      const parsed = JSON.parse(behaviorSetting.value);
      const validation = chatwootBehaviorSettingsSchema.safeParse({
        ...parsed,
        systemMessageApiToken: systemBotTokenSetting?.value ? this.decryptOptional(systemBotTokenSetting.value) ?? "" : "",
      });
      return validation.success ? validation.data : fallback;
    } catch {
      return fallback;
    }
  }

  private async readStoredChatwootIntegrationSettings() {
    const [configSetting, apiTokenSetting, platformApiTokenSetting, webhookSecretSetting] = await Promise.all([
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsController.CHATWOOT_CONFIG_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsController.CHATWOOT_API_TOKEN_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsController.CHATWOOT_PLATFORM_API_TOKEN_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: SettingsController.CHATWOOT_WEBHOOK_SECRET_KEY },
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

  private async upsertEncryptedOptionalSetting(
    tx: any,
    key: string,
    value: string,
    description: string,
  ) {
    if (value) {
      await tx.systemSetting.upsert({
        where: { key },
        update: { value: this.encrypt(value) },
        create: {
          key,
          value: this.encrypt(value),
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
      where: { key: SettingsController.EVOLUTION_CONFIG_KEY },
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
}
