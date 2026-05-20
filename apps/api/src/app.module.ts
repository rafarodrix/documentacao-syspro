import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
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
import { TarefasModule } from './modules/tarefas/tarefas.module';
import { TrpcApiModule } from './modules/trpc/trpc-api.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
            : undefined,
        customProps: () => ({ service: 'syspro-api' }),
        redact: ['req.headers.authorization', 'req.headers["x-internal-api-key"]'],
        autoLogging: {
          ignore: (req) => req.url?.startsWith('/api/health') ?? false,
        },
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'short', ttl: 1_000, limit: 30 },
        { name: 'medium', ttl: 60_000, limit: 300 },
      ],
    }),
    HealthModule,
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
    TarefasModule,
    TrpcApiModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
