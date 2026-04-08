import { Module, forwardRef } from '@nestjs/common';
import { ChatwootWebhookController } from './chatwoot-webhook.controller';
import { ChatwootClient } from './chatwoot.client';
import { MessagingModule } from '../messaging/messaging.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { EvolutionModule } from '../evolution/evolution.module';
import { SettingsModule } from '../../settings/settings.module';

@Module({
  imports: [forwardRef(() => MessagingModule), PrismaModule, forwardRef(() => EvolutionModule), SettingsModule],
  controllers: [ChatwootWebhookController],
  providers: [ChatwootClient],
  exports: [ChatwootClient],
})
export class ChatwootModule {}
