import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../trpc/trpc.service';
import { CrmService } from './crm.service';
import {
  crmLeadCreateSchema,
  crmLeadUpdateSchema,
  crmLeadListFiltersSchema,
  crmActivityCreateSchema,
  crmTaskCreateSchema,
  crmTaskUpdateSchema,
  crmProposalSaveSchema,
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

      listActivities: this.trpc.publicProcedure
        .input(z.object({ leadId: z.string() }))
        .query(({ input, ctx }) =>
          this.crmService.listActivities(input.leadId, ctx.headers),
        ),

      createActivity: this.trpc.publicProcedure
        .input(crmActivityCreateSchema)
        .mutation(({ input, ctx }) =>
          this.crmService.createActivity(input, ctx.headers),
        ),

      listTasks: this.trpc.publicProcedure
        .input(z.object({ leadId: z.string() }))
        .query(({ input, ctx }) =>
          this.crmService.listTasks(input.leadId, ctx.headers),
        ),

      createTask: this.trpc.publicProcedure
        .input(crmTaskCreateSchema)
        .mutation(({ input, ctx }) =>
          this.crmService.createTask(input, ctx.headers),
        ),

      updateTask: this.trpc.publicProcedure
        .input(z.object({ id: z.string(), data: crmTaskUpdateSchema }))
        .mutation(({ input, ctx }) =>
          this.crmService.updateTask(input.id, input.data, ctx.headers),
        ),

      deleteTask: this.trpc.publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ input, ctx }) =>
          this.crmService.deleteTask(input.id, ctx.headers),
        ),

      getProposalByLeadId: this.trpc.publicProcedure
        .input(z.object({ leadId: z.string() }))
        .query(({ input, ctx }) =>
          this.crmService.getProposalByLeadId(input.leadId, ctx.headers),
        ),

      saveProposal: this.trpc.publicProcedure
        .input(crmProposalSaveSchema)
        .mutation(({ input, ctx }) =>
          this.crmService.saveProposal(input, ctx.headers),
        ),
    });
  }
}
