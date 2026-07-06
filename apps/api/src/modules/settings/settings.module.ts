import { Module, forwardRef } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsIntegrationsController } from './settings-integrations.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { IntegrationConnectionsService } from './integration-connections.service';
import { IntegrationContextService } from './integration-context.service';
import { SettingsPermissionsService } from './permissions/permissions.service';
import { SettingsSefazMonitorService } from './sefaz-monitor.service';
import { TicketsModule } from '../tickets/tickets.module';
import { ChatwootModule } from '../integrations/chatwoot/chatwoot.module';
import { AutomationModule } from '../automation/automation.module';
import { R2StorageService } from '../integrations/storage/r2-storage.service';
import { SettingsEvolutionService } from './settings-evolution.service';
import { SettingsChatwootService } from './settings-chatwoot.service';
import { SettingsStorageGoogleCalendarService } from './settings-storage-google-calendar.service';
import { SettingsIntegrationConnectionsAdminService } from './settings-integration-connections-admin.service';
import { SettingsIntegrationSecretsService } from './settings-integration-secrets.service';

@Module({
  imports: [PrismaModule, forwardRef(() => TicketsModule), forwardRef(() => ChatwootModule), forwardRef(() => AutomationModule)],
  controllers: [SettingsController, SettingsIntegrationsController],
  providers: [
    IntegrationConnectionsService,
    IntegrationContextService,
    SettingsPermissionsService,
    SettingsSefazMonitorService,
    R2StorageService,
    SettingsEvolutionService,
    SettingsChatwootService,
    SettingsStorageGoogleCalendarService,
    SettingsIntegrationConnectionsAdminService,
    SettingsIntegrationSecretsService,
  ],
  exports: [IntegrationConnectionsService, IntegrationContextService, SettingsPermissionsService, SettingsSefazMonitorService, R2StorageService],
})
export class SettingsModule {}
