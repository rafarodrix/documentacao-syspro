import { Controller, Get, Put, Body, Param, Post, Delete, Query, NotFoundException, Req, Logger } from '@nestjs/common';
import { CompanyStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationConnectionsService } from './integration-connections.service';
import {
  DEFAULT_EVOLUTION_SETTINGS,
  evolutionSettingsSchema,
  DEFAULT_REMOTE_MODULE_SETTINGS,
  platformNotificationsResponseSchema,
  remoteModuleSettingsSchema,
  type SettingsContractsAdminView,
  type PlatformNotificationItem,
  type RemoteModuleSettingsInput,
  settingsSchema,
  sefazRoutesSchema,
  settingsAccessProfileUpsertSchema,
  settingsPermissionsMatrixVisibilityUpdateSchema,
  settingsUserAccessProfileCreateSchema,
  type EvolutionSettingsInput,
  type SettingsInput,
  type SettingsOutput,
  type SefazRoutesInput,
} from '@dosc-syspro/contracts';
import type { Request } from 'express';
import { SettingsPermissionsService } from './permissions/permissions.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { SettingsSefazMonitorService } from './sefaz-monitor.service';
import { TicketsService } from '../tickets/tickets.service';
import { assertInternalApiKey } from '../../common/auth/internal-api-auth';

@Controller('settings')
export class SettingsController {
  private static readonly EVOLUTION_CONFIG_KEY = 'evolution_config';
  private static readonly LEGACY_EVOLUTION_CONFIG_KEY = 'whatsapp_evolution_config';
  private static readonly DEFAULT_GENERAL_SETTINGS: SettingsOutput = {
    minimumWage: 1,
    maintenanceMode: false,
    supportEmail: 'equipe@trilinksoftware.com.br',
    supportPhone: '34997713731',
    rbacMatrixEnabled: true,
  };
  private readonly logger = new Logger(SettingsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationConnections: IntegrationConnectionsService,
    private readonly settingsPermissionsService: SettingsPermissionsService,
    private readonly authorizationService: AuthorizationService,
    private readonly sefazMonitorService: SettingsSefazMonitorService,
    private readonly ticketsService: TicketsService,
  ) {}

  @Get('general')
  async getGeneralSettings(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');

    const settings = await this.prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['minimumWage', 'maintenanceMode', 'supportEmail', 'supportPhone', 'rbacMatrixEnabled'],
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
  }): SettingsOutput {
    const parsedMinimumWage = Number(input.minimumWage);
    const normalizedPhone = this.normalizeDigits(input.supportPhone);
    const normalizedEmail = (input.supportEmail ?? '').trim();

    return {
      minimumWage:
        Number.isFinite(parsedMinimumWage) && parsedMinimumWage >= 1
          ? parsedMinimumWage
          : SettingsController.DEFAULT_GENERAL_SETTINGS.minimumWage,
      maintenanceMode: input.maintenanceMode === 'true',
      supportEmail: normalizedEmail || SettingsController.DEFAULT_GENERAL_SETTINGS.supportEmail,
      supportPhone: normalizedPhone || SettingsController.DEFAULT_GENERAL_SETTINGS.supportPhone,
      rbacMatrixEnabled: input.rbacMatrixEnabled !== 'false',
    };
  }

  private buildSafeGeneralSettings(input: {
    minimumWage: number;
    maintenanceMode: boolean;
    supportEmail: string;
    supportPhone: string;
    rbacMatrixEnabled: boolean;
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
    };
  }

  private normalizeDigits(value?: string): string {
    return (value ?? '').replace(/\D+/g, '');
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
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: SettingsController.EVOLUTION_CONFIG_KEY },
    });

    const fallbackLegacySetting = !setting?.value
      ? await this.prisma.systemSetting.findUnique({
          where: { key: SettingsController.LEGACY_EVOLUTION_CONFIG_KEY },
        })
      : null;
    const sourceValue = setting?.value ?? fallbackLegacySetting?.value;

    if (!sourceValue) {
      return { success: true, settings: DEFAULT_EVOLUTION_SETTINGS };
    }

    try {
      const parsed = JSON.parse(sourceValue);
      const validation = evolutionSettingsSchema.safeParse(parsed);
      if (!validation.success) {
        return { success: true, settings: DEFAULT_EVOLUTION_SETTINGS };
      }
      return { success: true, settings: validation.data };
    } catch {
      return { success: true, settings: DEFAULT_EVOLUTION_SETTINGS };
    }
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

    const [contracts, sefazRecords] = await Promise.all([
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

    return items;
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
}
