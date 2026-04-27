import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { EvolutionModule } from '../integrations/evolution/evolution.module';
import { SettingsModule } from '../settings/settings.module';
import { TicketHistoryService } from './ticket-history.service';
import { TicketNotificationService } from './ticket-notification.service';

@Module({
  imports: [PrismaModule, forwardRef(() => EvolutionModule), forwardRef(() => SettingsModule)],
  controllers: [TicketsController],
  providers: [TicketsService, TicketHistoryService, TicketNotificationService],
  exports: [TicketsService],
})
export class TicketsModule {}
