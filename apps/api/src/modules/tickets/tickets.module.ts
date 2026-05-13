import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { AutomationModule } from '../automation/automation.module';
import { TicketHistoryService } from './ticket-history.service';
import { R2StorageService } from '../integrations/storage/r2-storage.service';

@Module({
  imports: [PrismaModule, forwardRef(() => AutomationModule)],
  controllers: [TicketsController],
  providers: [TicketsService, TicketHistoryService, R2StorageService],
  exports: [TicketsService],
})
export class TicketsModule {}
