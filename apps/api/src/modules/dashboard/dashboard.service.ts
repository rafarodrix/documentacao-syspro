import { Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { Prisma, type Role } from '@prisma/client';
import type {
  DashboardCrmSummary,
  DashboardDailyPassword,
  DashboardResponse,
  DashboardTarefasOverdueItem,
} from '@dosc-syspro/contracts/dashboard';
import { getDailyPasswordForDate } from '@dosc-syspro/contracts/dashboard';
import { buildDefaultSefazRoutes } from '@dosc-syspro/contracts/sefaz-endpoints';
import { sefazRoutesSchema } from '@dosc-syspro/contracts/sefaz-routes';
import { SETTING_KEYS } from '@dosc-syspro/contracts/settings';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { TicketsService } from '../tickets/tickets.service';
import {
  DASHBOARD_TICKETS_TIMEOUT_MS,
  averageDurationInMinutes,
  buildTicketKpis,
  extractChatwootAssignee,
  extractChatwootChannel,
  extractChatwootContactSummary,
  extractChatwootContactText,
  extractChatwootConversationCustomAttributes,
  extractChatwootConversationLabels,
  getDashboardTimeoutWarning,
  getLast7DaysRange,
  mapConversationStatus,
  parseChatwootDate,
  parseDateInput,
  readTicketMetadataString,
  resolveChatwootClosureOrigin,
  shouldSkipChatwootCsat,
  startOfDay,
  toOpenTicketRecordItems,
  toSeries,
  toTicketSummaryItems,
  withTimeout,
} from './dashboard.shared';
import { AtendimentosDashboardQuery } from './queries/atendimentos-dashboard.query';
import { CadastrosDashboardQuery } from './queries/cadastros-dashboard.query';
import { ComercialDashboardQuery } from './queries/comercial-dashboard.query';
import { SuporteTicketsDashboardQuery } from './queries/suporte-tickets-dashboard.query';
import { TarefasDashboardQuery } from './queries/tarefas-dashboard.query';

const DASHBOARD_VIEW_INTERNAL = 'dashboard:view_internal' as const;

function mergeTicketWarnings(...warnings: Array<string | undefined>) {
  const unique = Array.from(new Set(warnings.filter(Boolean)));
  return unique.length > 0 ? unique.join(' ') : undefined;
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

type DashboardContractRecord = {
  totalValue?: number | string | { toNumber(): number } | null;
  minimumWage?: number | string | { toNumber(): number } | null;
  percentage?: number | string | { toNumber(): number } | null;
  taxRate?: number | string | { toNumber(): number } | null;
  programmerRate?: number | string | { toNumber(): number } | null;
};

function toDecimalNumber(value: DashboardContractRecord[keyof DashboardContractRecord]) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value && typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  return 0;
}

function calculateContractMonthlyValue(contract: DashboardContractRecord) {
  const minimumWage = toDecimalNumber(contract.minimumWage);
  const percentage = toDecimalNumber(contract.percentage);
  const taxRate = toDecimalNumber(contract.taxRate);
  const programmerRate = toDecimalNumber(contract.programmerRate);

  if (minimumWage > 0 && percentage > 0) {
    const gross = minimumWage * (percentage / 100);
    const taxDeduction = gross * (taxRate / 100);
    const partnerDeduction = gross * (programmerRate / 100);
    return gross - taxDeduction - partnerDeduction;
  }

  return toDecimalNumber(contract.totalValue);
}

function summarizeActiveContracts(contracts: DashboardContractRecord[]) {
  return {
    activeContracts: contracts.length,
    totalValue: contracts.reduce((sum, contract) => sum + calculateContractMonthlyValue(contract), 0),
  };
}

type DashboardSefazCurrentRecord = {
  uf: string;
  service: 'NFE' | 'NFCE' | 'CTE' | 'MDFE';
  status: 'ONLINE' | 'UNSTABLE' | 'OFFLINE';
  latency: number;
  checkedAt: Date;
  changedAt: Date;
};

type DashboardSefazHistoryRecord = {
  uf: string;
  service: 'NFE' | 'NFCE' | 'CTE' | 'MDFE';
  status: 'ONLINE' | 'UNSTABLE' | 'OFFLINE';
  latency: number;
};

function buildSefazHistoryMap(historyRecords: DashboardSefazHistoryRecord[]) {
  const historyMap = new Map<string, Array<{ status: string; latency: number }>>();

  for (const record of historyRecords) {
    const key = `${record.uf}:${record.service}`;
    if (!historyMap.has(key)) historyMap.set(key, []);
    historyMap.get(key)!.push({ status: record.status, latency: record.latency });
  }

  return historyMap;
}

function computeSefazMetrics(records: Array<{ status: string; latency: number }>) {
  if (!records.length) {
    return {
      uptimePct: undefined,
      incidentCount: undefined,
      latencyHistory: [] as number[],
    };
  }

  const total = records.length;
  const onlineCount = records.filter((record) => record.status === 'ONLINE').length;
  const uptimePct = Math.round((onlineCount / total) * 1000) / 10;
  let incidents = 0;
  let prevOnline = true;

  for (const record of records) {
    const isOnline = record.status === 'ONLINE';
    if (prevOnline && !isOnline) incidents++;
    prevOnline = isOnline;
  }

  return {
    uptimePct,
    incidentCount: incidents,
    latencyHistory: records.slice(-12).map((record) => record.latency),
  };
}

function mapDashboardSefazStatus(
  record: DashboardSefazCurrentRecord,
  historyMap: Map<string, Array<{ status: string; latency: number }>>,
) {
  const key = `${record.uf}:${record.service}`;
  const metrics = computeSefazMetrics(historyMap.get(key) ?? []);

  return {
    uf: record.uf,
    service: record.service,
    status: record.status,
    latency: record.latency,
    checkedAt: record.checkedAt.toISOString(),
    changedAt: record.changedAt.toISOString(),
    ...metrics,
  };
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly ticketsService: TicketsService,
    private readonly suporteTicketsDashboardQuery: SuporteTicketsDashboardQuery,
    private readonly atendimentosDashboardQuery: AtendimentosDashboardQuery,
    private readonly tarefasDashboardQuery: TarefasDashboardQuery,
    private readonly cadastrosDashboardQuery: CadastrosDashboardQuery,
    private readonly comercialDashboardQuery: ComercialDashboardQuery,
  ) {}

  private async getUserDashboardUFs(userId: string): Promise<string[]> {
    const memberships = await this.prisma.membership.findMany({
      where: {
        userId,
        company: { deletedAt: null },
      },
      select: {
        company: {
          select: {
            addresses: {
              select: { estado: true },
            },
          },
        },
      },
    });

    const states = new Set<string>();
    for (const membership of memberships) {
      for (const address of membership.company?.addresses || []) {
        const state = address.estado?.trim().toUpperCase();
        if (state && state.length === 2) {
          states.add(state);
        }
      }
    }

    if (states.size === 0) {
      return ['MG'];
    }

    return Array.from(states);
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

  private async getConfiguredSefazRoutes() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: SETTING_KEYS.SEFAZ_ROUTES },
      select: { value: true },
    });

    const defaults = buildDefaultSefazRoutes();
    if (!setting?.value) return defaults;

    try {
      const parsed = JSON.parse(setting.value);
      const validation = sefazRoutesSchema.safeParse(parsed);
      if (!validation.success) return defaults;

      const configured = validation.data;
      const configuredMap = new Map(configured.map((r) => [`${r.uf}:${r.service}`, r]));

      const merged = [...configured];
      for (const def of defaults) {
        const key = `${def.uf}:${def.service}`;
        if (!configuredMap.has(key)) {
          merged.push(def);
        }
      }

      return merged;
    } catch {
      return defaults;
    }
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

  private buildScopedContractsWhere(companyIds?: string[]) {
    if (!companyIds) {
      return {
        company: {
          deletedAt: null as null,
        },
      };
    }

    if (companyIds.length === 0) {
      return {
        companyId: { in: ['__no_company_scope__'] },
        company: {
          deletedAt: null as null,
        },
      };
    }

    return {
      companyId: { in: companyIds },
      company: {
        deletedAt: null as null,
      },
    };
  }

  private async getDashboardTicketTeam(requester: { userId: string; role: Role; email: string }) {
    const hasDevelopmentScope = await this.authorizationService.userHasPermission(
      requester,
      'dashboard:view_development_scope',
    );

    return hasDevelopmentScope ? 'DESENVOLVIMENTO' : undefined;
  }

  async getDashboard(rawHeaders?: IncomingHttpHeaders): Promise<DashboardResponse> {
    const requester = await this.authorizationService.assertPermission(rawHeaders, 'dashboard:view');
    const dailyPassword = await this.resolveDailyPassword(rawHeaders);
    const hasInternalDashboard = await this.authorizationService.userHasPermission(requester, DASHBOARD_VIEW_INTERNAL);

    if (hasInternalDashboard) {
      const dashboardUFsRaw = await this.getUserDashboardUFs(requester.userId);
      const dashboardUFs = dashboardUFsRaw.length > 0 ? dashboardUFsRaw : ['MG'];
      const queryUfs = [...dashboardUFs];
      if (!queryUfs.includes('SVRS')) queryUfs.push('SVRS');
      if (!queryUfs.includes('SVAN')) queryUfs.push('SVAN');
      const configuredSefazRoutes = await this.getConfiguredSefazRoutes();
      const { start } = getLast7DaysRange();
      const now = new Date();
      const sefazHistorySince = new Date(Date.now() - 24 * 60 * 60 * 1000);
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
      const contractsBaseWhere = this.buildScopedContractsWhere(scopedCompanyIds);
      const userBaseWhere = this.buildScopedUsersWhere(scopedUserIds);
      const dashboardTicketTeam = await this.getDashboardTicketTeam(requester);

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
        sefazHistoryRecords,
        companyActivity,
        crmLeads,
        activeContracts,
        nationalSefazRecords,
        usersThisMonth,
        contactsThisMonth,
        inactivatedCompaniesThisMonth,
        inactivatedUsersThisMonth,
        inactivatedContactsThisMonth,
        recentInactivatedCompanies,
        recentInactivatedUsers,
        recentInactivatedContacts,
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
          where: { uf: { in: queryUfs } },
          orderBy: { checkedAt: 'desc' },
        }).catch(() => []),
        this.prisma.sefazStatus.findMany({
          where: { checkedAt: { gte: sefazHistorySince } },
          orderBy: { checkedAt: 'asc' },
          select: { uf: true, service: true, status: true, latency: true },
        }).catch(() => []),
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
            }).catch(() => [])
          : Promise.resolve([]),
        canViewCrm
          ? this.prisma.contract.findMany({
              where: { status: 'ACTIVE', ...contractsBaseWhere },
              select: { totalValue: true, minimumWage: true, percentage: true, taxRate: true, programmerRate: true },
            }).catch(() => [])
          : Promise.resolve([]),
        this.prisma.sefazStatusCurrent.findMany({
          orderBy: { checkedAt: 'desc' },
        }).catch(() => []),
        this.prisma.user.count({ where: { ...userBaseWhere, createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } } }),
        canViewContactsModule
          ? (this.prisma as any).companyContact.count({ where: scopedContactIds ? { companyLinks: { some: { companyId: { in: scopedContactIds } } }, createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } } : { createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } } })
          : Promise.resolve(0),
        canViewCompaniesModule
          ? this.prisma.company.count({ where: { ...companyBaseWhere, status: { in: ['INACTIVE', 'SUSPENDED'] }, updatedAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } } })
          : Promise.resolve(0),
        this.prisma.user.count({ where: { ...userBaseWhere, isActive: false, updatedAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } } }),
        canViewContactsModule
          ? (this.prisma as any).companyContact.count({ where: scopedContactIds ? { status: 'ARCHIVED', companyLinks: { some: { companyId: { in: scopedContactIds } } }, updatedAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } } : { status: 'ARCHIVED', updatedAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } } })
          : Promise.resolve(0),
        canViewCompaniesModule
          ? this.prisma.company.findMany({ where: { ...companyBaseWhere, status: { in: ['INACTIVE', 'SUSPENDED'] } }, orderBy: { updatedAt: 'desc' }, take: 5, select: { id: true, razaoSocial: true, nomeFantasia: true, cnpj: true, status: true, createdAt: true, _count: { select: { memberships: true } }, contactLinks: { select: { id: true } }, addresses: { take: 1, select: { cidade: true, estado: true } } } })
          : Promise.resolve([]),
        canViewUsersModule
          ? this.prisma.user.findMany({ where: { ...userBaseWhere, isActive: false }, orderBy: [{ updatedAt: 'desc' }], take: 5, select: { id: true, name: true, email: true, role: true, createdAt: true, memberships: { orderBy: [{ createdAt: 'asc' }], select: { company: { select: { nomeFantasia: true, razaoSocial: true } } } } } })
          : Promise.resolve([]),
        canViewContactsModule
          ? (this.prisma as any).companyContact.findMany({ where: scopedContactIds ? { status: 'ARCHIVED', companyLinks: { some: { companyId: { in: scopedContactIds } } } } : { status: 'ARCHIVED' }, orderBy: [{ updatedAt: 'desc' }], take: 5, select: { id: true, name: true, email: true, whatsapp: true, createdAt: true, companyLinks: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], select: { company: { select: { nomeFantasia: true, razaoSocial: true } } } } } })
          : Promise.resolve([]),
      ]);

      let ticketWarning: string | undefined;
      let ticketsResponse: Awaited<ReturnType<TicketsService['findAll']>> | null = null;

      try {
        ticketsResponse = await withTimeout(
          this.ticketsService.findAll(
            {
              page: '1',
              pageSize: '200',
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
      const openTicketRecords = toOpenTicketRecordItems(records);
      const tickets = normalizedTickets.filter((ticket) => ticket.status !== 'Resolvido').slice(0, 5);
      const totalOpen =
        ticketsResponse?.success && ticketsResponse.statusCounts
          ? ticketsResponse.statusCounts.open + ticketsResponse.statusCounts.development + ticketsResponse.statusCounts.testing
          : normalizedTickets.filter((ticket) => ticket.status !== 'Resolvido').length;

      const mapCompany = (company: any) => ({
        id: company.id,
        razaoSocial: company.razaoSocial,
        nomeFantasia: company.nomeFantasia,
        cnpj: company.cnpj,
        status: company.status,
        createdAt: company.createdAt.toISOString(),
        membershipsCount: company._count?.memberships ?? 0,
        contactsCount: company.contactLinks?.length ?? 0,
        cidade: company.addresses?.[0]?.cidade ?? null,
        estado: company.addresses?.[0]?.estado ?? null,
      });
      const mapContact = (contact: any) => ({
        id: contact.id,
        name:
          contact.name?.trim() ||
          contact.email?.trim() ||
          contact.whatsapp?.trim() ||
          'Contato sem nome',
        email: contact.email ?? null,
        whatsapp: contact.whatsapp ?? null,
        createdAt: contact.createdAt.toISOString(),
        companyNames: Array.from(
          new Set(
            (contact.companyLinks ?? [])
              .map((link: any) => link.company?.nomeFantasia || link.company?.razaoSocial)
              .filter(Boolean) as string[],
          ),
        ),
      });

      const mapUser = (user: any) => ({
        id: user.id,
        name: user.name?.trim() || user.email,
        email: user.email,
        role: String(user.role),
        createdAt: user.createdAt.toISOString(),
        companyNames: Array.from(
          new Set(
            (user.memberships ?? [])
              .map((membership: any) => membership.company?.nomeFantasia || membership.company?.razaoSocial)
              .filter(Boolean) as string[],
          ),
        ),
      });

      const companies = recentCompanies.map(mapCompany);
      const contacts = recentContacts.map(mapContact);
      const users = recentUsers.map(mapUser);
      
      const inactCompanies = recentInactivatedCompanies.map(mapCompany);
      const inactContacts = recentInactivatedContacts.map(mapContact);
      const inactUsers = recentInactivatedUsers.map(mapUser);

      const sefazHistoryMap = buildSefazHistoryMap(sefazHistoryRecords);
      const sefazStatuses = sefazRecords.map((record) => mapDashboardSefazStatus(record, sefazHistoryMap));
      const sefazNationalStatuses = nationalSefazRecords.map((record) =>
        mapDashboardSefazStatus(record, sefazHistoryMap),
      );

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
          sefazFocusUfs: dashboardUFs,
          sefazStatuses,
          sefazNationalStatuses,
          sefazConfiguredRoutes: configuredSefazRoutes,
          tickets,
          openTicketRecords,
          totalOpen,
          activity: toSeries(companyActivity.map((company) => company.createdAt)),
          crm: canViewCrm ? buildCrmSummary(crmLeads) : undefined,
          contracts: canViewCrm
            ? {
                ...summarizeActiveContracts(activeContracts),
              }
            : undefined,
          cadastros: {
            companies: {
              total: companiesCount,
              registeredThisMonth: companiesThisMonth,
              inactivatedThisMonth: inactivatedCompaniesThisMonth,
            },
            contacts: {
              total: contactsCount,
              registeredThisMonth: contactsThisMonth,
              inactivatedThisMonth: inactivatedContactsThisMonth,
            },
            users: {
              total: usersCount,
              registeredThisMonth: usersThisMonth,
              inactivatedThisMonth: inactivatedUsersThisMonth,
            },
            recentInactivatedCompanies: inactCompanies,
            recentInactivatedContacts: inactContacts,
            recentInactivatedUsers: inactUsers,
          },
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
            addresses: { select: { estado: true } },
          },
        },
      },
    });

    let ticketWarning: string | undefined;
    let ticketsResponse: Awaited<ReturnType<TicketsService['findAll']>> | null = null;

    try {
      ticketsResponse = await withTimeout(
        this.ticketsService.findAll({ page: '1', pageSize: '200' }, rawHeaders),
        DASHBOARD_TICKETS_TIMEOUT_MS,
        'Consulta de tickets do dashboard',
      );
    } catch {
      ticketWarning = getDashboardTimeoutWarning();
    }

    const records = ticketsResponse?.success && ticketsResponse.data ? ticketsResponse.data : [];
    const normalizedTickets = toTicketSummaryItems(records);
    const openTicketRecords = toOpenTicketRecordItems(records);
    const tickets = normalizedTickets.filter((ticket) => ticket.status !== 'Resolvido').slice(0, 10);
    const kpis =
      ticketsResponse?.success && ticketsResponse.statusCounts
        ? {
            open: ticketsResponse.statusCounts.open,
            pending: ticketsResponse.statusCounts.development + ticketsResponse.statusCounts.testing,
            resolved: ticketsResponse.statusCounts.closed,
          }
        : buildTicketKpis(normalizedTickets);

    const companyNames = memberships
      .map((membership) => membership.company.nomeFantasia || membership.company.razaoSocial)
      .filter(Boolean);
    const primaryMembership = memberships[0];

    const states = new Set<string>();
    for (const membership of memberships) {
      for (const address of membership.company.addresses || []) {
        const state = address.estado?.trim().toUpperCase();
        if (state && state.length === 2) {
          states.add(state);
        }
      }
    }
    const dashboardUFs = states.size > 0 ? Array.from(states) : ['MG'];
    const configuredSefazRoutes = await this.getConfiguredSefazRoutes();

    const sefazHistorySince = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [sefazRecords, nationalSefazRecords, sefazHistoryRecords] = await Promise.all([
      this.prisma.sefazStatusCurrent.findMany({
        where: { uf: { in: dashboardUFs } },
        orderBy: { checkedAt: 'desc' },
      }).catch(() => []),
      this.prisma.sefazStatusCurrent.findMany({
        orderBy: { checkedAt: 'desc' },
      }).catch(() => []),
      this.prisma.sefazStatus.findMany({
        where: { checkedAt: { gte: sefazHistorySince } },
        orderBy: { checkedAt: 'asc' },
        select: { uf: true, service: true, status: true, latency: true },
      }).catch(() => []),
    ]);

    const sefazHistoryMap = buildSefazHistoryMap(sefazHistoryRecords);
    const sefazStatuses = sefazRecords.map((record) => mapDashboardSefazStatus(record, sefazHistoryMap));
    const sefazNationalStatuses = nationalSefazRecords.map((record) =>
      mapDashboardSefazStatus(record, sefazHistoryMap),
    );

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
        sefazFocusUfs: dashboardUFs,
        sefazStatuses,
        sefazNationalStatuses,
        sefazConfiguredRoutes: configuredSefazRoutes,
        tickets,
        openTicketRecords,
        totalOpen: kpis.open + kpis.pending,
        kpis,
        activity: toSeries(normalizedTickets.map((ticket) => new Date(ticket.lastUpdate))),
      },
    };
  }

  async getOperacionalData(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.assertPermission(rawHeaders, 'dashboard:view');

    const [dailyPassword, configuredSefazRoutes, dashboardUFs] = await Promise.all([
      this.resolveDailyPassword(rawHeaders),
      this.getConfiguredSefazRoutes(),
      this.getUserDashboardUFs(requester.userId),
    ]);

    const dashboardTicketTeam = await this.getDashboardTicketTeam(requester);

    const canViewCrm =
      (await this.authorizationService.userHasPermission(requester, 'crm:view', { acceptCompanyScope: true })) ||
      (await this.authorizationService.userHasPermission(requester, 'crm:manage', { acceptCompanyScope: true }));

    const companyScope = await this.authorizationService.resolveCompanyAccessScope(
      requester,
      'companies:view_own',
      'companies:view_all',
    );
    const contractsBaseWhere = this.buildScopedContractsWhere(
      companyScope.isGlobal ? undefined : companyScope.companyIds,
    );

    let ticketWarning: string | undefined;
    let ticketsResponse: Awaited<ReturnType<TicketsService['findAll']>> | null = null;

    try {
      ticketsResponse = await withTimeout(
        this.ticketsService.findAll(
          { page: '1', pageSize: '200', ...(dashboardTicketTeam ? { team: dashboardTicketTeam } : {}) },
          rawHeaders,
        ),
        DASHBOARD_TICKETS_TIMEOUT_MS,
        'Operacional tickets',
      );
    } catch {
      ticketWarning = getDashboardTimeoutWarning();
    }

    const queryUfs = [...dashboardUFs];
    if (!queryUfs.includes('SVRS')) queryUfs.push('SVRS');
    if (!queryUfs.includes('SVAN')) queryUfs.push('SVAN');

    const [sefazRecords, activeContracts] = await Promise.all([
      this.prisma.sefazStatusCurrent
        .findMany({ where: { uf: { in: queryUfs } }, orderBy: { checkedAt: 'desc' } })
        .catch(() => []),
      canViewCrm
        ? this.prisma.contract
            .findMany({
              where: { status: 'ACTIVE', ...contractsBaseWhere },
              select: { totalValue: true, minimumWage: true, percentage: true, taxRate: true, programmerRate: true },
            })
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    const records = ticketsResponse?.success && ticketsResponse.data ? ticketsResponse.data : [];
    const normalizedTickets = toTicketSummaryItems(records);
    const openRecords = toOpenTicketRecordItems(records);
    const scopedRecords = dashboardTicketTeam
      ? openRecords.filter((r) => r.team === dashboardTicketTeam)
      : openRecords;
    const tickets = normalizedTickets.filter((ticket) => ticket.status !== 'Resolvido').slice(0, 5);
    const totalOpen =
      ticketsResponse?.success && ticketsResponse.statusCounts
        ? ticketsResponse.statusCounts.open +
          ticketsResponse.statusCounts.development +
          ticketsResponse.statusCounts.testing
        : normalizedTickets.filter((ticket) => ticket.status !== 'Resolvido').length;

    const hasSefazOffline = sefazRecords.some((r) => r.status === 'OFFLINE');
    const hasSefazUnstable = sefazRecords.some((r) => r.status === 'UNSTABLE');
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
        records
          .filter((r) => !progressStatuses.has(r.status) && !closedStatuses.has(r.status))
          .map((r) => new Date(r.createdAt)),
      ),
      inProgress: toSeries(
        records
          .filter((r) => progressStatuses.has(r.status))
          .map((r) => new Date(r.updatedAt)),
      ),
      closed: toSeries(
        records
          .filter((r) => closedStatuses.has(r.status))
          .map((r) => new Date(r.updatedAt)),
      ),
    };

    return {
      success: true as const,
      data: {
        dailyPassword,
        ticketCounts: {
          total: scopedRecords.length,
          support: scopedRecords.filter((r) => r.team === 'SUPORTE').length,
          development: scopedRecords.filter((r) => r.team === 'DESENVOLVIMENTO').length,
          waiting: scopedRecords.filter((r) => r.status === 'Aberto').length,
          inProgress: scopedRecords.filter((r) => r.status !== 'Aberto').length,
        },
        sefazHealth: sefazHealth as 'online' | 'unstable' | 'offline' | 'unknown',
        sefazRoutesCount: configuredSefazRoutes.filter((r) => r.active).length,
        contracts: canViewCrm
          ? {
              ...summarizeActiveContracts(activeContracts),
            }
          : undefined,
        ticketFlow,
        tickets,
        totalOpen,
        ticketWarning,
      },
    };
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
    const requester = await this.authorizationService.assertPermission(rawHeaders, 'dashboard:view');
    const dashboardUFsRaw = await this.getUserDashboardUFs(requester.userId);
    const dashboardUFs = dashboardUFsRaw.length > 0 ? dashboardUFsRaw : ['MG'];
    const configuredSefazRoutes = await this.getConfiguredSefazRoutes();

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const queryUfs = [...dashboardUFs];
    if (!queryUfs.includes('SVRS')) queryUfs.push('SVRS');
    if (!queryUfs.includes('SVAN')) queryUfs.push('SVAN');

    const [sefazRecords, nationalSefazRecords, historyRecords] = await Promise.all([
      this.prisma.sefazStatusCurrent
        .findMany({ where: { uf: { in: queryUfs } }, orderBy: { checkedAt: 'desc' } })
        .catch(() => []),
      this.prisma.sefazStatusCurrent
        .findMany({ orderBy: { checkedAt: 'desc' } })
        .catch(() => []),
      this.prisma.sefazStatus
        .findMany({
          where: { checkedAt: { gte: since } },
          orderBy: { checkedAt: 'asc' },
          select: { uf: true, service: true, status: true, latency: true },
        })
        .catch(() => []),
    ]);

    const historyMap = new Map<string, { status: string; latency: number }[]>();
    for (const r of historyRecords) {
      const key = `${r.uf}:${r.service}`;
      if (!historyMap.has(key)) historyMap.set(key, []);
      historyMap.get(key)!.push({ status: r.status, latency: r.latency });
    }

    function computeMetrics(records: { status: string; latency: number }[]) {
      if (!records.length) return { uptimePct: undefined, incidentCount: undefined, latencyHistory: [] as number[] };
      const total = records.length;
      const onlineCount = records.filter((r) => r.status === 'ONLINE').length;
      const uptimePct = Math.round((onlineCount / total) * 1000) / 10;
      let incidents = 0;
      let prevOnline = true;
      for (const r of records) {
        const isOnline = r.status === 'ONLINE';
        if (prevOnline && !isOnline) incidents++;
        prevOnline = isOnline;
      }
      const latencyHistory = records.slice(-12).map((r) => r.latency);
      return { uptimePct, incidentCount: incidents, latencyHistory };
    }

    const mapRecord = (r: (typeof sefazRecords)[number]) => {
      const key = `${r.uf}:${r.service}`;
      const metrics = computeMetrics(historyMap.get(key) ?? []);
      return {
        uf: r.uf,
        service: r.service,
        status: r.status,
        latency: r.latency,
        checkedAt: r.checkedAt.toISOString(),
        changedAt: r.changedAt.toISOString(),
        ...metrics,
      };
    };

    return {
      success: true as const,
      data: {
        focusUfs: dashboardUFs,
        sefazStatuses: sefazRecords.map(mapRecord),
        sefazNationalStatuses: nationalSefazRecords.map(mapRecord),
        sefazConfiguredRoutes: configuredSefazRoutes,
      },
    };
  }

  async getTarefasData(rawHeaders?: IncomingHttpHeaders) {
    return this.tarefasDashboardQuery.execute(rawHeaders);
  }
}
