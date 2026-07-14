import { Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { Role } from '@prisma/client';
import { AuthorizationService } from '../../authorization/authorization.service';
import { TicketsService } from '../../tickets/tickets.service';
import {
  DASHBOARD_TICKETS_TIMEOUT_MS,
  getDashboardTimeoutWarning,
  toOpenTicketRecordItems,
  toSeries,
  toTicketSummaryItems,
  withTimeout,
} from '../dashboard.shared';

@Injectable()
export class SuporteTicketsDashboardQuery {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly ticketsService: TicketsService,
  ) {}

  private async getDashboardTicketTeam(requester: { userId: string; role: Role; email: string }) {
    const hasDevelopmentScope = await this.authorizationService.userHasPermission(
      requester,
      'dashboard:view_development_scope',
    );

    return hasDevelopmentScope ? 'DESENVOLVIMENTO' : undefined;
  }

  async execute(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.assertPermission(rawHeaders, 'dashboard:view');

    const dashboardTicketTeam = await this.getDashboardTicketTeam(requester);
    const allowAreaFilter = await this.authorizationService.userHasPermission(requester, 'dashboard:stats_full');

    let ticketWarning: string | undefined;
    let ticketsResponse: Awaited<ReturnType<TicketsService['findAll']>> | null = null;

    try {
      ticketsResponse = await withTimeout(
        this.ticketsService.findAll(
          { page: '1', pageSize: '200', ...(dashboardTicketTeam ? { team: dashboardTicketTeam } : {}) },
          rawHeaders,
        ),
        DASHBOARD_TICKETS_TIMEOUT_MS,
        'Suporte tickets',
      );
    } catch {
      ticketWarning = getDashboardTimeoutWarning();
    }

    const records = ticketsResponse?.success && ticketsResponse.data ? ticketsResponse.data : [];
    const normalizedTickets = toTicketSummaryItems(records);
    const openTicketRecords = toOpenTicketRecordItems(records);
    const tickets = normalizedTickets.filter((ticket) => ticket.status !== 'RESOLVED' && ticket.status !== 'ARCHIVED').slice(0, 5);
    const totalOpen =
      ticketsResponse?.success && ticketsResponse.statusCounts
        ? ticketsResponse.statusCounts.open +
          ticketsResponse.statusCounts.development +
          ticketsResponse.statusCounts.testing
        : normalizedTickets.filter((ticket) => ticket.status !== 'RESOLVED' && ticket.status !== 'ARCHIVED').length;

    return {
      success: true as const,
      data: {
        openTicketRecords,
        tickets,
        totalOpen,
        activity: toSeries(normalizedTickets.map((ticket) => new Date(ticket.lastUpdate))),
        ticketWarning,
        scopeMode: (dashboardTicketTeam === 'DESENVOLVIMENTO' ? 'development' : 'all') as 'all' | 'development',
        allowAreaFilter,
      },
    };
  }
}
