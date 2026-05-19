import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { TarefasService } from './tarefas.service';

const JOB_INTERVAL_MS = Math.max(
  60_000,
  Number(process.env.TAREFAS_JOB_INTERVAL_MS ?? 10 * 60 * 1000),
);

@Injectable()
export class TarefasJobService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TarefasJobService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly tarefasService: TarefasService) {}

  onModuleInit() {
    this.logger.log(`Job de tarefas iniciado. Intervalo: ${JOB_INTERVAL_MS / 1000}s`);
    this.scheduleNext();
  }

  onModuleDestroy() {
    if (this.timer) clearTimeout(this.timer);
  }

  private scheduleNext() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.runJob(), JOB_INTERVAL_MS);
  }

  private async runJob() {
    if (this.running) {
      this.scheduleNext();
      return;
    }
    this.running = true;
    try {
      await this.tarefasService.runPeriodicJob();
    } catch (error) {
      this.logger.error('Erro no job periódico de tarefas', error);
    } finally {
      this.running = false;
      this.scheduleNext();
    }
  }
}
