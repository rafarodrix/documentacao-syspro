import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { EvolutionModule } from '../integrations/evolution/evolution.module';
import { SettingsModule } from '../settings/settings.module';
import { AutomationSettingsService } from './automation-settings.service';
import { AutomationWhatsappService } from './automation-whatsapp.service';

@Module({
  imports: [PrismaModule, forwardRef(() => EvolutionModule), forwardRef(() => SettingsModule)],
  providers: [AutomationSettingsService, AutomationWhatsappService],
  exports: [AutomationSettingsService, AutomationWhatsappService],
})
export class AutomationModule {}
