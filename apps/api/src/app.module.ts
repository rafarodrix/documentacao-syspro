import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { EvolutionModule } from './modules/integrations/evolution/evolution.module';
import { ChatwootModule } from './modules/integrations/chatwoot/chatwoot.module';
import { MessagingModule } from './modules/integrations/messaging/messaging.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { DocsModule } from './modules/docs/docs.module';
import { TaxModule } from './modules/tax/tax.module';
import { RemoteAdminModule } from './modules/remote-admin/remote-admin.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReleasesModule } from './modules/releases/releases.module';
import { CrmModule } from './modules/crm/crm.module';
import { AgentsModule } from './modules/agents/agents.module';
import { DocumentosModule } from './modules/documentos/documentos.module';
import { AutomationModule } from './modules/automation/automation.module';

@Module({
  imports: [
    PrismaModule,
    EvolutionModule,
    ChatwootModule,
    MessagingModule,
    ContactsModule,
    CompaniesModule,
    SettingsModule,
    UsersModule,
    AuthModule,
    AuthorizationModule,
    TicketsModule,
    DocsModule,
    TaxModule,
    RemoteAdminModule,
    DashboardModule,
    ReleasesModule,
    CrmModule,
    AgentsModule,
    DocumentosModule,
    AutomationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
