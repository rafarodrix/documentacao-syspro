import { Module, forwardRef } from '@nestjs/common';
import { EvolutionWebhookController } from './interface/evolution-webhook.controller';
import { EvolutionClient } from './infrastructure/evolution.client';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [forwardRef(() => MessagingModule)],
  controllers: [EvolutionWebhookController],
  providers: [
    {
      // Registra a factory statica como provider para o Nest gerenciar a injeção
      provide: EvolutionClient,
      useFactory: () => EvolutionClient.fromRuntime(),
    },
  ],
  exports: [EvolutionClient],
})
export class EvolutionModule {}