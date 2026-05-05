import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { TrpcService } from './trpc.service';
import { TrpcRouter } from './trpc.router';
import * as trpcExpress from '@trpc/server/adapters/express';

import { createContext } from './trpc.context';

import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [CompaniesModule],
  providers: [TrpcService, TrpcRouter],
  exports: [TrpcRouter],
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
