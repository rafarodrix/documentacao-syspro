import { Module, forwardRef } from '@nestjs/common';
import { EvolutionWebhookController } from './evolution-webhook.controller';
import { EvolutionMessagesController } from './evolution-messages.controller';
import { EvolutionClient } from './evolution.client';
import { MessagingModule } from '../messaging/messaging.module';
import { SettingsModule } from '../../settings/settings.module';

@Module({
  imports: [forwardRef(() => MessagingModule), SettingsModule],
  controllers: [EvolutionWebhookController, EvolutionMessagesController],
  providers: [EvolutionClient],
  exports: [EvolutionClient],
})
export class EvolutionModule {}
