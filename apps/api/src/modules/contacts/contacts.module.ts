import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { ContactsRouter } from './contacts.router';
import { PrismaModule } from '../../prisma/prisma.module';
import { EvolutionModule } from '../integrations/evolution/evolution.module';
import { ChatwootModule } from '../integrations/chatwoot/chatwoot.module';
import { SettingsModule } from '../settings/settings.module';
import { TrpcCoreModule } from '../trpc/trpc-core.module';

@Module({
  imports: [PrismaModule, EvolutionModule, ChatwootModule, SettingsModule, TrpcCoreModule],
  providers: [ContactsService, ContactsRouter],
  exports: [ContactsService, ContactsRouter],
})
export class ContactsModule {}
