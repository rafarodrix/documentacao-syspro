import { Module, forwardRef } from '@nestjs/common';
import { EvolutionWebhookController } from './evolution-webhook.controller';
import { EvolutionMessagesController } from './evolution-messages.controller';
import { EvolutionClient } from './evolution.client';
import { MessagingModule } from '../messaging/messaging.module';
import { SettingsModule } from '../../settings/settings.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ChatwootModule } from '../chatwoot/chatwoot.module';

@Module({
  imports: [forwardRef(() => MessagingModule), SettingsModule, PrismaModule, forwardRef(() => ChatwootModule)],
  controllers: [EvolutionWebhookController, EvolutionMessagesController],
  providers: [EvolutionClient],
  exports: [EvolutionClient],
})
export class EvolutionModule {}
