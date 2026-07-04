import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { ChatwootModule } from '../integrations/chatwoot/chatwoot.module';
import { TicketsModule } from '../tickets/tickets.module';
import { DashboardAdminSliceService } from './dashboard-admin.slice';
import { DashboardController } from './dashboard.controller';
import { DashboardClientSliceService } from './dashboard-client.slice';
import { DashboardOperacionalSliceService } from './dashboard-operacional.slice';
import { DashboardSefazSliceService } from './dashboard-sefaz.slice';
import { DashboardService } from './dashboard.service';
import { DashboardSupportService } from './dashboard.support';
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
    DashboardSupportService,
    DashboardAdminSliceService,
    DashboardClientSliceService,
    DashboardOperacionalSliceService,
    DashboardSefazSliceService,
    SuporteTicketsDashboardQuery,
    AtendimentosDashboardQuery,
    TarefasDashboardQuery,
    CadastrosDashboardQuery,
    ComercialDashboardQuery,
  ],
  exports: [DashboardService],
})
export class DashboardModule {}
