import { Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { Prisma, type Role } from '@prisma/client';
import type { DashboardCrmSummary, DashboardDailyPassword } from '@dosc-syspro/contracts/dashboard';
import { getDailyPasswordForDate } from '@dosc-syspro/contracts/dashboard';
import { buildDefaultSefazRoutes } from '@dosc-syspro/contracts/sefaz-endpoints';
import { sefazRoutesSchema } from '@dosc-syspro/contracts/sefaz-routes';
import { SETTING_KEYS } from '@dosc-syspro/contracts/settings';
import { CRM_STAGE_LABELS, CRM_STAGE_ORDER } from '@dosc-syspro/crm-domain';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { TicketsService } from '../tickets/tickets.service';
import {
  DASHBOARD_TICKETS_TIMEOUT_MS,
  getDashboardTimeoutWarning,
  startOfDay,
  toOpenTicketRecordItems,
  toTicketSummaryItems,
  withTimeout,
} from './dashboard.shared';

export const DASHBOARD_VIEW_INTERNAL = 'dashboard:view_internal' as const;

export type DashboardContractRecord = {
  totalValue?: number | string | { toNumber(): number } | null;
  minimumWage?: number | string | { toNumber(): number } | null;
  percentage?: number | string | { toNumber(): number } | null;
  taxRate?: number | string | { toNumber(): number } | null;
  programmerRate?: number | string | { toNumber(): number } | null;
};

export type DashboardSefazCurrentRecord = {
  uf: string;
  service: 'NFE' | 'NFCE' | 'CTE' | 'MDFE';
  status: 'ONLINE' | 'UNSTABLE' | 'OFFLINE';
  latency: number;
  checkedAt: Date;
  changedAt: Date;
};

export type DashboardSefazHistoryRecord = {
  uf: string;
  service: 'NFE' | 'NFCE' | 'CTE' | 'MDFE';
  status: 'ONLINE' | 'UNSTABLE' | 'OFFLINE';
  latency: number;
};

export type DashboardRequester = {
  userId: string;
  role: Role;
  email: string;
};

export type DashboardCrmAccessContext = {
  canViewCrm: boolean;
  companyScope: {
    isGlobal: boolean;
    companyIds: string[];
  };
  scopedCompanyIds: string[] | undefined;
};

export type DashboardTicketTeam = 'SUPORTE' | 'DESENVOLVIMENTO';

export type DashboardTicketsResponse = Awaited<ReturnType<TicketsService['findAll']>>;

export type DashboardMembershipStateSource = {
  company?: {
    addresses?: Array<{
      estado?: string | null;
    }>;
  } | null;
};

const DASHBOARD_CRM_LEAD_SELECT = {
  stage: true,
  estimatedValue: true,
  expectedCloseAt: true,
  nextStep: true,
} as const;

const DASHBOARD_ACTIVE_CONTRACT_SELECT = {
  totalValue: true,
  minimumWage: true,
  percentage: true,
  taxRate: true,
  programmerRate: true,
} as const;

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

export function mergeTicketWarnings(...warnings: Array<string | undefined>) {
  const unique = Array.from(new Set(warnings.filter(Boolean)));
  return unique.length > 0 ? unique.join(' ') : undefined;
}
export function buildCrmSummary(leads: any[]): DashboardCrmSummary {
  const today = startOfDay();

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
    stageDistribution: CRM_STAGE_ORDER.map((stage) => ({
      stage,
      label: CRM_STAGE_LABELS[stage],
      count: leads.filter((lead) => lead.stage === stage).length,
    })),
  };
}
export function summarizeActiveContracts(contracts: DashboardContractRecord[]) {
  return {
    activeContracts: contracts.length,
    totalValue: contracts.reduce((sum, contract) => sum + calculateContractMonthlyValue(contract), 0),
  };
}

