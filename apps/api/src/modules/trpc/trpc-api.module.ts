import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import * as trpcExpress from '@trpc/server/adapters/express';
import { createContext } from './trpc.context';
import { TrpcCoreModule } from './trpc-core.module';
import { TrpcRouter } from './trpc.router';
import { CompaniesModule } from '../companies/companies.module';
import { UsersModule } from '../users/users.module';
import { ContactsModule } from '../contacts/contacts.module';
import { DocsModule } from '../docs/docs.module';
import { TicketsModule } from '../tickets/tickets.module';
import { RemoteAdminModule } from '../remote-admin/remote-admin.module';
import { RotinasMensaisModule } from '../rotinas-mensais/rotinas-mensais.module';

@Module({
  imports: [
    TrpcCoreModule,
    CompaniesModule,
    UsersModule,
    ContactsModule,
    DocsModule,
    TicketsModule,
    RotinasMensaisModule,
    RemoteAdminModule,
  ],
  providers: [TrpcRouter],
  exports: [TrpcRouter],
})
export class TrpcApiModule {
  constructor(private readonly trpcRouter: TrpcRouter) {}

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        trpcExpress.createExpressMiddleware({
          router: this.trpcRouter.appRouter,
          createContext,
        }),
      )
      .forRoutes({ path: '/trpc/*', method: RequestMethod.ALL });
  }
}
