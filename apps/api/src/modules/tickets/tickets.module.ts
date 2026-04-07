import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService], // Exportamos caso outros módulos precisem criar tickets (ex: alertas do sistema)
})
export class TicketsModule {}
