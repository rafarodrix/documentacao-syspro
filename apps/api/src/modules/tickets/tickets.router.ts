import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  ticketModuleListQuerySchema,
  ticketModuleStatusSchema,
  ticketModuleTriageRequestSchema,
  ticketModuleUpdateRequestSchema,
} from '@dosc-syspro/contracts/ticket';
import { TrpcService } from '../trpc/trpc.service';
import { TicketsService } from './tickets.service';

@Injectable()
export class TicketsRouter {
  private readonly logger = new Logger(TicketsRouter.name);
  public router!: ReturnType<typeof this.createRouter>;

  constructor(
    private readonly trpc: TrpcService,
    private readonly ticketsService: TicketsService,
  ) {
    this.router = this.createRouter();
  }

  private createRouter() {
    return this.trpc.router({
      list: this.trpc.publicProcedure
        .input(ticketModuleListQuerySchema.optional())
        .query(({ input, ctx }) => {
          return this.ticketsService.findAll(input ?? {}, ctx.headers);
        }),

      details: this.trpc.publicProcedure
        .input(
          z.object({
            id: z.string().trim().min(1),
            page: z.string().optional(),
            pageSize: z.string().optional(),
          }),
        )
        .query(({ input, ctx }) => {
          return this.ticketsService.findOne(
            input.id,
            {
              page: input.page,
              pageSize: input.pageSize,
            },
            ctx.headers,
          );
        }),

      linkedCompanies: this.trpc.publicProcedure
        .query(({ ctx }) => {
          return this.ticketsService.getLinkedCompanies(ctx.headers);
        }),

      archive: this.trpc.publicProcedure
        .input(z.object({ id: z.string().trim().min(1) }))
        .mutation(({ input, ctx }) => {
          this.logger.log(JSON.stringify({
            flow: 'tickets_archive',
            stage: 'trpc_router_enter',
            ticketId: input.id,
            source: ctx.req?.headers['x-trpc-source'] ?? null,
          }));
          return this.ticketsService.archiveTicket(input.id, ctx.headers);
        }),

      update: this.trpc.publicProcedure
        .input(
          z.object({
            id: z.string().trim().min(1),
            data: ticketModuleUpdateRequestSchema,
          }),
        )
        .mutation(({ input, ctx }) => {
          return this.ticketsService.updateStatus(input.id, input.data, ctx.headers);
        }),

      updateStatus: this.trpc.publicProcedure
        .input(
          z.object({
            id: z.string().trim().min(1),
            status: ticketModuleStatusSchema,
          }),
        )
        .mutation(({ input, ctx }) => {
          return this.ticketsService.updateStatus(input.id, { status: input.status }, ctx.headers);
        }),

      finalize: this.trpc.publicProcedure
        .input(
          z.object({
            id: z.string().trim().min(1),
            data: ticketModuleUpdateRequestSchema.pick({
              resolutionSummary: true,
              resolutionVideoUrl: true,
              releaseType: true,
              releaseTitle: true,
              releaseModule: true,
              publishToReleases: true,
              followUpTask: true,
            }),
          }),
        )
        .mutation(({ input, ctx }) => {
          return this.ticketsService.updateStatus(
            input.id,
            {
              status: 'RESOLVED',
              ...input.data,
            },
            ctx.headers,
          );
        }),

      assignToMe: this.trpc.publicProcedure
        .input(z.object({ id: z.string().trim().min(1) }))
        .mutation(({ input, ctx }) => {
          return this.ticketsService.assignToMe(input.id, ctx.headers);
        }),

      updateOwners: this.trpc.publicProcedure
        .input(
          z.object({
            id: z.string().trim().min(1),
            data: ticketModuleUpdateRequestSchema.pick({
              supportOwnerUserId: true,
              developmentOwnerUserId: true,
            }),
          }),
        )
        .mutation(({ input, ctx }) => {
          return this.ticketsService.updateStatus(input.id, input.data, ctx.headers);
        }),

      triage: this.trpc.publicProcedure
        .input(
          z.object({
            id: z.string().trim().min(1),
            data: ticketModuleTriageRequestSchema,
          }),
        )
        .mutation(({ input, ctx }) => {
          return this.ticketsService.triageTicket(input.id, input.data, ctx.headers);
        }),

      customerEmails: this.trpc.publicProcedure
        .input(
          z.object({
            q: z.string().trim().optional(),
            limit: z.number().int().min(1).max(30).optional(),
          }),
        )
        .query(({ input, ctx }) => {
          return this.ticketsService.findCustomerOptions(
            { q: input.q, limit: input.limit !== undefined ? String(input.limit) : undefined },
            ctx.headers,
          );
        }),
    });
  }
}
