import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { WhatsAppController } from './whatsapp.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AppController, WhatsAppController],
  providers: [AppService],
})
export class AppModule {}
