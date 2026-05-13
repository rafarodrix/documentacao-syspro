import { Injectable } from '@nestjs/common';
import { TrpcService } from '../trpc/trpc.service';
import { DocsService } from './docs.service';
import {
  docsRegisterViewInputSchema,
  docsSubmitFeedbackInputSchema,
  docsSubmitFeedbackResultSchema,
} from '@dosc-syspro/contracts/docs';

@Injectable()
export class DocsRouter {
  public router!: ReturnType<typeof this.createRouter>;

  constructor(
    private readonly trpc: TrpcService,
    private readonly docsService: DocsService,
  ) {
    this.router = this.createRouter();
  }

  private createRouter() {
    return this.trpc.router({
      getViews: this.trpc.publicProcedure.query(({ ctx }) => {
        return this.docsService.getViews(ctx.headers);
      }),
      registerView: this.trpc.publicProcedure
        .input(docsRegisterViewInputSchema)
        .mutation(({ input, ctx }) => {
          return this.docsService.registerView(input, ctx.headers);
        }),
      submitFeedback: this.trpc.publicProcedure
        .input(docsSubmitFeedbackInputSchema)
        .mutation(({ input }) => {
          // Future enhancement: save to DB. For now, log and acknowledge
          console.info("[docs.feedback] from tRPC", input);
          return docsSubmitFeedbackResultSchema.parse({ ok: true });
        }),
    });
  }
}
