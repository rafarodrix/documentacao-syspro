import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RotinasMensaisService } from './rotinas-mensais.service';

const JOB_INTERVAL_MS = Math.max(
  60_000,
  Number(process.env.MONTHLY_ROUTINES_JOB_INTERVAL_MS ?? 10 * 60 * 1000),
);

@Injectable()
export class RotinasMensaisJobService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RotinasMensaisJobService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly rotinasMensaisService: RotinasMensaisService) {}

  onModuleInit() {
    this.logger.log(`Job de rotinas mensais iniciado. Intervalo: ${JOB_INTERVAL_MS / 1000}s`);
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
      await this.rotinasMensaisService.runPeriodicJob();
    } catch (error) {
      this.logger.error('Erro no job periódico de rotinas mensais', error);
    } finally {
      this.running = false;
      this.scheduleNext();
    }
  }
}
