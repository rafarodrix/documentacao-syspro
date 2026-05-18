import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TrpcCoreModule } from '../trpc/trpc-core.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { EvolutionModule } from '../integrations/evolution/evolution.module';
import { SettingsModule } from '../settings/settings.module';
import { AutomationModule } from '../automation/automation.module';
import { RotinasMensaisRouter } from './rotinas-mensais.router';
import { RotinasMensaisService } from './rotinas-mensais.service';
import { RotinasMensaisJobService } from './rotinas-mensais-job.service';
import { RotinasMensaisSettingsService } from './rotinas-mensais-settings.service';

@Module({
  imports: [PrismaModule, AuthorizationModule, TrpcCoreModule, SettingsModule, EvolutionModule, AutomationModule],
  providers: [RotinasMensaisService, RotinasMensaisRouter, RotinasMensaisJobService, RotinasMensaisSettingsService],
  exports: [RotinasMensaisService, RotinasMensaisRouter, RotinasMensaisSettingsService],
})
export class RotinasMensaisModule {}
