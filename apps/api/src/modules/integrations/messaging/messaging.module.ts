import { Module, forwardRef } from '@nestjs/common';
import { ProcessIncomingMessageUseCase } from './application/process-incoming-message.usecase';
import { ProcessOutgoingMessageUseCase } from './application/process-outgoing-message.usecase';
import { EvolutionModule } from '../evolution/evolution.module';
import { ChatwootModule } from '../chatwoot/chatwoot.module';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [
    forwardRef(() => EvolutionModule),
    forwardRef(() => ChatwootModule),
    PrismaModule,
  ],
  providers: [ProcessIncomingMessageUseCase, ProcessOutgoingMessageUseCase],
  exports: [ProcessIncomingMessageUseCase, ProcessOutgoingMessageUseCase],
})
export class MessagingModule {}
