import { Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { AuthorizationService } from '../authorization/authorization.service';
import { toSeries } from './dashboard.shared';
import { DashboardSupportService } from './dashboard.support';

@Injectable()
export class DashboardOperacionalSliceService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly dashboardSupport: DashboardSupportService,
  ) {}

  async getData(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.assertPermission(rawHeaders, 'dashboard:view');

    const [dailyPassword, dashboardUFs] = await Promise.all([
      this.dashboardSupport.resolveDailyPassword(rawHeaders),
      this.dashboardSupport.getUserDashboardUFs(requester.userId),
    ]);

    const [dashboardTicketTeam, crmAccess, sefazData] = await Promise.all([
      this.dashboardSupport.getDashboardTicketTeam(requester),
      this.dashboardSupport.resolveDashboardCrmAccess(requester),
      this.dashboardSupport.fetchSefazStatusData(dashboardUFs),
    ]);
    const ticketData = await this.dashboardSupport.fetchDashboardTickets(
      rawHeaders,
      'Operacional tickets',
      dashboardTicketTeam,
    );

    const scopedTicketRecords = dashboardTicketTeam
      ? ticketData.openTicketRecords.filter((record) => record.team === dashboardTicketTeam)
      : ticketData.openTicketRecords;
    const sefazRecords = sefazData.sefazRecords;
    const contracts = crmAccess.canViewCrm
      ? await this.dashboardSupport.loadScopedContractsSummary(crmAccess.scopedCompanyIds)
      : undefined;

    const tickets = ticketData.normalizedTickets.filter((ticket) => ticket.status !== 'Resolvido').slice(0, 5);
    const totalOpen =
      ticketData.ticketsResponse?.success && ticketData.ticketsResponse.statusCounts
        ? ticketData.ticketsResponse.statusCounts.open +
          ticketData.ticketsResponse.statusCounts.development +
          ticketData.ticketsResponse.statusCounts.testing
        : ticketData.normalizedTickets.filter((ticket) => ticket.status !== 'Resolvido').length;

    const hasSefazOffline = sefazRecords.some((record) => record.status === 'OFFLINE');
    const hasSefazUnstable = sefazRecords.some((record) => record.status === 'UNSTABLE');
    const sefazHealth = hasSefazOffline
      ? 'offline'
      : hasSefazUnstable
        ? 'unstable'
        : sefazRecords.length > 0
          ? 'online'
          : 'unknown';

    const progressStatuses = new Set(['IN_PROGRESS', 'UNASSIGNED', 'WAITING_CUSTOMER', 'WAITING_INTERNAL']);
    const closedStatuses = new Set(['RESOLVED', 'ARCHIVED']);

    const ticketFlow = {
      opened: toSeries(
        ticketData.records
          .filter((record) => !progressStatuses.has(record.status) && !closedStatuses.has(record.status))
          .map((record) => new Date(record.createdAt)),
      ),
      inProgress: toSeries(
        ticketData.records
          .filter((record) => progressStatuses.has(record.status))
          .map((record) => new Date(record.updatedAt)),
      ),
      closed: toSeries(
        ticketData.records
          .filter((record) => closedStatuses.has(record.status))
          .map((record) => new Date(record.updatedAt)),
      ),
    };

    return {
      success: true as const,
      data: {
        dailyPassword,
        ticketCounts: {
          total: scopedTicketRecords.length,
          support: scopedTicketRecords.filter((record) => record.team === 'SUPORTE').length,
          development: scopedTicketRecords.filter((record) => record.team === 'DESENVOLVIMENTO').length,
          waiting: scopedTicketRecords.filter((record) => record.status === 'Aberto').length,
          inProgress: scopedTicketRecords.filter((record) => record.status !== 'Aberto').length,
        },
        sefazHealth: sefazHealth as 'online' | 'unstable' | 'offline' | 'unknown',
        sefazRoutesCount: sefazData.configuredSefazRoutes.filter((route) => route.active).length,
        contracts,
        ticketFlow,
        tickets,
        totalOpen,
        ticketWarning: ticketData.ticketWarning,
      },
    };
  }
}
