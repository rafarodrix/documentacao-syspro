import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { IntegrationConnectionsService } from './integration-connections.service';
import { IntegrationContextService } from './integration-context.service';
import { SettingsPermissionsService } from './permissions/permissions.service';
import { SettingsSefazMonitorService } from './sefaz-monitor.service';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [PrismaModule, TicketsModule],
  controllers: [SettingsController],
  providers: [IntegrationConnectionsService, IntegrationContextService, SettingsPermissionsService, SettingsSefazMonitorService],
  exports: [IntegrationConnectionsService, IntegrationContextService, SettingsPermissionsService, SettingsSefazMonitorService],
})
export class SettingsModule {}
