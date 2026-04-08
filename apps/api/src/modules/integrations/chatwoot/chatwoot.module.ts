import { Module, forwardRef } from '@nestjs/common';
import { ChatwootWebhookController } from './chatwoot-webhook.controller';
import { ChatwootClient } from './chatwoot.client';
import { MessagingModule } from '../messaging/messaging.module';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [forwardRef(() => MessagingModule), PrismaModule],
  controllers: [ChatwootWebhookController],
  providers: [ChatwootClient],
  exports: [ChatwootClient],
})
export class ChatwootModule {}