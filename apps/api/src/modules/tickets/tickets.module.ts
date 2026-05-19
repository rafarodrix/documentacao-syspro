import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { AutomationModule } from '../automation/automation.module';
import { TicketHistoryService } from './ticket-history.service';
import { R2StorageService } from '../integrations/storage/r2-storage.service';
import { TrpcCoreModule } from '../trpc/trpc-core.module';
import { TicketsRouter } from './tickets.router';
import { TarefasModule } from '../tarefas/tarefas.module';

@Module({
  imports: [PrismaModule, forwardRef(() => AutomationModule), TrpcCoreModule, forwardRef(() => TarefasModule)],
  controllers: [TicketsController],
  providers: [TicketsService, TicketHistoryService, R2StorageService, TicketsRouter],
  exports: [TicketsService, TicketsRouter],
})
export class TicketsModule {}
