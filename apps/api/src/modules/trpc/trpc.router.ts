import { Injectable } from '@nestjs/common';
import { TrpcService } from './trpc.service';

import { CompaniesRouter } from '../companies/companies.router';
import { UsersRouter } from '../users/users.router';
import { ContactsRouter } from '../contacts/contacts.router';
import { DocsRouter } from '../docs/docs.router';

@Injectable()
export class TrpcRouter {
  public appRouter!: ReturnType<typeof this.createRouter>;

  constructor(
    private readonly trpc: TrpcService,
    private readonly companiesRouter: CompaniesRouter,
    private readonly usersRouter: UsersRouter,
    private readonly contactsRouter: ContactsRouter,
    private readonly docsRouter: DocsRouter,
  ) {
    this.appRouter = this.createRouter();
  }

  private createRouter() {
    return this.trpc.router({
      hello: this.trpc.publicProcedure.query(() => {
        return { message: 'Hello from tRPC inside NestJS!' };
      }),
      companies: this.companiesRouter.router,
      users: this.usersRouter.router,
      contacts: this.contactsRouter.router,
      docs: this.docsRouter.router,
    });
  }
}

export type AppRouter = TrpcRouter['appRouter'];
