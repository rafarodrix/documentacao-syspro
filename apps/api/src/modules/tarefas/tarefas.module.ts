import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TrpcCoreModule } from '../trpc/trpc-core.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { EvolutionModule } from '../integrations/evolution/evolution.module';
import { SettingsModule } from '../settings/settings.module';
import { AutomationModule } from '../automation/automation.module';
import { TarefasRouter } from './tarefas.router';
import { TarefasService } from './tarefas.service';
import { TarefasJobService } from './tarefas-job.service';
import { TarefasSettingsService } from './tarefas-settings.service';

@Module({
  imports: [
    PrismaModule,
    AuthorizationModule,
    TrpcCoreModule,
    forwardRef(() => SettingsModule),
    forwardRef(() => EvolutionModule),
    forwardRef(() => AutomationModule),
  ],
  providers: [TarefasService, TarefasRouter, TarefasJobService, TarefasSettingsService],
  exports: [TarefasService, TarefasRouter, TarefasSettingsService],
})
export class TarefasModule {}
