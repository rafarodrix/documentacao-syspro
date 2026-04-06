import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SettingsController],
})
export class SettingsModule {}
