import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../trpc/trpc.service';
import { CrmService } from './crm.service';
import {
  crmLeadCreateSchema,
  crmLeadUpdateSchema,
  crmLeadListFiltersSchema,
} from '@dosc-syspro/contracts/crm';

@Injectable()
export class CrmRouter {
  public router!: ReturnType<typeof this.createRouter>;

  constructor(
    private readonly trpc: TrpcService,
    private readonly crmService: CrmService,
  ) {
    this.router = this.createRouter();
  }

  private createRouter() {
    return this.trpc.router({
      list: this.trpc.publicProcedure
        .input(crmLeadListFiltersSchema)
        .query(({ input, ctx }) =>
          this.crmService.listLeads(input, ctx.headers),
        ),

      getSummary: this.trpc.publicProcedure
        .query(({ ctx }) =>
          this.crmService.getSummary(ctx.headers),
        ),

      searchContacts: this.trpc.publicProcedure
        .input(z.object({ q: z.string().default('') }))
        .query(({ input, ctx }) =>
          this.crmService.searchContacts(input.q, ctx.headers),
        ),

      getSupportData: this.trpc.publicProcedure
        .query(({ ctx }) =>
          this.crmService.getSupportData(ctx.headers),
        ),

      getById: this.trpc.publicProcedure
        .input(z.object({ id: z.string() }))
        .query(({ input, ctx }) =>
          this.crmService.getLeadById(input.id, ctx.headers),
        ),

      create: this.trpc.publicProcedure
        .input(crmLeadCreateSchema)
        .mutation(({ input, ctx }) =>
          this.crmService.createLead(input, ctx.headers),
        ),

      update: this.trpc.publicProcedure
        .input(z.object({ id: z.string(), data: crmLeadUpdateSchema }))
        .mutation(({ input, ctx }) =>
          this.crmService.updateLead(input.id, input.data, ctx.headers),
        ),
    });
  }
}
