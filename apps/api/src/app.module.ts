import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { EvolutionModule } from './modules/integrations/evolution/evolution.module';
import { ChatwootModule } from './modules/integrations/chatwoot/chatwoot.module';
import { MessagingModule } from './modules/integrations/messaging/messaging.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { CompaniesModule } from './modules/companies/companies.module';

@Module({
  imports: [
    PrismaModule,
    EvolutionModule,
    ChatwootModule,
    MessagingModule,
    ContactsModule,
    CompaniesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
