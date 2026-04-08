import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { IntegrationConnectionsService } from './integration-connections.service';
import { IntegrationContextService } from './integration-context.service';

@Module({
  imports: [PrismaModule],
  controllers: [SettingsController],
  providers: [IntegrationConnectionsService, IntegrationContextService],
  exports: [IntegrationConnectionsService, IntegrationContextService],
})
export class SettingsModule {}
