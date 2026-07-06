import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { EvolutionSettingsInput } from '@dosc-syspro/contracts/evolution';
import type { ChatwootBehaviorSettingsInput, ChatwootIntegrationSettingsInput } from '@dosc-syspro/contracts/chatwoot';
import type { GoogleCalendarSettingsInput, StorageR2SettingsInput } from '@dosc-syspro/contracts/settings';
import { AuthorizationService } from '../authorization/authorization.service';
import { SettingsIntegrationsService } from './settings-integrations.service';

@Controller('settings')
export class SettingsIntegrationsController {
  constructor(
    private readonly settingsIntegrationsService: SettingsIntegrationsService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  @Get('evolution')
  async getEvolutionSettings() {
    return this.settingsIntegrationsService.getEvolutionSettings();
  }

  @Put('evolution')
  async setEvolutionSettings(@Body() input: EvolutionSettingsInput) {
    return this.settingsIntegrationsService.setEvolutionSettings(input);
  }

  @Get('evolution/status')
  async getEvolutionInstanceStatus(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');
    return this.settingsIntegrationsService.getEvolutionInstanceStatus();
  }

  @Post('evolution/qrcode')
  async getEvolutionQrCode() {
    return this.settingsIntegrationsService.getEvolutionQrCode();
  }

  @Get('evolution/diagnostics')
  async getEvolutionDiagnostics(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');
    return this.settingsIntegrationsService.getEvolutionDiagnostics();
  }

  @Get('chatwoot/behavior')
  async getChatwootBehaviorSettings(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');
    return this.settingsIntegrationsService.getChatwootBehaviorSettings();
  }

  @Get('chatwoot/config')
  async getChatwootIntegrationSettings(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');
    return this.settingsIntegrationsService.getChatwootIntegrationSettings();
  }

  @Put('chatwoot/config')
  async setChatwootIntegrationSettings(@Req() req: Request, @Body() input: ChatwootIntegrationSettingsInput) {
    await this.authorizationService.assertPermission(req.headers, 'settings:edit');
    return this.settingsIntegrationsService.setChatwootIntegrationSettings(input);
  }

  @Put('chatwoot/behavior')
  async setChatwootBehaviorSettings(@Req() req: Request, @Body() input: ChatwootBehaviorSettingsInput) {
    await this.authorizationService.assertPermission(req.headers, 'settings:edit');
    return this.settingsIntegrationsService.setChatwootBehaviorSettings(input);
  }

  @Get('integrations/diagnostics')
  async getIntegrationDiagnostics(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');
    return this.settingsIntegrationsService.getIntegrationDiagnostics();
  }

  @Get('storage/config')
  async getStorageConfig(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');
    return this.settingsIntegrationsService.getStorageConfig();
  }

  @Get('google-calendar/config')
  async getGoogleCalendarConfig(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'settings:view');
    return this.settingsIntegrationsService.getGoogleCalendarConfig();
  }

  @Put('storage/config')
  async setStorageConfig(@Req() req: Request, @Body() input: StorageR2SettingsInput) {
    await this.authorizationService.assertPermission(req.headers, 'settings:edit');
    return this.settingsIntegrationsService.setStorageConfig(input);
  }

  @Put('google-calendar/config')
  async setGoogleCalendarConfig(@Req() req: Request, @Body() input: GoogleCalendarSettingsInput) {
    await this.authorizationService.assertPermission(req.headers, 'settings:edit');
    return this.settingsIntegrationsService.setGoogleCalendarConfig(input);
  }

  @Get('integrations/connections')
  async listIntegrationConnections(@Query('companyId') companyId?: string) {
    return this.settingsIntegrationsService.listIntegrationConnections(companyId);
  }

  @Get('integrations/connections/:id')
  async getIntegrationConnection(@Param('id') id: string) {
    return this.settingsIntegrationsService.getIntegrationConnection(id);
  }

  @Post('integrations/connections')
  async createIntegrationConnection(@Body() body: any) {
    return this.settingsIntegrationsService.createIntegrationConnection(body);
  }

  @Put('integrations/connections/:id')
  async updateIntegrationConnection(@Param('id') id: string, @Body() body: any) {
    return this.settingsIntegrationsService.updateIntegrationConnection(id, body);
  }

  @Delete('integrations/connections/:id')
  async deleteIntegrationConnection(@Param('id') id: string) {
    return this.settingsIntegrationsService.deleteIntegrationConnection(id);
  }

  @Post('integrations/connections/:id/test')
  async testIntegrationConnection(@Param('id') id: string) {
    return this.settingsIntegrationsService.testIntegrationConnection(id);
  }
}
