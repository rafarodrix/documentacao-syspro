import { Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { Role } from '@prisma/client';
import type {
  DashboardDailyPassword,
  DashboardResponse,
  DashboardTicketKpis,
  DashboardTicketSummary,
} from '@dosc-syspro/contracts/dashboard';
import { getDailyPasswordForDate } from '@dosc-syspro/contracts/dashboard';
import type { TicketModuleRecord } from '@dosc-syspro/contracts/ticket';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { TicketsService } from '../tickets/tickets.service';

const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];
const DASHBOARD_TICKETS_TIMEOUT_MS = 4000;

function timeoutError(label: string, timeoutMs: number) {
  return new Error(`${label} excedeu ${timeoutMs}ms.`);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(timeoutError(label, timeoutMs)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function mergeTicketWarnings(...warnings: Array<string | undefined>) {
  const unique = Array.from(new Set(warnings.filter(Boolean)));
  return unique.length > 0 ? unique.join(' ') : undefined;
}

function getDashboardTimeoutWarning() {
  return 'Modulo de tickets em contingencia no dashboard. Alguns cards foram carregados com dados reduzidos.';
}

function getLast7DaysRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }

  return { start, days };
}

function toSeries(events: Date[]) {
  const { days } = getLast7DaysRange();
  const map = new Map<string, number>();

  for (const day of days) {
    const key = day.toISOString().slice(0, 10);
    map.set(key, 0);
  }

  for (const event of events) {
    const key = new Date(event).toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
  }

  return days.map((day) => {
    const key = day.toISOString().slice(0, 10);
    return {
      label: day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value: map.get(key) || 0,
    };
  });
}

function mapTicketStatus(status: string): DashboardTicketSummary['status'] {
  switch (status) {
    case 'RESOLVED':
    case 'ARCHIVED':
      return 'Resolvido';
    case 'WAITING_CUSTOMER':
      return 'Pendente';
    case 'IN_PROGRESS':
    case 'UNASSIGNED':
      return 'Em Análise';
    default:
      return 'Aberto';
  }
}

function mapTicketPriority(priority: string): DashboardTicketSummary['priority'] {
  switch (priority) {
    case 'HIGH':
    case 'CRITICAL':
      return 'Alta';
    case 'LOW':
      return 'Baixa';
    default:
      return 'Média';
  }
}

function toTicketSummaryItems(records: TicketModuleRecord[]): DashboardTicketSummary[] {
  return records.map((ticket) => ({
    id: ticket.id,
    number: ticket.ticketNumber || ticket.id.slice(0, 8).toUpperCase(),
    subject: ticket.subject || 'Sem assunto',
    status: mapTicketStatus(ticket.status),
    priority: mapTicketPriority(ticket.priority),
    lastUpdate: ticket.updatedAt,
  }));
}

