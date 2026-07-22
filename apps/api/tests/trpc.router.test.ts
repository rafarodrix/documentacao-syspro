import { describe, expect, it } from 'vitest';
import type { CompaniesRouter } from '../src/modules/companies/companies.router';
import type { ContactsRouter } from '../src/modules/contacts/contacts.router';
import type { CrmRouter } from '../src/modules/crm/crm.router';
import type { DocsRouter } from '../src/modules/docs/docs.router';
import type { RemoteAdminRouter } from '../src/modules/remote-admin/remote-admin.router';
import type { RotinasMensaisRouter } from '../src/modules/rotinas-mensais/rotinas-mensais.router';
import type { TarefasRouter } from '../src/modules/tarefas/tarefas.router';
import type { TicketsRouter } from '../src/modules/tickets/tickets.router';
import type { TrpcService } from '../src/modules/trpc/trpc.service';
import { TrpcRouter } from '../src/modules/trpc/trpc.router';
import type { UsersRouter } from '../src/modules/users/users.router';

describe('TrpcRouter', () => {
  it('exposes every router consumed by the web, including rotinasMensais', () => {
    const router = new TrpcRouter(
      {
        publicProcedure: { query: (resolver: unknown) => resolver },
        router: (record: Record<string, unknown>) => record,
      } as unknown as TrpcService,
      { router: {} } as unknown as CompaniesRouter,
      { router: {} } as unknown as UsersRouter,
      { router: {} } as unknown as ContactsRouter,
      { router: {} } as unknown as DocsRouter,
      { router: {} } as unknown as TicketsRouter,
      { router: {} } as unknown as TarefasRouter,
      { router: {} } as unknown as RemoteAdminRouter,
      { router: {} } as unknown as CrmRouter,
      { router: { list: {} } } as unknown as RotinasMensaisRouter,
    );

    expect(router.appRouter).toHaveProperty('rotinasMensais.list');
  });
});