export function resolveDashboardUFsFromMembershipCompanies(memberships: DashboardMembershipStateSource[]) {
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

@Injectable()
export class DashboardSupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly ticketsService: TicketsService,
  ) {}

  async getUserDashboardUFs(userId: string): Promise<string[]> {
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

  async resolveDailyPassword(rawHeaders?: IncomingHttpHeaders): Promise<DashboardDailyPassword | null> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const allowed = await this.authorizationService.userHasPermission(requester, 'dashboard:view_daily_password', {
      acceptCompanyScope: true,
    });

    return allowed ? getDailyPasswordForDate() : null;
  }

  async resolveDashboardCrmAccess(requester: DashboardRequester): Promise<DashboardCrmAccessContext> {
    const [canViewCrm, companyScope] = await Promise.all([
      this.canViewDashboardCrm(requester),
      this.authorizationService.resolveCompanyAccessScope(requester, 'companies:view_own', 'companies:view_all'),
    ]);

    return {
      canViewCrm,
      companyScope,
      scopedCompanyIds: companyScope.isGlobal ? undefined : companyScope.companyIds,
    };
  }

  async loadCrmSummary(): Promise<DashboardCrmSummary> {
    const crmLeads = await (this.prisma as any)
      .crmLead.findMany({ select: DASHBOARD_CRM_LEAD_SELECT })
      .catch(() => []);

    return buildCrmSummary(crmLeads);
  }

  async loadScopedActiveContracts(scopedCompanyIds?: string[]): Promise<DashboardContractRecord[]> {
    const contractsBaseWhere = this.buildScopedContractsWhere(scopedCompanyIds);

    return this.prisma.contract
      .findMany({
        where: { status: 'ACTIVE', ...contractsBaseWhere },
        select: DASHBOARD_ACTIVE_CONTRACT_SELECT,
      })
      .catch(() => []);
  }

  async loadScopedContractsSummary(scopedCompanyIds?: string[]) {
    const contracts = await this.loadScopedActiveContracts(scopedCompanyIds);
    return summarizeActiveContracts(contracts);
  }

  async getConfiguredSefazRoutes() {
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
      const configuredMap = new Map(configured.map((route) => [`${route.uf}:${route.service}`, route]));

      const merged = [...configured];
      for (const route of defaults) {
        const key = `${route.uf}:${route.service}`;
        if (!configuredMap.has(key)) {
          merged.push(route);
        }
      }

      return merged;
    } catch {
      return defaults;
    }
  }

  buildScopedCompaniesWhere(companyIds?: string[]): Prisma.CompanyWhereInput {
    if (!companyIds) {
      return { deletedAt: null };
    }

    if (companyIds.length === 0) {
      return { deletedAt: null, id: { in: ['__no_company_scope__'] } };
    }

    return {
      deletedAt: null,
      id: { in: companyIds },
    };
  }

  buildScopedUsersWhere(companyIds?: string[]): Prisma.UserWhereInput {
    if (!companyIds) {
      return { deletedAt: null };
    }

    if (companyIds.length === 0) {
      return { deletedAt: null, id: { in: ['__no_user_scope__'] } };
    }

    return {
      deletedAt: null,
      OR: [
        { memberships: { some: { companyId: { in: companyIds } } } },
        { contact: { is: { companyLinks: { some: { companyId: { in: companyIds } } } } } },
        { contactLinks: { some: { companyId: { in: companyIds } } } },
      ],
    };
  }

  buildScopedContractsWhere(companyIds?: string[]): Prisma.ContractWhereInput {
    if (!companyIds) {
      return {
        company: {
          deletedAt: null,
        },
      };
    }

    if (companyIds.length === 0) {
      return {
        companyId: { in: ['__no_company_scope__'] },
        company: {
          deletedAt: null,
        },
      };
    }

    return {
      companyId: { in: companyIds },
      company: {
        deletedAt: null,
      },
    };
  }

  async getDashboardTicketTeam(requester: DashboardRequester): Promise<DashboardTicketTeam | undefined> {
    const hasDevelopmentScope = await this.authorizationService.userHasPermission(
      requester,
      'dashboard:view_development_scope',
    );

    return hasDevelopmentScope ? 'DESENVOLVIMENTO' : undefined;
  }

  async canViewDashboardCrm(requester: DashboardRequester) {
    const canView = await this.authorizationService.userHasPermission(requester, 'crm:view', {
      acceptCompanyScope: true,
    });
    if (canView) return true;
    return this.authorizationService.userHasPermission(requester, 'crm:manage', { acceptCompanyScope: true });
  }

  buildDashboardQueryUfs(dashboardUFs: string[]) {
    const queryUfs = [...dashboardUFs];
    if (!queryUfs.includes('SVRS')) queryUfs.push('SVRS');
    if (!queryUfs.includes('SVAN')) queryUfs.push('SVAN');
    return queryUfs;
  }

  async fetchDashboardTickets(
    rawHeaders: IncomingHttpHeaders | undefined,
    label: string,
    team?: DashboardTicketTeam,
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

  mapDashboardCompany(company: any) {
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

  mapDashboardContact(contact: any) {
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

  mapDashboardUser(user: any) {
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

  mapSefazStatuses(records: DashboardSefazCurrentRecord[], historyRecords: DashboardSefazHistoryRecord[]) {
    const historyMap = buildSefazHistoryMap(historyRecords);
    return records.map((record) => mapDashboardSefazStatus(record, historyMap));
  }

  async fetchSefazStatusData(dashboardUFs: string[]) {
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
}
