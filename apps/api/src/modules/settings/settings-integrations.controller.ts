import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { EvolutionSettingsInput } from '@dosc-syspro/contracts/evolution';
import type { ChatwootBehaviorSettingsInput, ChatwootIntegrationSettingsInput } from '@dosc-syspro/contracts/chatwoot';
import type { GoogleCalendarSettingsInput, StorageR2SettingsInput } from '@dosc-syspro/contracts/settings';
import { AuthorizationService } from '../authorization/authorization.service';
import { SettingsEvolutionService } from './settings-evolution.service';
import { SettingsChatwootService } from './settings-chatwoot.service';
import { SettingsStorageGoogleCalendarService } from './settings-storage-google-calendar.service';
import { SettingsIntegrationConnectionsAdminService } from './settings-integration-connections-admin.service';

@Controller('settings')
export class SettingsIntegrationsController {
  constructor(
    private readonly settingsEvolutionService: SettingsEvolutionService,
    private readonly settingsChatwootService: SettingsChatwootService,
    private readonly settingsStorageGoogleCalendarService: SettingsStorageGoogleCalendarService,
    private readonly settingsIntegrationConnectionsAdminService: SettingsIntegrationConnectionsAdminService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  @Get('evolution')
  async getEvolutionSettings() {
    return this.settingsEvolutionService.getSettings();
  }

  @Put('evolution')
  async setEvolutionSettings(@Body() input: EvolutionSettingsInput) {
    return this.settingsEvolutionService.setSettings(input);
  }

  @Get('evolution/status')
  async getEvolutionInstanceStatus(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');
    return this.settingsEvolutionService.getInstanceStatus();
  }

  @Post('evolution/qrcode')
  async getEvolutionQrCode() {
    return this.settingsEvolutionService.getQrCode();
  }

  @Get('evolution/diagnostics')
  async getEvolutionDiagnostics(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');
    return this.settingsEvolutionService.getDiagnostics();
  }

  @Get('chatwoot/behavior')
  async getChatwootBehaviorSettings(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');
    return this.settingsChatwootService.getBehaviorSettings();
  }

  @Get('chatwoot/config')
  async getChatwootIntegrationSettings(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');
    return this.settingsChatwootService.getIntegrationSettings();
  }

  @Put('chatwoot/config')
  async setChatwootIntegrationSettings(@Req() req: Request, @Body() input: ChatwootIntegrationSettingsInput) {
    await this.authorizationService.assertPermission(req.headers, 'settings:edit');
    return this.settingsChatwootService.setIntegrationSettings(input);
  }

  @Put('chatwoot/behavior')
  async setChatwootBehaviorSettings(@Req() req: Request, @Body() input: ChatwootBehaviorSettingsInput) {
    await this.authorizationService.assertPermission(req.headers, 'settings:edit');
    return this.settingsChatwootService.setBehaviorSettings(input);
  }

  @Get('integrations/diagnostics')
  async getIntegrationDiagnostics(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');
    const [chatwoot, storage] = await Promise.all([
      this.settingsChatwootService.getDiagnostics(),
      this.settingsStorageGoogleCalendarService.getStorageDiagnostics(),
    ]);

    return {
      success: true,
      chatwoot,
      storage,
    };
  }

  @Get('storage/config')
  async getStorageConfig(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');
    return this.settingsStorageGoogleCalendarService.getStorageConfig();
  }

  @Get('google-calendar/config')
  async getGoogleCalendarConfig(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');
    return this.settingsStorageGoogleCalendarService.getGoogleCalendarConfig();
  }

  @Put('storage/config')
  async setStorageConfig(@Req() req: Request, @Body() input: StorageR2SettingsInput) {
    await this.authorizationService.assertPermission(req.headers, 'settings:edit');
    return this.settingsStorageGoogleCalendarService.setStorageConfig(input);
  }

  @Put('google-calendar/config')
  async setGoogleCalendarConfig(@Req() req: Request, @Body() input: GoogleCalendarSettingsInput) {
    await this.authorizationService.assertPermission(req.headers, 'settings:edit');
    return this.settingsStorageGoogleCalendarService.setGoogleCalendarConfig(input);
  }

  @Get('integrations/connections')
  async listIntegrationConnections(@Query('companyId') companyId?: string) {
    return this.settingsIntegrationConnectionsAdminService.list(companyId);
  }

  @Get('integrations/connections/:id')
  async getIntegrationConnection(@Param('id') id: string) {
    return this.settingsIntegrationConnectionsAdminService.getById(id);
  }

  @Post('integrations/connections')
  async createIntegrationConnection(@Body() body: any) {
    return this.settingsIntegrationConnectionsAdminService.create(body);
  }

  @Put('integrations/connections/:id')
  async updateIntegrationConnection(@Param('id') id: string, @Body() body: any) {
    return this.settingsIntegrationConnectionsAdminService.update(id, body);
  }

  @Delete('integrations/connections/:id')
  async deleteIntegrationConnection(@Param('id') id: string) {
    return this.settingsIntegrationConnectionsAdminService.remove(id);
  }

  @Post('integrations/connections/:id/test')
  async testIntegrationConnection(@Param('id') id: string) {
    return this.settingsIntegrationConnectionsAdminService.test(id);
  }
}
