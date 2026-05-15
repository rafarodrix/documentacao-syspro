import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  ticketModuleStatusSchema,
  ticketModuleTriageRequestSchema,
  ticketModuleUpdateRequestSchema,
} from '@dosc-syspro/contracts/ticket';
import { TrpcService } from '../trpc/trpc.service';
import { TicketsService } from './tickets.service';

@Injectable()
export class TicketsRouter {
  public router!: ReturnType<typeof this.createRouter>;

  constructor(
    private readonly trpc: TrpcService,
    private readonly ticketsService: TicketsService,
  ) {
    this.router = this.createRouter();
  }

  private createRouter() {
    return this.trpc.router({
      archive: this.trpc.publicProcedure
        .input(z.object({ id: z.string().trim().min(1) }))
        .mutation(({ input, ctx }) => {
          return this.ticketsService.archiveTicket(input.id, ctx.headers);
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
    });
  }
}
