import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ContactsRouter } from './contacts.router';
import { EvolutionModule } from '../integrations/evolution/evolution.module';
import { EvolutionClient } from '../integrations/evolution/evolution.client';
import { ChatwootModule } from '../integrations/chatwoot/chatwoot.module';
import { ChatwootClient } from '../integrations/chatwoot/chatwoot.client';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsModule } from '../settings/settings.module';
import { TrpcCoreModule } from '../trpc/trpc-core.module';

import { ContactsOrchestrationService } from '@dosc-syspro/contacts-infra';

import { IntegrationContextService } from '../settings/integration-context.service';

@Module({
  imports: [PrismaModule, EvolutionModule, ChatwootModule, SettingsModule, TrpcCoreModule],
  providers: [
    ContactsService, 
    ContactsRouter,
    {
      provide: ContactsOrchestrationService,
      useFactory: (
        prisma: PrismaService, 
        chatwoot: ChatwootClient, 
        evolution: EvolutionClient,
        integrationContext: IntegrationContextService
      ) => {
        return new ContactsOrchestrationService(prisma, chatwoot, evolution, integrationContext);
      },
      inject: [PrismaService, ChatwootClient, EvolutionClient, IntegrationContextService],
    }
  ],
  exports: [ContactsService, ContactsRouter],
})
export class ContactsModule {}

