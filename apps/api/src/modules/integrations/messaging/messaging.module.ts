import { Module, forwardRef } from '@nestjs/common';
import { ProcessIncomingMessageUseCase } from './application/process-incoming-message.usecase';
import { ProcessOutgoingMessageUseCase } from './application/process-outgoing-message.usecase';
import { IntegrationWebhookDedupService } from './application/integration-webhook-dedup.service';
import { EvolutionModule } from '../evolution/evolution.module';
import { ChatwootModule } from '../chatwoot/chatwoot.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SettingsModule } from '../../settings/settings.module';

@Module({
  imports: [
    forwardRef(() => EvolutionModule),
    forwardRef(() => ChatwootModule),
    PrismaModule,
    SettingsModule,
  ],
  providers: [ProcessIncomingMessageUseCase, ProcessOutgoingMessageUseCase, IntegrationWebhookDedupService],
  exports: [ProcessIncomingMessageUseCase, ProcessOutgoingMessageUseCase, IntegrationWebhookDedupService],
})
export class MessagingModule {}
