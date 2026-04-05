import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { WhatsAppController } from './modules/whatsapp/controllers/whatsapp.controller';
import { WhatsAppAdminController } from './modules/whatsapp/controllers/whatsapp-admin.controller';
import { ConversationsController } from './modules/conversations/controllers/conversations.controller';
import { WhatsAppInboundService } from './modules/whatsapp/services/whatsapp-inbound.service';
import { ZammadClient } from './modules/integrations/clients/zammad.client';
import { EvolutionModule } from './modules/integrations/evolution/evolution.module';
import { ChatwootModule } from './modules/integrations/chatwoot/chatwoot.module';
import { MessagingModule } from './modules/integrations/messaging/messaging.module';

@Module({
  imports: [
    PrismaModule,
    EvolutionModule,
    ChatwootModule,
    MessagingModule,
  ],
  controllers: [AppController, WhatsAppController, WhatsAppAdminController, ConversationsController],
  providers: [AppService, WhatsAppInboundService, ZammadClient],
})
export class AppModule {}
