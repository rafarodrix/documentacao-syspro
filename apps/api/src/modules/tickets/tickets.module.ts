import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { AutomationModule } from '../automation/automation.module';
import { TicketHistoryService } from './ticket-history.service';

@Module({
  imports: [PrismaModule, forwardRef(() => AutomationModule)],
  controllers: [TicketsController],
  providers: [TicketsService, TicketHistoryService],
  exports: [TicketsService],
})
export class TicketsModule {}
