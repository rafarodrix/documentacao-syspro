import { Module, forwardRef } from '@nestjs/common';
import { ChatwootWebhookController } from './chatwoot-webhook.controller';
import { ChatwootAgentContextController } from './chatwoot-agent-context.controller';
import { ChatwootClient } from './chatwoot.client';
import { ChatwootPlatformClient } from './chatwoot-platform.client';
import { ChatwootAttachmentResolver } from './chatwoot-attachment.resolver';
import { ChatwootSettingsService } from './chatwoot-settings.service';
import { ChatwootBehaviorService } from './chatwoot-behavior.service';
import { ChatwootCsatService } from './chatwoot-csat.service';
import { MessagingModule } from '../messaging/messaging.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { EvolutionModule } from '../evolution/evolution.module';
import { SettingsModule } from '../../settings/settings.module';

@Module({
  imports: [forwardRef(() => MessagingModule), PrismaModule, forwardRef(() => EvolutionModule), forwardRef(() => SettingsModule)],
  controllers: [ChatwootWebhookController, ChatwootAgentContextController],
  providers: [
    ChatwootAttachmentResolver,
    ChatwootPlatformClient,
    ChatwootClient,
    ChatwootSettingsService,
    ChatwootBehaviorService,
    ChatwootCsatService,
  ],
  exports: [ChatwootClient],
})
export class ChatwootModule {}
