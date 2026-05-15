import { Injectable } from '@nestjs/common';
import { monthlyRoutineCompanyConfigUpsertSchema, monthlyRoutineListQuerySchema } from '@dosc-syspro/contracts/rotinas-mensais';
import { z } from 'zod';
import { TrpcService } from '../trpc/trpc.service';
import { RotinasMensaisService } from './rotinas-mensais.service';

@Injectable()
export class RotinasMensaisRouter {
  public router!: ReturnType<typeof this.createRouter>;

  constructor(
    private readonly trpc: TrpcService,
    private readonly rotinasMensaisService: RotinasMensaisService,
  ) {
    this.router = this.createRouter();
  }

  private createRouter() {
    return this.trpc.router({
      list: this.trpc.publicProcedure
        .input(monthlyRoutineListQuerySchema)
        .query(({ input, ctx }) => {
          return this.rotinasMensaisService.list(input, ctx.headers);
        }),
      getCompanyConfig: this.trpc.publicProcedure
        .input(z.object({ companyId: z.string() }))
        .query(({ input, ctx }) => {
          return this.rotinasMensaisService.getCompanyConfig(input.companyId, ctx.headers);
        }),
      upsertCompanyConfig: this.trpc.publicProcedure
        .input(monthlyRoutineCompanyConfigUpsertSchema)
        .mutation(({ input, ctx }) => {
          return this.rotinasMensaisService.upsertCompanyConfig(input, ctx.headers);
        }),
    });
  }
}
