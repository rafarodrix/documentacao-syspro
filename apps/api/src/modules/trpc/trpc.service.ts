import { Injectable } from '@nestjs/common';
import { initTRPC } from '@trpc/server';
import type { Context } from './trpc.context';

@Injectable()
export class TrpcService {
  public trpc = initTRPC.context<Context>().create();
  public publicProcedure = this.trpc.procedure;
  public router = this.trpc.router;
  public mergeRouters = this.trpc.mergeRouters;
}
