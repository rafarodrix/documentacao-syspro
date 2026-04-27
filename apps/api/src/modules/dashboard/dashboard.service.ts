import { Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { Role } from '@prisma/client';
import type {
  DashboardCrmSummary,
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

function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
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
    case 'WAITING_INTERNAL':
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

function buildCrmSummary(leads: any[]): DashboardCrmSummary {
  const today = startOfDay();
  const stages: Array<'LEAD' | 'MQL' | 'SQL' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST'> = [
    'LEAD',
    'MQL',
    'SQL',
    'PROPOSAL',
    'NEGOTIATION',
    'WON',
    'LOST',
  ];
  const stageLabels: Record<string, string> = {
    LEAD: 'Lead',
    MQL: 'MQL',
    SQL: 'SQL',
    PROPOSAL: 'Proposta',
    NEGOTIATION: 'Negociacao',
    WON: 'Ganho',
    LOST: 'Perdido',
  };

  const activeLeads = leads.filter((lead) => lead.stage !== 'WON' && lead.stage !== 'LOST');
  const wonLeads = leads.filter((lead) => lead.stage === 'WON');
  const lostLeads = leads.filter((lead) => lead.stage === 'LOST');
  const proposalLeads = leads.filter((lead) => lead.stage === 'PROPOSAL');
  const negotiationLeads = leads.filter((lead) => lead.stage === 'NEGOTIATION');
  const overdueLeads = activeLeads.filter((lead) => {
    if (!lead.expectedCloseAt) return false;
    return new Date(lead.expectedCloseAt) < today;
  });
  const noNextStepLeads = activeLeads.filter((lead) => !String(lead.nextStep ?? '').trim());

  return {
    activeLeads: activeLeads.length,
    proposalLeads: proposalLeads.length,
    negotiationLeads: negotiationLeads.length,
    wonLeads: wonLeads.length,
    lostLeads: lostLeads.length,
    overdueLeads: overdueLeads.length,
    noNextStepLeads: noNextStepLeads.length,
    pipelineValue: activeLeads.reduce((sum, lead) => sum + Number(lead.estimatedValue ?? 0), 0),
    wonValue: wonLeads.reduce((sum, lead) => sum + Number(lead.estimatedValue ?? 0), 0),
    stageDistribution: stages.map((stage) => ({
      stage,
      label: stageLabels[stage],
      count: leads.filter((lead) => lead.stage === stage).length,
    })),
  };
}

function getDashboardTicketTeam(role: Role): 'SUPORTE' | 'DESENVOLVIMENTO' | undefined {
  if (role === Role.DEVELOPER) return 'DESENVOLVIMENTO';
  if (role === Role.SUPORTE) return 'SUPORTE';
  return undefined;
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

  private buildScopedCompaniesWhere(companyIds?: string[]) {
    if (!companyIds) {
      return { deletedAt: null as null };
    }

    if (companyIds.length === 0) {
      return { deletedAt: null as null, id: { in: ['__no_company_scope__'] } };
    }

    return {
      deletedAt: null as null,
      id: { in: companyIds },
    };
  }

  private buildScopedUsersWhere(companyIds?: string[]) {
    if (!companyIds) {
      return { deletedAt: null as null };
    }

    if (companyIds.length === 0) {
      return { deletedAt: null as null, id: { in: ['__no_user_scope__'] } };
    }

    return {
      deletedAt: null as null,
      OR: [
        { memberships: { some: { companyId: { in: companyIds } } } },
        { contact: { is: { companyLinks: { some: { companyId: { in: companyIds } } } } } },
        { contactLinks: { some: { companyId: { in: companyIds } } } },
      ],
    };
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
        canViewCompaniesModule,
        canViewContactsDirect,
        canViewContactsScoped,
        canViewContactsGlobal,
        canViewUsersDirect,
        canViewUsersScoped,
        canViewUsersGlobal,
        companyScope,
        contactScope,
        userScope,
      ] = await Promise.all([
        this.authorizationService.userHasPermission(requester, 'companies:view', { acceptCompanyScope: true }),
        this.authorizationService.userHasPermission(requester, 'contacts:view', { acceptCompanyScope: true }),
        this.authorizationService.userHasPermission(requester, 'contacts:view_team', { acceptCompanyScope: true }),
        this.authorizationService.userHasPermission(requester, 'contacts:view_all'),
        this.authorizationService.userHasPermission(requester, 'users:view', { acceptCompanyScope: true }),
        this.authorizationService.userHasPermission(requester, 'users:view_team', { acceptCompanyScope: true }),
        this.authorizationService.userHasPermission(requester, 'users:view_all'),
        this.authorizationService.resolveCompanyAccessScope(requester, 'companies:view_own', 'companies:view_all'),
        this.authorizationService.resolveCompanyAccessScope(requester, 'contacts:view_team', 'contacts:view_all'),
        this.authorizationService.resolveCompanyAccessScope(requester, 'users:view_team', 'users:view_all'),
      ]);
      const canViewCrm =
        (await this.authorizationService.userHasPermission(requester, 'crm:view', { acceptCompanyScope: true })) ||
        (await this.authorizationService.userHasPermission(requester, 'crm:manage', { acceptCompanyScope: true }));
      const canViewContactsModule = canViewContactsDirect || canViewContactsScoped || canViewContactsGlobal;
      const canViewUsersModule = canViewUsersGlobal || canViewUsersScoped || canViewUsersDirect;

      const scopedCompanyIds = companyScope.isGlobal ? undefined : companyScope.companyIds;
      const scopedContactIds = contactScope.isGlobal ? undefined : contactScope.companyIds;
      const scopedUserIds = userScope.isGlobal ? undefined : userScope.companyIds;
      const companyBaseWhere = this.buildScopedCompaniesWhere(scopedCompanyIds);
      const userBaseWhere = this.buildScopedUsersWhere(scopedUserIds);
      const dashboardTicketTeam = getDashboardTicketTeam(requester.role);

      const [
        companiesCount,
        companiesThisMonth,
        companiesLastMonth,
        usersCount,
        activeUsersCount,
        contactsCount,
        recentCompanies,
        recentContacts,
        recentUsers,
        sefazRecords,
        companyActivity,
        crmLeads,
        activeContracts,
      ] = await Promise.all([
        canViewCompaniesModule
          ? this.prisma.company.count({ where: { ...companyBaseWhere, status: 'ACTIVE' } })
          : Promise.resolve(0),
        canViewCompaniesModule
          ? this.prisma.company.count({
              where: { ...companyBaseWhere, createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
            })
          : Promise.resolve(0),
        canViewCompaniesModule
          ? this.prisma.company.count({
              where: {
                ...companyBaseWhere,
                createdAt: {
                  gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                  lt: new Date(now.getFullYear(), now.getMonth(), 1),
                },
              },
            })
          : Promise.resolve(0),
        this.prisma.user.count({ where: userBaseWhere }),
        this.prisma.user.count({ where: { ...userBaseWhere, isActive: true } }),
        canViewContactsModule
          ? this.prisma.companyContactCompanyLink.count({
              where: scopedContactIds ? { companyId: { in: scopedContactIds } } : undefined,
            })
          : Promise.resolve(0),
        canViewCompaniesModule
          ? this.prisma.company.findMany({
              where: companyBaseWhere,
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
                contactLinks: { select: { id: true } },
                addresses: { take: 1, select: { cidade: true, estado: true } },
              },
            })
          : Promise.resolve([]),
        canViewContactsModule
          ? (this.prisma.companyContact as any).findMany({
              where: scopedContactIds
                ? {
                    status: { not: 'ARCHIVED' },
                    companyLinks: { some: { companyId: { in: scopedContactIds } } },
                  }
                : { status: { not: 'ARCHIVED' } },
              orderBy: [{ createdAt: 'desc' }],
              take: 5,
              select: {
                id: true,
                name: true,
                email: true,
                whatsapp: true,
                createdAt: true,
                companyLinks: {
                  orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                  select: {
                    company: {
                      select: {
                        nomeFantasia: true,
                        razaoSocial: true,
                      },
                    },
                  },
                },
              },
            })
          : Promise.resolve([]),
        canViewUsersModule
          ? this.prisma.user.findMany({
              where: userBaseWhere,
              orderBy: [{ createdAt: 'desc' }],
              take: 5,
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                memberships: {
                  orderBy: [{ createdAt: 'asc' }],
                  select: {
                    company: {
                      select: {
                        nomeFantasia: true,
                        razaoSocial: true,
                      },
                    },
                  },
                },
              },
            })
          : Promise.resolve([]),
        this.prisma.sefazStatusCurrent.findMany({
          where: { uf: dashboardUF },
          orderBy: { checkedAt: 'desc' },
          distinct: ['service'],
          take: 2,
        }),
        canViewCompaniesModule
          ? this.prisma.company.findMany({
              where: { ...companyBaseWhere, createdAt: { gte: start } },
              select: { createdAt: true },
            })
          : Promise.resolve([]),
        canViewCrm
          ? (this.prisma as any).crmLead.findMany({
              select: {
                stage: true,
                estimatedValue: true,
                expectedCloseAt: true,
                nextStep: true,
              },
            })
          : Promise.resolve([]),
        canViewCrm
          ? this.prisma.contract.findMany({
              where: { status: 'ACTIVE', ...companyBaseWhere },
              select: { totalValue: true },
            })
          : Promise.resolve([]),
      ]);

      let ticketWarning: string | undefined;
      let ticketsResponse: Awaited<ReturnType<TicketsService['findAll']>> | null = null;

      try {
        ticketsResponse = await withTimeout(
          this.ticketsService.findAll(
            {
              page: '1',
              pageSize: '50',
              ...(dashboardTicketTeam ? { team: dashboardTicketTeam } : {}),
            },
            rawHeaders,
          ),
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
        contactsCount: company.contactLinks.length,
        cidade: company.addresses[0]?.cidade ?? null,
        estado: company.addresses[0]?.estado ?? null,
      }));
      const contacts = recentContacts.map((contact: any) => ({
        id: contact.id,
        name: contact.name,
        email: contact.email ?? null,
        whatsapp: contact.whatsapp ?? null,
        createdAt: contact.createdAt.toISOString(),
        companyNames: Array.from(
          new Set(
            (contact.companyLinks ?? [])
              .map((link: any) => link.company?.nomeFantasia || link.company?.razaoSocial)
              .filter(Boolean),
          ),
        ),
      }));
      const users = recentUsers.map((user) => ({
        id: user.id,
        name: user.name?.trim() || user.email,
        email: user.email,
        role: String(user.role),
        createdAt: user.createdAt.toISOString(),
        companyNames: Array.from(
          new Set(
            (user.memberships ?? [])
              .map((membership: any) => membership.company?.nomeFantasia || membership.company?.razaoSocial)
              .filter(Boolean),
          ),
        ),
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
          contactsCount,
          canViewCompanies: canViewCompaniesModule,
          canViewContacts: canViewContactsModule,
          canViewUsers: canViewUsersModule || userScope.isGlobal,
          companies,
          recentContacts: contacts,
          recentUsers: users,
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
          crm: canViewCrm ? buildCrmSummary(crmLeads) : undefined,
          contracts: canViewCrm
            ? {
                activeContracts: activeContracts.length,
                totalValue: activeContracts.reduce((sum: number, c: any) => sum + Number(c.totalValue ?? 0), 0),
              }
            : undefined,
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
