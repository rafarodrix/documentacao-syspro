import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { WhatsAppController } from './whatsapp.controller';
import { ConversationsController } from './conversations.controller';
import { WhatsAppInboundService } from './whatsapp-inbound.service';
import { ZammadClient } from './integrations/zammad.client';

@Module({
  imports: [PrismaModule],
  controllers: [AppController, WhatsAppController, ConversationsController],
  providers: [AppService, WhatsAppInboundService, ZammadClient],
})
export class AppModule {}
