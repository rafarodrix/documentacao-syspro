import { Global, Module, MiddlewareConsumer, RequestMethod, forwardRef } from '@nestjs/common';
import { TrpcService } from './trpc.service';
import { TrpcRouter } from './trpc.router';
import * as trpcExpress from '@trpc/server/adapters/express';

import { createContext } from './trpc.context';

import { CompaniesModule } from '../companies/companies.module';
import { UsersModule } from '../users/users.module';
import { ContactsModule } from '../contacts/contacts.module';

@Global()
@Module({
  imports: [forwardRef(() => CompaniesModule), forwardRef(() => UsersModule), forwardRef(() => ContactsModule)],
  providers: [TrpcService, TrpcRouter],
  exports: [TrpcService, TrpcRouter],
})
export class TrpcModule {
  constructor(private readonly trpcRouter: TrpcRouter) {}

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        trpcExpress.createExpressMiddleware({
          router: this.trpcRouter.appRouter,
          createContext,
        })
      )
      .forRoutes({ path: '/trpc/*', method: RequestMethod.ALL });
  }
}
