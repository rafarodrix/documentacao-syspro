import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { ChatwootModule } from '../integrations/chatwoot/chatwoot.module';
import { TicketsModule } from '../tickets/tickets.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AtendimentosDashboardQuery } from './queries/atendimentos-dashboard.query';
import { CadastrosDashboardQuery } from './queries/cadastros-dashboard.query';
import { ComercialDashboardQuery } from './queries/comercial-dashboard.query';
import { SuporteTicketsDashboardQuery } from './queries/suporte-tickets-dashboard.query';
import { TarefasDashboardQuery } from './queries/tarefas-dashboard.query';

@Module({
  imports: [PrismaModule, TicketsModule, SettingsModule, ChatwootModule],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    SuporteTicketsDashboardQuery,
    AtendimentosDashboardQuery,
    TarefasDashboardQuery,
    CadastrosDashboardQuery,
    ComercialDashboardQuery,
  ],
  exports: [DashboardService],
})
export class DashboardModule {}
