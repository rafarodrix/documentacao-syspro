import { Module, forwardRef } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { IntegrationConnectionsService } from './integration-connections.service';
import { IntegrationContextService } from './integration-context.service';
import { SettingsPermissionsService } from './permissions/permissions.service';
import { SettingsSefazMonitorService } from './sefaz-monitor.service';
import { TicketsModule } from '../tickets/tickets.module';
import { ChatwootModule } from '../integrations/chatwoot/chatwoot.module';
import { AutomationModule } from '../automation/automation.module';
import { R2StorageService } from '../integrations/storage/r2-storage.service';

@Module({
  imports: [PrismaModule, forwardRef(() => TicketsModule), forwardRef(() => ChatwootModule), forwardRef(() => AutomationModule)],
  controllers: [SettingsController],
  providers: [IntegrationConnectionsService, IntegrationContextService, SettingsPermissionsService, SettingsSefazMonitorService, R2StorageService],
  exports: [IntegrationConnectionsService, IntegrationContextService, SettingsPermissionsService, SettingsSefazMonitorService, R2StorageService],
})
export class SettingsModule {}
