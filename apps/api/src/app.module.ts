import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { WhatsAppController } from './modules/whatsapp/controllers/whatsapp.controller';
import { ConversationsController } from './modules/conversations/controllers/conversations.controller';
import { WhatsAppInboundService } from './modules/whatsapp/services/whatsapp-inbound.service';
import { ZammadClient } from './modules/integrations/clients/zammad.client';

@Module({
  imports: [PrismaModule],
  controllers: [AppController, WhatsAppController, ConversationsController],
  providers: [AppService, WhatsAppInboundService, ZammadClient],
})
export class AppModule {}
