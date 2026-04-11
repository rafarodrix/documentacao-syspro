import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { IntegrationConnectionsService } from './integration-connections.service';
import { IntegrationContextService } from './integration-context.service';
import { SettingsPermissionsService } from './permissions/permissions.service';

@Module({
  imports: [PrismaModule],
  controllers: [SettingsController],
  providers: [IntegrationConnectionsService, IntegrationContextService, SettingsPermissionsService],
  exports: [IntegrationConnectionsService, IntegrationContextService, SettingsPermissionsService],
})
export class SettingsModule {}
