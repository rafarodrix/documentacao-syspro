import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import * as trpcExpress from '@trpc/server/adapters/express';
import { createContext } from './trpc.context';
import { TrpcCoreModule } from './trpc-core.module';
import { TrpcRouter } from './trpc.router';
import { CompaniesModule } from '../companies/companies.module';
import { UsersModule } from '../users/users.module';
import { ContactsModule } from '../contacts/contacts.module';

@Module({
  imports: [
    TrpcCoreModule,
    CompaniesModule,
    UsersModule,
    ContactsModule,
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
