import { Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import type { DashboardDailyPassword, DashboardResponse } from '@dosc-syspro/contracts/dashboard';
import { PrismaService } from '../../prisma/prisma.service';
import { buildTicketKpis, toSeries } from './dashboard.shared';
import {
  type DashboardRequester,
  DashboardSupportService,
  mergeTicketWarnings,
  resolveDashboardUFsFromMembershipCompanies,
} from './dashboard.support';

@Injectable()
export class DashboardClientSliceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardSupport: DashboardSupportService,
  ) {}

  async buildDashboard(
    rawHeaders: IncomingHttpHeaders | undefined,
    requester: DashboardRequester,
    dailyPassword: DashboardDailyPassword | null,
  ): Promise<DashboardResponse> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId: requester.userId, company: { deletedAt: null } },
      orderBy: { company: { razaoSocial: 'asc' } },
      include: {
        company: {
          select: {
            nomeFantasia: true,
            razaoSocial: true,
            _count: { select: { memberships: true } },
            addresses: { select: { estado: true } },
          },
        },
      },
    });

    const companyNames = memberships
      .map((membership) => membership.company.nomeFantasia || membership.company.razaoSocial)
      .filter(Boolean);
    const primaryMembership = memberships[0];
    const dashboardUFs = resolveDashboardUFsFromMembershipCompanies(memberships);

    const [ticketData, sefazData] = await Promise.all([
      this.dashboardSupport.fetchDashboardTickets(rawHeaders, 'Consulta de tickets do dashboard'),
      this.dashboardSupport.fetchSefazStatusData(dashboardUFs),
    ]);

    const tickets = ticketData.normalizedTickets.filter((ticket) => ticket.status !== 'Resolvido').slice(0, 10);
    const kpis =
      ticketData.ticketsResponse?.success && ticketData.ticketsResponse.statusCounts
        ? {
            open: ticketData.ticketsResponse.statusCounts.open,
            pending: ticketData.ticketsResponse.statusCounts.development + ticketData.ticketsResponse.statusCounts.testing,
            resolved: ticketData.ticketsResponse.statusCounts.closed,
          }
        : buildTicketKpis(ticketData.normalizedTickets);

    return {
      success: true,
      data: {
        mode: 'client',
        dailyPassword,
        ticketWarning: mergeTicketWarnings(ticketData.ticketWarning),
        companyName:
          primaryMembership?.company?.nomeFantasia || primaryMembership?.company?.razaoSocial || 'Sem empresa vinculada',
        companyUsers: primaryMembership?.company?._count?.memberships || 0,
        companyCount: companyNames.length,
        companyNames,
        sefazFocusUfs: dashboardUFs,
        sefazStatuses: sefazData.sefazStatuses,
        sefazNationalStatuses: sefazData.sefazNationalStatuses,
        sefazConfiguredRoutes: sefazData.configuredSefazRoutes,
        tickets,
        openTicketRecords: ticketData.openTicketRecords,
        totalOpen: kpis.open + kpis.pending,
        kpis,
        activity: toSeries(ticketData.normalizedTickets.map((ticket) => new Date(ticket.lastUpdate))),
      },
    };
  }
}
