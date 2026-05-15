import { Injectable } from '@nestjs/common';
import { z } from 'zod';
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
    });
  }
}