function buildTicketKpis(records: DashboardTicketSummary[]): DashboardTicketKpis {
  const resolved = records.filter((ticket) => ticket.status === 'Resolvido').length;
  const pending = records.filter((ticket) => ticket.status === 'Pendente' || ticket.status === 'Em Análise').length;
  const open = records.filter((ticket) => ticket.status === 'Aberto').length;

  return { open, pending, resolved };
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly ticketsService: TicketsService,
  ) {}

  private async getUserDashboardUF(userId: string): Promise<string> {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        company: { deletedAt: null },
      },
      select: {
        company: {
          select: {
            addresses: {
              take: 1,
              orderBy: { id: 'asc' },
              select: { estado: true },
            },
          },
        },
      },
    });

    const state = membership?.company?.addresses?.[0]?.estado?.trim().toUpperCase();
    return state && state.length === 2 ? state : 'MG';
  }

  private async resolveDailyPassword(rawHeaders?: IncomingHttpHeaders): Promise<DashboardDailyPassword | null> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const allowed = await this.authorizationService.userHasPermission(
      requester,
      'dashboard:view_daily_password',
      { acceptCompanyScope: true },
    );

    return allowed ? getDailyPasswordForDate() : null;
  }

  async getDashboard(rawHeaders?: IncomingHttpHeaders): Promise<DashboardResponse> {
    const requester = await this.authorizationService.assertPermission(rawHeaders, 'dashboard:view');
    const dailyPassword = await this.resolveDailyPassword(rawHeaders);
    const isSystemUser = SYSTEM_ROLES.includes(requester.role);

    if (isSystemUser) {
      const dashboardUF = await this.getUserDashboardUF(requester.userId);
      const { start } = getLast7DaysRange();
      const now = new Date();

      const [
        companiesCount,
        companiesThisMonth,
        companiesLastMonth,
        usersCount,
        activeUsersCount,
        recentCompanies,
        sefazRecords,
        companyActivity,
      ] = await Promise.all([
        this.prisma.company.count({ where: { status: 'ACTIVE', deletedAt: null } }),
        this.prisma.company.count({
          where: { deletedAt: null, createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
        }),
        this.prisma.company.count({
          where: {
            deletedAt: null,
            createdAt: {
              gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
              lt: new Date(now.getFullYear(), now.getMonth(), 1),
            },
          },
        }),
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.user.count({ where: { isActive: true, deletedAt: null } }),
        this.prisma.company.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            razaoSocial: true,
            nomeFantasia: true,
            cnpj: true,
            status: true,
            createdAt: true,
            _count: { select: { memberships: true } },
            addresses: { take: 1, select: { cidade: true, estado: true } },
          },
        }),
        this.prisma.sefazStatusCurrent.findMany({
          where: { uf: dashboardUF },
          orderBy: { checkedAt: 'desc' },
          distinct: ['service'],
          take: 2,
        }),
        this.prisma.company.findMany({
          where: { deletedAt: null, createdAt: { gte: start } },
          select: { createdAt: true },
        }),
      ]);

      let ticketWarning: string | undefined;
      let ticketsResponse: Awaited<ReturnType<TicketsService['findAll']>> | null = null;

      try {
        ticketsResponse = await withTimeout(
          this.ticketsService.findAll({ page: '1', pageSize: '50' }, rawHeaders),
          DASHBOARD_TICKETS_TIMEOUT_MS,
          'Consulta de tickets do dashboard',
        );
      } catch {
        ticketWarning = getDashboardTimeoutWarning();
      }

      const records = ticketsResponse?.success && ticketsResponse.data ? ticketsResponse.data : [];
      const normalizedTickets = toTicketSummaryItems(records);
      const tickets = normalizedTickets.filter((ticket) => ticket.status !== 'Resolvido').slice(0, 5);
      const totalOpen =
        ticketsResponse?.success && ticketsResponse.statusCounts
          ? ticketsResponse.statusCounts.open + ticketsResponse.statusCounts.pending
          : normalizedTickets.filter((ticket) => ticket.status !== 'Resolvido').length;

      const companies = recentCompanies.map((company) => ({
        id: company.id,
        razaoSocial: company.razaoSocial,
        nomeFantasia: company.nomeFantasia,
        cnpj: company.cnpj,
        status: company.status,
        createdAt: company.createdAt.toISOString(),
        membershipsCount: company._count.memberships,
        cidade: company.addresses[0]?.cidade ?? null,
        estado: company.addresses[0]?.estado ?? null,
      }));

      const latestNfe = sefazRecords.find((item) => item.service === 'NFE');
      const latestNfce = sefazRecords.find((item) => item.service === 'NFCE');

      return {
        success: true,
        data: {
          mode: 'admin',
          dailyPassword,
          ticketWarning: mergeTicketWarnings(ticketWarning),
          companiesCount,
          companiesGrowth: companiesThisMonth - companiesLastMonth,
          usersCount,
          activeUsersCount,
          companies,
          sefazNfe: {
            uf: dashboardUF,
            service: 'NFE',
            status: latestNfe?.status ?? 'OFFLINE',
            latency: latestNfe?.latency ?? 0,
            checkedAt: latestNfe?.checkedAt.toISOString() ?? new Date(0).toISOString(),
            changedAt: latestNfe?.changedAt.toISOString() ?? new Date(0).toISOString(),
          },
          sefazNfce: {
            uf: dashboardUF,
            service: 'NFCE',
            status: latestNfce?.status ?? 'OFFLINE',
            latency: latestNfce?.latency ?? 0,
            checkedAt: latestNfce?.checkedAt.toISOString() ?? new Date(0).toISOString(),
            changedAt: latestNfce?.changedAt.toISOString() ?? new Date(0).toISOString(),
          },
          tickets,
          totalOpen,
          activity: toSeries(companyActivity.map((company) => company.createdAt)),
        },
      };
    }

    const memberships = await this.prisma.membership.findMany({
      where: { userId: requester.userId, company: { deletedAt: null } },
      orderBy: { company: { razaoSocial: 'asc' } },
      include: {
        company: {
          select: {
            nomeFantasia: true,
            razaoSocial: true,
            _count: { select: { memberships: true } },
          },
        },
      },
    });

    let ticketWarning: string | undefined;
    let ticketsResponse: Awaited<ReturnType<TicketsService['findAll']>> | null = null;

    try {
      ticketsResponse = await withTimeout(
        this.ticketsService.findAll({ page: '1', pageSize: '20' }, rawHeaders),
        DASHBOARD_TICKETS_TIMEOUT_MS,
        'Consulta de tickets do dashboard',
      );
    } catch {
      ticketWarning = getDashboardTimeoutWarning();
    }

    const records = ticketsResponse?.success && ticketsResponse.data ? ticketsResponse.data : [];
    const normalizedTickets = toTicketSummaryItems(records);
    const tickets = normalizedTickets.filter((ticket) => ticket.status !== 'Resolvido').slice(0, 10);
    const kpis =
      ticketsResponse?.success && ticketsResponse.statusCounts
        ? {
            open: ticketsResponse.statusCounts.open,
            pending: ticketsResponse.statusCounts.pending,
            resolved: ticketsResponse.statusCounts.closed,
          }
        : buildTicketKpis(normalizedTickets);

    const companyNames = memberships
      .map((membership) => membership.company.nomeFantasia || membership.company.razaoSocial)
      .filter(Boolean);
    const primaryMembership = memberships[0];

    return {
      success: true,
      data: {
        mode: 'client',
        dailyPassword,
        ticketWarning: mergeTicketWarnings(ticketWarning),
        companyName: primaryMembership?.company?.nomeFantasia || primaryMembership?.company?.razaoSocial || 'Sem empresa vinculada',
        companyUsers: primaryMembership?.company?._count?.memberships || 0,
        companyCount: companyNames.length,
        companyNames,
        tickets,
        totalOpen: kpis.open + kpis.pending,
        kpis,
        activity: toSeries(normalizedTickets.map((ticket) => new Date(ticket.lastUpdate))),
      },
    };
  }
}
