import { Injectable } from '@nestjs/common';
import { TrpcService } from './trpc.service';

@Injectable()
export class TrpcRouter {
  public appRouter!: ReturnType<typeof this.createRouter>;

  constructor(private readonly trpc: TrpcService) {
    this.appRouter = this.createRouter();
  }

  private createRouter() {
    return this.trpc.router({
      hello: this.trpc.publicProcedure.query(() => {
        return { message: 'Hello from tRPC inside NestJS!' };
      }),
    });
  }
}

export type AppRouter = TrpcRouter['appRouter'];
