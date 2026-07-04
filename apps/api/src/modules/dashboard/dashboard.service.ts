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

type DashboardRequester = {
  userId: string;
  role: Role;
  email: string;
};

type DashboardTicketsResponse = Awaited<ReturnType<TicketsService['findAll']>>;

type DashboardMembershipStateSource = {
  company?: {
    addresses?: Array<{
      estado?: string | null;
    }>;
  } | null;
};

function resolveDashboardUFsFromMembershipCompanies(memberships: DashboardMembershipStateSource[]) {
  const states = new Set<string>();

  for (const membership of memberships) {
    for (const address of membership.company?.addresses ?? []) {
      const state = address.estado?.trim().toUpperCase();
      if (state && state.length === 2) {
        states.add(state);
      }
    }
  }

  return states.size > 0 ? Array.from(states) : ['MG'];
}

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

    return resolveDashboardUFsFromMembershipCompanies(memberships);
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

  private async getDashboardTicketTeam(requester: DashboardRequester) {
    const hasDevelopmentScope = await this.authorizationService.userHasPermission(
      requester,
      'dashboard:view_development_scope',
    );

    return hasDevelopmentScope ? 'DESENVOLVIMENTO' : undefined;
  }

  private async canViewDashboardCrm(requester: DashboardRequester) {
    const canView = await this.authorizationService.userHasPermission(requester, 'crm:view', {
      acceptCompanyScope: true,
    });
    if (canView) return true;
    return this.authorizationService.userHasPermission(requester, 'crm:manage', { acceptCompanyScope: true });
  }

  private buildDashboardQueryUfs(dashboardUFs: string[]) {
    const queryUfs = [...dashboardUFs];
    if (!queryUfs.includes('SVRS')) queryUfs.push('SVRS');
    if (!queryUfs.includes('SVAN')) queryUfs.push('SVAN');
    return queryUfs;
  }

  private async fetchDashboardTickets(
    rawHeaders: IncomingHttpHeaders | undefined,
    label: string,
    team?: string,
  ) {
    let ticketWarning: string | undefined;
    let ticketsResponse: DashboardTicketsResponse | null = null;

    try {
      ticketsResponse = await withTimeout(
        this.ticketsService.findAll(
          {
            page: '1',
            pageSize: '200',
            ...(team ? { team } : {}),
          },
          rawHeaders,
        ),
        DASHBOARD_TICKETS_TIMEOUT_MS,
        label,
      );
    } catch {
      ticketWarning = getDashboardTimeoutWarning();
    }

    const records = ticketsResponse?.success && ticketsResponse.data ? ticketsResponse.data : [];
    return {
      ticketWarning,
      ticketsResponse,
      records,
      normalizedTickets: toTicketSummaryItems(records),
      openTicketRecords: toOpenTicketRecordItems(records),
    };
  }

  private mapDashboardCompany(company: any) {
    return {
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
    };
  }

  private mapDashboardContact(contact: any) {
    return {
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
    };
  }

  private mapDashboardUser(user: any) {
    return {
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
    };
  }

  private mapSefazStatuses(
    records: DashboardSefazCurrentRecord[],
    historyRecords: DashboardSefazHistoryRecord[],
  ) {
    const historyMap = buildSefazHistoryMap(historyRecords);
    return records.map((record) => mapDashboardSefazStatus(record, historyMap));
  }

  async getDashboard(rawHeaders?: IncomingHttpHeaders): Promise<DashboardResponse> {
    const requester = await this.authorizationService.assertPermission(rawHeaders, 'dashboard:view');
    const dailyPassword = await this.resolveDailyPassword(rawHeaders);
    const hasInternalDashboard = await this.authorizationService.userHasPermission(requester, DASHBOARD_VIEW_INTERNAL);

    if (hasInternalDashboard) {
      return this.buildInternalDashboard(rawHeaders, requester, dailyPassword);
    }

    return this.buildClientDashboard(rawHeaders, requester, dailyPassword);
  }

  private async fetchSefazStatusData(dashboardUFs: string[]) {
    const queryUfs = this.buildDashboardQueryUfs(dashboardUFs);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [configuredSefazRoutes, sefazRecords, nationalSefazRecords, historyRecords] = await Promise.all([
      this.getConfiguredSefazRoutes(),
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

    return {
      configuredSefazRoutes,
      sefazStatuses: this.mapSefazStatuses(sefazRecords, historyRecords),
      sefazNationalStatuses: this.mapSefazStatuses(nationalSefazRecords, historyRecords),
      sefazRecords,
    };
  }

  private async buildInternalDashboard(
    rawHeaders: IncomingHttpHeaders | undefined,
    requester: DashboardRequester,
    dailyPassword: DashboardDailyPassword | null,
  ): Promise<DashboardResponse> {
    const dashboardUFs = await this.getUserDashboardUFs(requester.userId);
    const { start } = getLast7DaysRange();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

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
      canViewCrm,
      dashboardTicketTeam,
      sefazData,
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
      this.canViewDashboardCrm(requester),
      this.getDashboardTicketTeam(requester),
      this.fetchSefazStatusData(dashboardUFs),
    ]);

    const canViewContactsModule = canViewContactsDirect || canViewContactsScoped || canViewContactsGlobal;
    const canViewUsersModule = canViewUsersGlobal || canViewUsersScoped || canViewUsersDirect;
    const scopedCompanyIds = companyScope.isGlobal ? undefined : companyScope.companyIds;
    const scopedContactIds = contactScope.isGlobal ? undefined : contactScope.companyIds;
    const scopedUserIds = userScope.isGlobal ? undefined : userScope.companyIds;
    const companyBaseWhere = this.buildScopedCompaniesWhere(scopedCompanyIds);
    const contractsBaseWhere = this.buildScopedContractsWhere(scopedCompanyIds);
    const userBaseWhere = this.buildScopedUsersWhere(scopedUserIds);

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
      companyActivity,
      crmLeads,
      activeContracts,
      usersThisMonth,
      contactsThisMonth,
      inactivatedCompaniesThisMonth,
      inactivatedUsersThisMonth,
      inactivatedContactsThisMonth,
      recentInactivatedCompanies,
      recentInactivatedUsers,
      recentInactivatedContacts,
      ticketData,
    ] = await Promise.all([
      canViewCompaniesModule
        ? this.prisma.company.count({ where: { ...companyBaseWhere, status: 'ACTIVE' } })
        : Promise.resolve(0),
      canViewCompaniesModule
        ? this.prisma.company.count({
            where: { ...companyBaseWhere, createdAt: { gte: monthStart } },
          })
        : Promise.resolve(0),
      canViewCompaniesModule
        ? this.prisma.company.count({
            where: {
              ...companyBaseWhere,
              createdAt: {
                gte: previousMonthStart,
                lt: monthStart,
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
      canViewCompaniesModule
        ? this.prisma.company.findMany({
            where: { ...companyBaseWhere, createdAt: { gte: start } },
            select: { createdAt: true },
          })
        : Promise.resolve([]),
      canViewCrm
        ? (this.prisma as any).crmLead
            .findMany({
              select: {
                stage: true,
                estimatedValue: true,
                expectedCloseAt: true,
                nextStep: true,
              },
            })
            .catch(() => [])
        : Promise.resolve([]),
      canViewCrm
        ? this.prisma.contract
            .findMany({
              where: { status: 'ACTIVE', ...contractsBaseWhere },
              select: { totalValue: true, minimumWage: true, percentage: true, taxRate: true, programmerRate: true },
            })
            .catch(() => [])
        : Promise.resolve([]),
      this.prisma.user.count({ where: { ...userBaseWhere, createdAt: { gte: monthStart } } }),
      canViewContactsModule
        ? (this.prisma as any).companyContact.count({
            where: scopedContactIds
              ? {
                  companyLinks: { some: { companyId: { in: scopedContactIds } } },
                  createdAt: { gte: monthStart },
                }
              : { createdAt: { gte: monthStart } },
          })
        : Promise.resolve(0),
      canViewCompaniesModule
        ? this.prisma.company.count({
            where: {
              ...companyBaseWhere,
              status: { in: ['INACTIVE', 'SUSPENDED'] },
              updatedAt: { gte: monthStart },
            },
          })
        : Promise.resolve(0),
      this.prisma.user.count({ where: { ...userBaseWhere, isActive: false, updatedAt: { gte: monthStart } } }),
      canViewContactsModule
        ? (this.prisma as any).companyContact.count({
            where: scopedContactIds
              ? {
                  status: 'ARCHIVED',
                  companyLinks: { some: { companyId: { in: scopedContactIds } } },
                  updatedAt: { gte: monthStart },
                }
              : { status: 'ARCHIVED', updatedAt: { gte: monthStart } },
          })
        : Promise.resolve(0),
      canViewCompaniesModule
        ? this.prisma.company.findMany({
            where: { ...companyBaseWhere, status: { in: ['INACTIVE', 'SUSPENDED'] } },
            orderBy: { updatedAt: 'desc' },
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
      canViewUsersModule
        ? this.prisma.user.findMany({
            where: { ...userBaseWhere, isActive: false },
            orderBy: [{ updatedAt: 'desc' }],
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
      canViewContactsModule
        ? (this.prisma as any).companyContact.findMany({
            where: scopedContactIds
              ? { status: 'ARCHIVED', companyLinks: { some: { companyId: { in: scopedContactIds } } } }
              : { status: 'ARCHIVED' },
            orderBy: [{ updatedAt: 'desc' }],
            take: 5,
            select: {
              id: true,
              name: true,
              email: true,
              whatsapp: true,
              createdAt: true,
              companyLinks: {
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                select: { company: { select: { nomeFantasia: true, razaoSocial: true } } },
              },
            },
          })
        : Promise.resolve([]),
      this.fetchDashboardTickets(rawHeaders, 'Consulta de tickets do dashboard', dashboardTicketTeam),
    ]);

    const tickets = ticketData.normalizedTickets.filter((ticket) => ticket.status !== 'Resolvido').slice(0, 5);
    const totalOpen =
      ticketData.ticketsResponse?.success && ticketData.ticketsResponse.statusCounts
        ? ticketData.ticketsResponse.statusCounts.open +
          ticketData.ticketsResponse.statusCounts.development +
          ticketData.ticketsResponse.statusCounts.testing
        : ticketData.normalizedTickets.filter((ticket) => ticket.status !== 'Resolvido').length;

    return {
      success: true,
      data: {
        mode: 'admin',
        dailyPassword,
        ticketWarning: mergeTicketWarnings(ticketData.ticketWarning),
        companiesCount,
        companiesGrowth: companiesThisMonth - companiesLastMonth,
        usersCount,
        activeUsersCount,
        contactsCount,
        canViewCompanies: canViewCompaniesModule,
        canViewContacts: canViewContactsModule,
        canViewUsers: canViewUsersModule || userScope.isGlobal,
        companies: recentCompanies.map((company) => this.mapDashboardCompany(company)),
        recentContacts: recentContacts.map((contact) => this.mapDashboardContact(contact)),
        recentUsers: recentUsers.map((user) => this.mapDashboardUser(user)),
        sefazFocusUfs: dashboardUFs,
        sefazStatuses: sefazData.sefazStatuses,
        sefazNationalStatuses: sefazData.sefazNationalStatuses,
        sefazConfiguredRoutes: sefazData.configuredSefazRoutes,
        tickets,
        openTicketRecords: ticketData.openTicketRecords,
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
          recentInactivatedCompanies: recentInactivatedCompanies.map((company) => this.mapDashboardCompany(company)),
          recentInactivatedContacts: recentInactivatedContacts.map((contact) => this.mapDashboardContact(contact)),
          recentInactivatedUsers: recentInactivatedUsers.map((user) => this.mapDashboardUser(user)),
        },
      },
    };
  }

  private async buildClientDashboard(
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
      this.fetchDashboardTickets(rawHeaders, 'Consulta de tickets do dashboard'),
      this.fetchSefazStatusData(dashboardUFs),
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

  async getOperacionalData(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.assertPermission(rawHeaders, 'dashboard:view');

    const [dailyPassword, dashboardUFs] = await Promise.all([
      this.resolveDailyPassword(rawHeaders),
      this.getUserDashboardUFs(requester.userId),
    ]);

    const [dashboardTicketTeam, canViewCrm, companyScope, sefazData] = await Promise.all([
      this.getDashboardTicketTeam(requester),
      this.canViewDashboardCrm(requester),
      this.authorizationService.resolveCompanyAccessScope(requester, 'companies:view_own', 'companies:view_all'),
      this.fetchSefazStatusData(dashboardUFs),
    ]);
    const ticketData = await this.fetchDashboardTickets(rawHeaders, 'Operacional tickets', dashboardTicketTeam);

    const scopedTicketRecords = dashboardTicketTeam
      ? ticketData.openTicketRecords.filter((record) => record.team === dashboardTicketTeam)
      : ticketData.openTicketRecords;
    const contractsBaseWhere = this.buildScopedContractsWhere(
      companyScope.isGlobal ? undefined : companyScope.companyIds,
    );
    const sefazRecords = sefazData.sefazRecords;
    const activeContracts = canViewCrm
      ? await this.prisma.contract
          .findMany({
            where: { status: 'ACTIVE', ...contractsBaseWhere },
            select: { totalValue: true, minimumWage: true, percentage: true, taxRate: true, programmerRate: true },
          })
          .catch(() => [])
      : [];

    const tickets = ticketData.normalizedTickets.filter((ticket) => ticket.status !== 'Resolvido').slice(0, 5);
    const totalOpen =
      ticketData.ticketsResponse?.success && ticketData.ticketsResponse.statusCounts
        ? ticketData.ticketsResponse.statusCounts.open +
          ticketData.ticketsResponse.statusCounts.development +
          ticketData.ticketsResponse.statusCounts.testing
        : ticketData.normalizedTickets.filter((ticket) => ticket.status !== 'Resolvido').length;

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
        ticketData.records
          .filter((r) => !progressStatuses.has(r.status) && !closedStatuses.has(r.status))
          .map((r) => new Date(r.createdAt)),
      ),
      inProgress: toSeries(
        ticketData.records
          .filter((r) => progressStatuses.has(r.status))
          .map((r) => new Date(r.updatedAt)),
      ),
      closed: toSeries(
        ticketData.records
          .filter((r) => closedStatuses.has(r.status))
          .map((r) => new Date(r.updatedAt)),
      ),
    };

    return {
      success: true as const,
      data: {
        dailyPassword,
        ticketCounts: {
          total: scopedTicketRecords.length,
          support: scopedTicketRecords.filter((r) => r.team === 'SUPORTE').length,
          development: scopedTicketRecords.filter((r) => r.team === 'DESENVOLVIMENTO').length,
          waiting: scopedTicketRecords.filter((r) => r.status === 'Aberto').length,
          inProgress: scopedTicketRecords.filter((r) => r.status !== 'Aberto').length,
        },
        sefazHealth: sefazHealth as 'online' | 'unstable' | 'offline' | 'unknown',
        sefazRoutesCount: sefazData.configuredSefazRoutes.filter((r) => r.active).length,
        contracts: canViewCrm
          ? {
              ...summarizeActiveContracts(activeContracts),
            }
          : undefined,
        ticketFlow,
        tickets,
        totalOpen,
        ticketWarning: ticketData.ticketWarning,
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
    const dashboardUFs = await this.getUserDashboardUFs(requester.userId);
    const sefazData = await this.fetchSefazStatusData(dashboardUFs);

    return {
      success: true as const,
      data: {
        focusUfs: dashboardUFs,
        sefazStatuses: sefazData.sefazStatuses,
        sefazNationalStatuses: sefazData.sefazNationalStatuses,
        sefazConfiguredRoutes: sefazData.configuredSefazRoutes,
      },
    };
  }

  async getTarefasData(rawHeaders?: IncomingHttpHeaders) {
    return this.tarefasDashboardQuery.execute(rawHeaders);
  }
}
