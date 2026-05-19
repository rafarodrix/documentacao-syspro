import { Injectable } from '@nestjs/common';
import {
  taskListQuerySchema,
  taskItemListQuerySchema,
  taskConfigUpsertSchema,
  taskSendManualRequestSchema,
  taskSyncCompetenciesSchema,
  taskUpdateStatusSchema,
  createTaskSchema,
} from '@dosc-syspro/contracts/tarefas';
import { z } from 'zod';
import { TrpcService } from '../trpc/trpc.service';
import { TarefasService } from './tarefas.service';

@Injectable()
export class TarefasRouter {
  public router!: ReturnType<typeof this.createRouter>;

  constructor(
    private readonly trpc: TrpcService,
    private readonly tarefasService: TarefasService,
  ) {
    this.router = this.createRouter();
  }

  private createRouter() {
    return this.trpc.router({
      list: this.trpc.publicProcedure
        .input(taskListQuerySchema)
        .query(({ input, ctx }) => {
          return this.tarefasService.list(input, ctx.headers);
        }),
      listTasks: this.trpc.publicProcedure
        .input(taskItemListQuerySchema)
        .query(({ input, ctx }) => {
          return this.tarefasService.listTasks(input, ctx.headers);
        }),
      getCompanyConfig: this.trpc.publicProcedure
        .input(z.object({ companyId: z.string().min(1) }))
        .query(({ input, ctx }) => {
          return this.tarefasService.getCompanyConfig(input.companyId, ctx.headers);
        }),
      getTask: this.trpc.publicProcedure
        .input(z.object({ id: z.string().min(1) }))
        .query(({ input, ctx }) => {
          return this.tarefasService.getTask(input.id, ctx.headers);
        }),
      upsertCompanyConfig: this.trpc.publicProcedure
        .input(taskConfigUpsertSchema)
        .mutation(({ input, ctx }) => {
          return this.tarefasService.upsertCompanyConfig(input, ctx.headers);
        }),
      createTask: this.trpc.publicProcedure
        .input(createTaskSchema)
        .mutation(({ input, ctx }) => {
          return this.tarefasService.createTask(input, ctx.headers);
        }),
      syncCompetencies: this.trpc.publicProcedure
        .input(taskSyncCompetenciesSchema)
        .mutation(({ input, ctx }) => {
          return this.tarefasService.syncCompetencies(input, ctx.headers);
        }),
      sendManualRequest: this.trpc.publicProcedure
        .input(taskSendManualRequestSchema)
        .mutation(({ input, ctx }) => {
          return this.tarefasService.sendManualRequest(input, ctx.headers);
        }),
      updateTaskStatus: this.trpc.publicProcedure
        .input(taskUpdateStatusSchema)
        .mutation(({ input, ctx }) => {
          return this.tarefasService.updateTaskStatus(input, ctx.headers);
        }),
    });
  }
}
