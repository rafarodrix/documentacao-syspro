import { Module, forwardRef } from '@nestjs/common';
import { EvolutionWebhookController } from './evolution-webhook.controller';
import { EvolutionClient } from './evolution.client';
import { EvolutionGoClient } from './evolution-go.client';
import { OperationalWhatsappDispatchService } from './operational-whatsapp-dispatch.service';
import { MessagingModule } from '../messaging/messaging.module';
import { SettingsModule } from '../../settings/settings.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ChatwootModule } from '../chatwoot/chatwoot.module';

@Module({
  imports: [forwardRef(() => MessagingModule), forwardRef(() => SettingsModule), PrismaModule, forwardRef(() => ChatwootModule)],
  controllers: [EvolutionWebhookController],
  providers: [
    EvolutionGoClient,
    OperationalWhatsappDispatchService,
    {
      provide: EvolutionClient,
      useExisting: EvolutionGoClient,
    },
  ],
  exports: [EvolutionClient, OperationalWhatsappDispatchService],
})
export class EvolutionModule {}
