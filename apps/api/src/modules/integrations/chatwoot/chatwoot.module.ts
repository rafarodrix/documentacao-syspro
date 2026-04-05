import { Module, forwardRef } from '@nestjs/common';
import { ChatwootWebhookController } from './interface/chatwoot-webhook.controller';
import { ChatwootClient } from './infrastructure/chatwoot.client';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [forwardRef(() => MessagingModule)],
  controllers: [ChatwootWebhookController],
  providers: [ChatwootClient],
  exports: [ChatwootClient],
})
export class ChatwootModule {}