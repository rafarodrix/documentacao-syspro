import { Injectable } from '@nestjs/common';
import { TrpcService } from './trpc.service';

import { CompaniesRouter } from '../companies/companies.router';

@Injectable()
export class TrpcRouter {
  public appRouter!: ReturnType<typeof this.createRouter>;

  constructor(
    private readonly trpc: TrpcService,
    private readonly companiesRouter: CompaniesRouter,
  ) {
    this.appRouter = this.createRouter();
  }

  private createRouter() {
    return this.trpc.router({
      hello: this.trpc.publicProcedure.query(() => {
        return { message: 'Hello from tRPC inside NestJS!' };
      }),
      companies: this.companiesRouter.router,
    });
  }
}

export type AppRouter = TrpcRouter['appRouter'];
