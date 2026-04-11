import { Controller, Get, Put, Body, Param, Post, Delete, Query, NotFoundException, Req } from '@nestjs/common';
import { CompanyStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationConnectionsService } from './integration-connections.service';
import {
  DEFAULT_EVOLUTION_SETTINGS,
  evolutionSettingsSchema,
  type SettingsContractsAdminView,
  settingsSchema,
  sefazRoutesSchema,
  settingsAccessProfileUpsertSchema,
  settingsPermissionsMatrixVisibilityUpdateSchema,
  settingsUserAccessProfileCreateSchema,
  type EvolutionSettingsInput,
  type SettingsInput,
  type SefazRoutesInput,
} from '@dosc-syspro/contracts';
import type { Request } from 'express';
import { SettingsPermissionsService } from './permissions/permissions.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { SettingsSefazMonitorService } from './sefaz-monitor.service';

@Controller('settings')
export class SettingsController {
  private static readonly EVOLUTION_CONFIG_KEY = 'evolution_config';
  private static readonly LEGACY_EVOLUTION_CONFIG_KEY = 'whatsapp_evolution_config';

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationConnections: IntegrationConnectionsService,
    private readonly settingsPermissionsService: SettingsPermissionsService,
    private readonly authorizationService: AuthorizationService,
    private readonly sefazMonitorService: SettingsSefazMonitorService,
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

    const data = settingsSchema.parse({
      minimumWage: Number(configMap.minimumWage || 0),
      maintenanceMode: configMap.maintenanceMode === 'true',
      supportEmail: configMap.supportEmail || '',
      supportPhone: configMap.supportPhone || '',
      rbacMatrixEnabled: configMap.rbacMatrixEnabled !== 'false',
    });

    return { success: true, data };
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
    return { success: true, count: result.count, message: `Verificacao concluida (${result.count} rotas).` };
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
}
