import { Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import type { DashboardResponse } from '@dosc-syspro/contracts/dashboard';
import { AuthorizationService } from '../authorization/authorization.service';
import { DashboardAdminSliceService } from './dashboard-admin.slice';
import { DashboardClientSliceService } from './dashboard-client.slice';
import { DashboardOperacionalSliceService } from './dashboard-operacional.slice';
import { DashboardSefazSliceService } from './dashboard-sefaz.slice';
import { DASHBOARD_VIEW_INTERNAL, DashboardSupportService } from './dashboard.support';
import { AtendimentosDashboardQuery } from './queries/atendimentos-dashboard.query';
import { CadastrosDashboardQuery } from './queries/cadastros-dashboard.query';
import { ComercialDashboardQuery } from './queries/comercial-dashboard.query';
import { SuporteTicketsDashboardQuery } from './queries/suporte-tickets-dashboard.query';
import { TarefasDashboardQuery } from './queries/tarefas-dashboard.query';

@Injectable()
export class DashboardService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly dashboardSupport: DashboardSupportService,
    private readonly dashboardAdminSlice: DashboardAdminSliceService,
    private readonly dashboardClientSlice: DashboardClientSliceService,
    private readonly dashboardOperacionalSlice: DashboardOperacionalSliceService,
    private readonly dashboardSefazSlice: DashboardSefazSliceService,
    private readonly suporteTicketsDashboardQuery: SuporteTicketsDashboardQuery,
    private readonly atendimentosDashboardQuery: AtendimentosDashboardQuery,
    private readonly tarefasDashboardQuery: TarefasDashboardQuery,
    private readonly cadastrosDashboardQuery: CadastrosDashboardQuery,
    private readonly comercialDashboardQuery: ComercialDashboardQuery,
  ) {}

  async getDashboard(rawHeaders?: IncomingHttpHeaders): Promise<DashboardResponse> {
    const requester = await this.authorizationService.assertPermission(rawHeaders, 'dashboard:view');
    const dailyPassword = await this.dashboardSupport.resolveDailyPassword(rawHeaders);
    const hasInternalDashboard = await this.authorizationService.userHasPermission(requester, DASHBOARD_VIEW_INTERNAL);

    if (hasInternalDashboard) {
      return this.dashboardAdminSlice.buildDashboard(rawHeaders, requester, dailyPassword);
    }

    return this.dashboardClientSlice.buildDashboard(rawHeaders, requester, dailyPassword);
  }

  async getOperacionalData(rawHeaders?: IncomingHttpHeaders) {
    return this.dashboardOperacionalSlice.getData(rawHeaders);
  }

  async getSuporteData(rawHeaders?: IncomingHttpHeaders) {
    return this.suporteTicketsDashboardQuery.execute(rawHeaders);
  }

  async getAtendimentosData(
    rawHeaders?: IncomingHttpHeaders,
    filters?: { from?: string; to?: string; assigneeId?: string; contact?: string; refresh?: boolean },
  ) {
    return this.atendimentosDashboardQuery.execute(rawHeaders, filters);
  }

  async getCadastrosData(rawHeaders?: IncomingHttpHeaders) {
    return this.cadastrosDashboardQuery.execute(rawHeaders);
  }

  async getComercialData(rawHeaders?: IncomingHttpHeaders) {
    return this.comercialDashboardQuery.execute(rawHeaders);
  }

  async getSefazStatus(rawHeaders?: IncomingHttpHeaders) {
    return this.dashboardSefazSlice.getStatus(rawHeaders);
  }

  async getTarefasData(rawHeaders?: IncomingHttpHeaders) {
    return this.tarefasDashboardQuery.execute(rawHeaders);
  }
}
