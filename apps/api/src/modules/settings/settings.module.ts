import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { IntegrationConnectionsService } from './integration-connections.service';

@Module({
  imports: [PrismaModule],
  controllers: [SettingsController],
  providers: [IntegrationConnectionsService],
})
export class SettingsModule {}
