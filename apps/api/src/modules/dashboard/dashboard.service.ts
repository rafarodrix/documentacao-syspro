import { ForbiddenException, Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import type { Role } from '@prisma/client';
import type {
  DashboardCrmSummary,
  DashboardDailyPassword,
  DashboardOpenTicketRecord,
  DashboardResponse,
  DashboardTicketKpis,
  DashboardTicketSummary,
  DashboardTarefasOverdueItem,
} from '@dosc-syspro/contracts/dashboard';
import { getDailyPasswordForDate } from '@dosc-syspro/contracts/dashboard';
import { buildDefaultSefazRoutes } from '@dosc-syspro/contracts/sefaz-endpoints';
import { sefazRoutesSchema } from '@dosc-syspro/contracts/sefaz-routes';
import type { TicketModuleRecord } from '@dosc-syspro/contracts/ticket';
import { SETTING_KEYS } from '@dosc-syspro/contracts/settings';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { IntegrationContextService } from '../settings/integration-context.service';
import { ChatwootClient } from '../integrations/chatwoot/chatwoot.client';
import { TicketsService } from '../tickets/tickets.service';

const DASHBOARD_TICKETS_TIMEOUT_MS = 4000;
const DASHBOARD_VIEW_INTERNAL = 'dashboard:view_internal' as const;

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

function readTicketMetadataString(metadata: TicketModuleRecord['metadata'], key: string): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toOpenTicketRecordItems(records: TicketModuleRecord[]): DashboardOpenTicketRecord[] {
  const items: DashboardOpenTicketRecord[] = [];

  for (const ticket of records) {
    const status = mapTicketStatus(ticket.status);
    if (status === 'Resolvido') continue;

    const currentTeam = readTicketMetadataString(ticket.metadata, 'currentTeam');
    const moduleName = readTicketMetadataString(ticket.metadata, 'module');
    const categoryName = readTicketMetadataString(ticket.metadata, 'category');

    items.push({
      id: ticket.id,
      number: ticket.ticketNumber || ticket.id.slice(0, 8).toUpperCase(),
      subject: ticket.subject || 'Sem assunto',
      team:
        currentTeam === 'SUPORTE' || currentTeam === 'DESENVOLVIMENTO'
          ? currentTeam
          : null,
      module: moduleName,
      category: categoryName,
      priority: mapTicketPriority(ticket.priority),
      status,
    });
  }

  return items;
}

function buildTicketKpis(records: DashboardTicketSummary[]): DashboardTicketKpis {
  const resolved = records.filter((ticket) => ticket.status === 'Resolvido').length;
  const pending = records.filter((ticket) => ticket.status === 'Pendente' || ticket.status === 'Em Análise').length;
  const open = records.filter((ticket) => ticket.status === 'Aberto').length;

  return { open, pending, resolved };
}

function mapConversationStatus(status: string) {
  switch (status) {
    case 'UNASSIGNED':
      return 'Sem responsavel';
    case 'TRIAGE':
      return 'Triagem';
    case 'IN_PROGRESS':
      return 'Em andamento';
    case 'WAITING_CUSTOMER':
      return 'Aguardando cliente';
    case 'WAITING_INTERNAL':
      return 'Aguardando interno';
    case 'TESTING':
      return 'Teste';
    case 'RESOLVED':
      return 'Resolvido';
    case 'ARCHIVED':
      return 'Arquivado';
    default:
      return 'Novo';
  }
}

function averageDurationInMinutes(items: Array<{ startedAt: Date; endedAt: Date | null | undefined }>) {
  const valid = items.filter((item) => item.endedAt instanceof Date && item.endedAt >= item.startedAt);
  if (!valid.length) return null;

  const totalMs = valid.reduce((sum, item) => sum + (item.endedAt!.getTime() - item.startedAt.getTime()), 0);
  return Math.round((totalMs / valid.length / 60000) * 10) / 10;
}

function parseDateInput(value?: string, endOfDay = false) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  const base = new Date(`${normalized}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(base.getTime()) ? null : base;
}

function parseChatwootDate(value: unknown) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = new Date(value > 10_000_000_000 ? value : value * 1000);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  if (/^\d+$/.test(normalized)) {
    const numeric = Number(normalized);
    const parsed = new Date(numeric > 10_000_000_000 ? numeric : numeric * 1000);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractChatwootConversationLabels(conversation: any): string[] {
  const labels = Array.isArray(conversation?.labels) ? conversation.labels : [];
  return labels.map((item: unknown) => String(item ?? '').trim().toLowerCase()).filter(Boolean);
}

function extractChatwootConversationCustomAttributes(conversation: any): Record<string, unknown> {
  const value =
    conversation?.custom_attributes ??
    conversation?.meta?.custom_attributes ??
    conversation?.additional_attributes ??
    conversation?.meta?.additional_attributes;
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function extractChatwootAssignee(conversation: any) {
  const assignee = conversation?.meta?.assignee ?? conversation?.assignee ?? conversation?.last_non_activity_message?.conversation?.assignee;
  const id = String(assignee?.id ?? '').trim();
  const name = String(assignee?.name ?? assignee?.available_name ?? assignee?.email ?? '').trim();
  return id ? { id, name: name || id } : null;
}

function extractChatwootChannel(conversation: any) {
  const channelRaw = String(
    conversation?.meta?.channel ??
    conversation?.channel ??
    conversation?.inbox?.channel_type ??
    '',
  ).trim().toLowerCase();

  if (channelRaw.includes('email')) return 'EMAIL' as const;
  if (channelRaw.includes('portal') || channelRaw.includes('api')) return 'PORTAL' as const;
  if (channelRaw.includes('phone') || channelRaw.includes('call')) return 'PHONE' as const;
  return 'WHATSAPP' as const;
}

function extractChatwootContactSummary(conversation: any) {
  const name = String(
    conversation?.meta?.sender?.name ??
    conversation?.contact?.name ??
    conversation?.last_non_activity_message?.sender?.name ??
    '',
  ).trim();
  const phone = String(
    conversation?.meta?.sender?.phone_number ??
    conversation?.contact?.phone_number ??
    conversation?.last_non_activity_message?.sender?.phone_number ??
    '',
  ).trim();
  const identifier = String(
    conversation?.meta?.sender?.identifier ??
    conversation?.contact?.identifier ??
    conversation?.last_non_activity_message?.sender?.identifier ??
    conversation?.contact_inbox?.source_id ??
    '',
  ).trim();
  const key = identifier || phone || name;
  const label = name || phone || identifier || 'Contato nao identificado';
  return key ? { key, name: label } : null;
}

function extractChatwootContactText(conversation: any) {
  const candidates = [
    conversation?.meta?.sender?.name,
    conversation?.meta?.sender?.phone_number,
    conversation?.meta?.sender?.identifier,
    conversation?.last_non_activity_message?.sender?.name,
    conversation?.last_non_activity_message?.sender?.phone_number,
    conversation?.contact?.name,
    conversation?.contact?.phone_number,
  ];
  return candidates.map((item) => String(item ?? '').trim()).filter(Boolean).join(' ').toLowerCase();
}

function resolveChatwootClosureOrigin(conversation: any) {
  const customAttributes = extractChatwootConversationCustomAttributes(conversation);
  const closureOrigin = String(customAttributes.closure_origin ?? '').trim().toLowerCase();
  if (closureOrigin) return closureOrigin;

  const labels = extractChatwootConversationLabels(conversation);
  if (labels.includes('cancelado_cliente')) return 'cancelled_by_customer';
  if (labels.includes('cancelado_agente')) return 'cancelled_by_agent';
  if (labels.includes('spam')) return 'spam';
  return null;
}

function shouldSkipChatwootCsat(conversation: any) {
  const customAttributes = extractChatwootConversationCustomAttributes(conversation);
  const skipCsatRaw = String(customAttributes.skip_csat ?? '').trim().toLowerCase();
  return skipCsatRaw === 'true' || skipCsatRaw === '1' || Boolean(resolveChatwootClosureOrigin(conversation));
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
  private static readonly ATENDIMENTOS_CACHE_TTL_MS = 45_000;
  private readonly atendimentosCache = new Map<string, { expiresAt: number; payload: any }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly integrationContext: IntegrationContextService,
    private readonly chatwootClient: ChatwootClient,
    private readonly ticketsService: TicketsService,
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

    if (!setting?.value) return buildDefaultSefazRoutes();

    try {
      const parsed = JSON.parse(setting.value);
      const validation = sefazRoutesSchema.safeParse(parsed);
      return validation.success ? validation.data : buildDefaultSefazRoutes();
    } catch {
      return buildDefaultSefazRoutes();
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
      const dashboardUFs = await this.getUserDashboardUFs(requester.userId);
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
          where: { uf: { in: dashboardUFs } },
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

    const [sefazRecords, activeContracts] = await Promise.all([
      this.prisma.sefazStatusCurrent
        .findMany({ where: { uf: { in: dashboardUFs } }, orderBy: { checkedAt: 'desc' } })
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
    const tickets = normalizedTickets.filter((t) => t.status !== 'Resolvido').slice(0, 5);
    const totalOpen =
      ticketsResponse?.success && ticketsResponse.statusCounts
        ? ticketsResponse.statusCounts.open +
          ticketsResponse.statusCounts.development +
          ticketsResponse.statusCounts.testing
        : normalizedTickets.filter((t) => t.status !== 'Resolvido').length;

    return {
      success: true as const,
      data: {
        openTicketRecords,
        tickets,
        totalOpen,
        activity: toSeries(normalizedTickets.map((t) => new Date(t.lastUpdate))),
        ticketWarning,
        scopeMode: (dashboardTicketTeam === 'DESENVOLVIMENTO' ? 'development' : 'all') as 'all' | 'development',
        allowAreaFilter,
      },
    };
  }

  async getAtendimentosData(
    rawHeaders?: IncomingHttpHeaders,
    filters?: { from?: string; to?: string; assigneeId?: string; contact?: string; refresh?: boolean },
  ) {
    const requester = await this.authorizationService.assertPermission(rawHeaders, 'dashboard:view');
    const canViewAtendimentos = await this.authorizationService.userHasPermission(
      requester,
      'dashboard:view_support_conversations',
    );
    if (!canViewAtendimentos) {
      throw new ForbiddenException('Sem permissao para visualizar atendimentos.');
    }

    const periodStart = parseDateInput(filters?.from) ?? startOfDay();
    const periodEnd = parseDateInput(filters?.to, true) ?? new Date();
    const assigneeId = String(filters?.assigneeId ?? '').trim();
    const contactQuery = String(filters?.contact ?? '').trim().toLowerCase();
    const cacheKey = [
      requester.userId,
      periodStart.toISOString(),
      periodEnd.toISOString(),
      assigneeId || '__all__',
      contactQuery || '__all__',
    ].join('|');
    const forceRefresh = Boolean(filters?.refresh);
    const cached = this.atendimentosCache.get(cacheKey);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return cached.payload;
    }
    const contexts = await this.integrationContext.listActiveContexts();

    if (!contexts.length) {
      const payload = {
        success: true as const,
        data: {
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          refreshedAt: new Date().toISOString(),
          cacheTtlSeconds: Math.floor(DashboardService.ATENDIMENTOS_CACHE_TTL_MS / 1000),
          totalCount: 0,
          openCount: 0,
          unassignedCount: 0,
          resolvedCount: 0,
          cancelledCount: 0,
          cancelledByCustomerCount: 0,
          cancelledByAgentCount: 0,
          spamCount: 0,
          unlinkedCount: 0,
          csatSkippedCount: 0,
          csatEligibleResolvedCount: 0,
          csatResponseCount: 0,
          csatLowScoreCount: 0,
          csatAverageScore: null,
          avgFirstResponseMinutes: null,
          avgResolutionHours: null,
          activity: [],
          statusCounts: [],
          channelCounts: [],
          assigneeLoads: [],
          assigneeOptions: [],
          topContacts: [],
          csatScoreDistribution: [],
          csatAgentPerformance: [],
          warning: 'Nenhum contexto ativo do Chatwoot foi encontrado para o dashboard.',
        },
      };
      this.atendimentosCache.set(cacheKey, {
        expiresAt: Date.now() + DashboardService.ATENDIMENTOS_CACHE_TTL_MS,
        payload,
      });
      return payload;
    }

    const items: any[] = [];
    const assigneeOptionsMap = new Map<string, string>();
    const activeConnectionKeys = contexts.map((context) => context.connectionKey);

    for (const context of contexts) {
      const agents = await this.chatwootClient.listAgents(context.chatwoot).catch(() => []);
      for (const agent of agents) {
        const id = String(agent?.id ?? '').trim();
        const name = String(agent?.name ?? agent?.available_name ?? agent?.email ?? '').trim();
        if (id && name) assigneeOptionsMap.set(id, name);
      }

      for (let page = 1; page <= 8; page += 1) {
        const pageItems = await this.chatwootClient.listConversations(context.chatwoot, { page, status: 'all' }).catch(() => []);
        if (!pageItems.length) break;
        items.push(...pageItems);
        if (pageItems.length < 25) break;
      }
    }

    const filtered = items.filter((conversation) => {
      const createdAtValue = Number(conversation?.created_at ?? 0);
      const createdAt = Number.isFinite(createdAtValue) ? new Date(createdAtValue * 1000) : new Date(conversation?.created_at ?? conversation?.timestamp ?? 0);
      if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) return false;
      if (createdAt < periodStart || createdAt > periodEnd) return false;

      const assignee = extractChatwootAssignee(conversation);
      if (assigneeId && assignee?.id !== assigneeId) return false;
      if (contactQuery && !extractChatwootContactText(conversation).includes(contactQuery)) return false;
      return true;
    });

    const statusLabelMap: Record<string, string> = {
      open: 'Em andamento',
      pending: 'Aguardando cliente',
      snoozed: 'Aguardando interno',
      resolved: 'Resolvido',
    };
    const statusOrder = ['Sem responsavel', 'Em andamento', 'Aguardando cliente', 'Aguardando interno', 'Resolvido', 'Arquivado'] as const;
    const statusCountsMap = new Map<string, number>(statusOrder.map((status) => [status, 0]));
    const channelOrder = ['WHATSAPP', 'EMAIL', 'PORTAL', 'PHONE'] as const;
    const channelCountsMap = new Map<string, number>(channelOrder.map((channel) => [channel, 0]));
    const assigneeLoadMap = new Map<string, {
      userId: string | null;
      name: string;
      openCount: number;
      waitingCount: number;
      resolvedCount: number;
      firstResponseSum: number;
      firstResponseCount: number;
      resolutionSum: number;
      resolutionCount: number;
    }>();
    const topContactsMap = new Map<string, { key: string; name: string; count: number; channel: 'WHATSAPP' | 'EMAIL' | 'PORTAL' | 'PHONE' }>();

    // New variables for categories, tags, SLA, backlog and contacts motive/lastAttendance
    const RECOGNIZED_CATEGORIES = [
      'fiscal',
      'nota fiscal',
      'financeiro',
      'vendas',
      'estoque',
      'frente de caixa',
      'balança',
      'instalação',
      'treinamento',
      'erro operacional',
      'erro sistema',
      'dúvida de uso',
      'solicitação de melhoria',
    ];

    const categoryCountsMap = new Map<string, number>(RECOGNIZED_CATEGORIES.map((cat) => [cat, 0]));
    categoryCountsMap.set('Outros', 0);

    const tagCountsMap = new Map<string, number>();

    let firstResponseWithinSlaCount = 0;
    let firstResponseTotalSlaCount = 0;
    let resolutionWithinSlaCount = 0;
    let resolutionTotalSlaCount = 0;
    let delayedOpenCount = 0;

    let backlogToday = 0;
    let backlogOver1d = 0;
    let backlogOver3d = 0;
    let backlogOver7d = 0;

    const contactLabelsMap = new Map<string, Map<string, number>>();
    const contactLastDateMap = new Map<string, Date>();

    let cancelledByCustomerCount = 0;
    let cancelledByAgentCount = 0;
    let spamCount = 0;
    let resolvedCount = 0;
    let openCount = 0;
    let unassignedCount = 0;
    let csatSkippedCount = 0;
    let csatEligibleResolvedCount = 0;

    for (const conversation of filtered) {
      const closureOrigin = resolveChatwootClosureOrigin(conversation);
      const isCancelledByCustomer = closureOrigin === 'cancelled_by_customer';
      const isCancelledByAgent = closureOrigin === 'cancelled_by_agent';
      const isSpam = closureOrigin === 'spam';
      const skipCsat = shouldSkipChatwootCsat(conversation);
      if (isCancelledByCustomer) cancelledByCustomerCount += 1;
      if (isCancelledByAgent) cancelledByAgentCount += 1;
      if (isSpam) spamCount += 1;
      if (skipCsat) csatSkippedCount += 1;

      const rawStatus = String(conversation?.status ?? '').trim().toLowerCase();
      const status =
        !extractChatwootAssignee(conversation) && rawStatus === 'open'
          ? 'Sem responsavel'
          : rawStatus === 'resolved' && (isCancelledByCustomer || isCancelledByAgent || isSpam)
            ? 'Arquivado'
            : statusLabelMap[rawStatus] ?? 'Em andamento';
      statusCountsMap.set(status, (statusCountsMap.get(status) || 0) + 1);

      const mappedChannel = extractChatwootChannel(conversation);
      channelCountsMap.set(mappedChannel, (channelCountsMap.get(mappedChannel) || 0) + 1);

      const contact = extractChatwootContactSummary(conversation);
      const created = parseChatwootDate(conversation?.created_at);
      const firstReply = parseChatwootDate(conversation?.first_reply_created_at);

      if (contact) {
        const current = topContactsMap.get(contact.key) || { ...contact, count: 0, channel: mappedChannel };
        current.count += 1;
        current.channel = mappedChannel;
        topContactsMap.set(contact.key, current);

        if (created instanceof Date) {
          const existingLastDate = contactLastDateMap.get(contact.key);
          if (!existingLastDate || created > existingLastDate) {
            contactLastDateMap.set(contact.key, created);
          }

          let labelsMap = contactLabelsMap.get(contact.key);
          if (!labelsMap) {
            labelsMap = new Map<string, number>();
            contactLabelsMap.set(contact.key, labelsMap);
          }
          const labels = extractChatwootConversationLabels(conversation);
          for (const label of labels) {
            labelsMap.set(label, (labelsMap.get(label) || 0) + 1);
          }
        }
      }

      const assignee = extractChatwootAssignee(conversation);
      if (!assignee) {
        unassignedCount += 1;
      } else {
        const current = assigneeLoadMap.get(assignee.id) || {
          userId: assignee.id,
          name: assignee.name,
          openCount: 0,
          waitingCount: 0,
          resolvedCount: 0,
          firstResponseSum: 0,
          firstResponseCount: 0,
          resolutionSum: 0,
          resolutionCount: 0,
        };
        if (rawStatus !== 'resolved') current.openCount += 1;
        if (rawStatus === 'pending' || rawStatus === 'snoozed') current.waitingCount += 1;
        if (rawStatus === 'resolved') current.resolvedCount += 1;

        if (created instanceof Date) {
          if (firstReply instanceof Date && firstReply >= created) {
            const firstResponseMin = (firstReply.getTime() - created.getTime()) / 60000;
            current.firstResponseSum += firstResponseMin;
            current.firstResponseCount += 1;
          }
          if (rawStatus === 'resolved') {
            const resolvedAt =
              parseChatwootDate(conversation?.meta?.resolved_at) ??
              parseChatwootDate(conversation?.resolved_at) ??
              parseChatwootDate(conversation?.updated_at);
            if (resolvedAt instanceof Date && resolvedAt >= created) {
              const resolutionHours = (resolvedAt.getTime() - created.getTime()) / 3600000;
              current.resolutionSum += resolutionHours;
              current.resolutionCount += 1;
            }
          }
        }
        assigneeLoadMap.set(assignee.id, current);
      }

      if (rawStatus === 'resolved') {
        resolvedCount += 1;
        if (!skipCsat) {
          csatEligibleResolvedCount += 1;
        }
      } else {
        openCount += 1;
      }

      // SLA & Backlog metrics calculation
      if (created instanceof Date) {
        if (firstReply instanceof Date && firstReply >= created) {
          const firstResponseMin = (firstReply.getTime() - created.getTime()) / 60000;
          firstResponseTotalSlaCount += 1;
          if (firstResponseMin <= 15) {
            firstResponseWithinSlaCount += 1;
          }
        }

        if (rawStatus === 'resolved') {
          const resolvedAt =
            parseChatwootDate(conversation?.meta?.resolved_at) ??
            parseChatwootDate(conversation?.resolved_at) ??
            parseChatwootDate(conversation?.updated_at);
          if (resolvedAt instanceof Date && resolvedAt >= created) {
            const resolutionHours = (resolvedAt.getTime() - created.getTime()) / 3600000;
            resolutionTotalSlaCount += 1;
            if (resolutionHours <= 24) {
              resolutionWithinSlaCount += 1;
            }
          }
        } else {
          // Delayed tickets (open > 24h)
          const ageHours = (Date.now() - created.getTime()) / 3600000;
          if (ageHours > 24) {
            delayedOpenCount += 1;
          }

          // Backlog distribution
          if (ageHours <= 24) {
            backlogToday += 1;
          } else if (ageHours <= 72) {
            backlogOver1d += 1;
          } else if (ageHours <= 168) {
            backlogOver3d += 1;
          } else {
            backlogOver7d += 1;
          }
        }
      }

      // Categories and Tags aggregation from conversation labels
      const cLabels = extractChatwootConversationLabels(conversation);
      let matchedCategory = false;
      for (const label of cLabels) {
        const normLabel = label.toLowerCase();
        tagCountsMap.set(label, (tagCountsMap.get(label) || 0) + 1);

        const matched = RECOGNIZED_CATEGORIES.find((cat) => cat === normLabel);
        if (matched) {
          categoryCountsMap.set(matched, (categoryCountsMap.get(matched) || 0) + 1);
          matchedCategory = true;
        }
      }
      if (!matchedCategory) {
        categoryCountsMap.set('Outros', (categoryCountsMap.get('Outros') || 0) + 1);
      }
    }

    const avgFirstResponseMinutes = averageDurationInMinutes(
      filtered.map((conversation) => {
        const created = parseChatwootDate(conversation?.created_at);
        const firstReply = parseChatwootDate(conversation?.first_reply_created_at);
        return { startedAt: created, endedAt: firstReply };
      }).filter((item): item is { startedAt: Date; endedAt: Date | null } => item.startedAt instanceof Date),
    );

    const avgResolutionHours = (() => {
      const valid = filtered
        .map((conversation) => {
          const created = parseChatwootDate(conversation?.created_at);
          const resolvedAt =
            parseChatwootDate(conversation?.meta?.resolved_at) ??
            parseChatwootDate(conversation?.resolved_at) ??
            parseChatwootDate(conversation?.updated_at);
          const rawStatus = String(conversation?.status ?? '').trim().toLowerCase();
          if (rawStatus !== 'resolved' || !(created instanceof Date) || !(resolvedAt instanceof Date) || resolvedAt < created) {
            return null;
          }
          return (resolvedAt.getTime() - created.getTime()) / 3_600_000;
        })
        .filter((value): value is number => value !== null);

      if (!valid.length) return null;
      return Math.round((valid.reduce((sum, item) => sum + item, 0) / valid.length) * 10) / 10;
    })();

    const csatRatings = await this.prisma.chatwootCsatRating.findMany({
      where: {
        connectionKey: { in: activeConnectionKeys },
        respondedAt: { gte: periodStart, lte: periodEnd },
        ...(assigneeId ? { agentId: assigneeId } : {}),
        ...(contactQuery
          ? {
              contact: {
                contains: contactQuery,
                mode: 'insensitive' as const,
              },
            }
          : {}),
      },
      select: {
        agentId: true,
        agentName: true,
        score: true,
        status: true,
      },
    }).catch(() => []);

    const csatResponseCount = csatRatings.length;
    const csatLowScoreCount = csatRatings.filter((rating) => Number(rating.score) <= 2 || String(rating.status).toUpperCase() === 'LOW_SCORE').length;
    const csatAverageScore =
      csatRatings.length > 0
        ? Math.round((csatRatings.reduce((sum, rating) => sum + Number(rating.score ?? 0), 0) / csatRatings.length) * 100) / 100
        : null;
    const csatDistributionMap = new Map<number, number>([1, 2, 3, 4, 5].map((score) => [score, 0]));
    const csatAgentMap = new Map<string, { agentId: string | null; agentName: string; totalScore: number; responseCount: number; lowScoreCount: number }>();

    for (const rating of csatRatings) {
      const score = Math.max(1, Math.min(5, Number(rating.score ?? 0) || 0));
      if (score >= 1 && score <= 5) {
        csatDistributionMap.set(score, (csatDistributionMap.get(score) || 0) + 1);
      }

      const key = String(rating.agentId ?? '').trim() || `__agent__${String(rating.agentName ?? '').trim() || 'Sem atendente'}`;
      const agentName = String(rating.agentName ?? '').trim() || 'Sem atendente';
      const current = csatAgentMap.get(key) || {
        agentId: rating.agentId ?? null,
        agentName,
        totalScore: 0,
        responseCount: 0,
        lowScoreCount: 0,
      };
      current.totalScore += score;
      current.responseCount += 1;
      if (score <= 2 || String(rating.status).toUpperCase() === 'LOW_SCORE') current.lowScoreCount += 1;
      csatAgentMap.set(key, current);
    }

    // Now map topContacts with motive & lastAttendance
    const topContactsMapped = Array.from(topContactsMap.values())
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
      .slice(0, 6)
      .map((contact) => {
        const labelsMap = contactLabelsMap.get(contact.key);
        let motive: string | null = null;
        if (labelsMap && labelsMap.size > 0) {
          let maxCount = -1;
          let bestLabel = '';
          for (const [label, count] of labelsMap.entries()) {
            if (count > maxCount) {
              maxCount = count;
              bestLabel = label;
            }
          }
          if (bestLabel) {
            motive = bestLabel.charAt(0).toUpperCase() + bestLabel.slice(1);
          }
        }

        const lastDate = contactLastDateMap.get(contact.key);
        let lastAttendance = 'Sem registro';
        if (lastDate) {
          const diffMs = Date.now() - lastDate.getTime();
          const diffDays = Math.floor(diffMs / 86400000);
          if (diffDays === 0) {
            lastAttendance = 'Hoje';
          } else if (diffDays === 1) {
            lastAttendance = 'Ontem';
          } else {
            lastAttendance = `Há ${diffDays} dias`;
          }
        }

        return {
          key: contact.key,
          name: contact.name,
          count: contact.count,
          channel: contact.channel,
          motive,
          lastAttendance,
        };
      });

    // Map assigneeLoads with rich agent productivity metrics
    const assigneeLoadsMapped = Array.from(assigneeLoadMap.values())
      .map((item) => {
        const csatAgentKey = item.userId ? String(item.userId).trim() : `__agent__${String(item.name).trim() || 'Sem atendente'}`;
        const csatData = csatAgentMap.get(csatAgentKey);
        const averageScore = csatData && csatData.responseCount > 0
          ? Math.round((csatData.totalScore / csatData.responseCount) * 100) / 100
          : null;
        const responseCount = csatData ? csatData.responseCount : 0;

        const avgFirstResponse = item.firstResponseCount > 0
          ? Math.round((item.firstResponseSum / item.firstResponseCount) * 10) / 10
          : null;

        const avgResolution = item.resolutionCount > 0
          ? Math.round((item.resolutionSum / item.resolutionCount) * 10) / 10
          : null;

        return {
          userId: item.userId,
          name: item.name,
          openCount: item.openCount,
          waitingCount: item.waitingCount,
          resolvedCount: item.resolvedCount,
          avgFirstResponseMinutes: avgFirstResponse,
          avgResolutionHours: avgResolution,
          averageScore,
          responseCount,
        };
      })
      .sort((left, right) => right.openCount - left.openCount)
      .slice(0, 8);

    // Compute SLA ratios
    const slaFirstResponsePct = firstResponseTotalSlaCount > 0
      ? Math.round((firstResponseWithinSlaCount / firstResponseTotalSlaCount) * 100)
      : null;
    const slaResolutionPct = resolutionTotalSlaCount > 0
      ? Math.round((resolutionWithinSlaCount / resolutionTotalSlaCount) * 100)
      : null;

    const payload = {
      success: true as const,
      data: {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        refreshedAt: new Date().toISOString(),
        cacheTtlSeconds: Math.floor(DashboardService.ATENDIMENTOS_CACHE_TTL_MS / 1000),
        appliedAssigneeId: assigneeId || undefined,
        appliedContactQuery: contactQuery || undefined,
        totalCount: filtered.length,
        openCount,
        unassignedCount,
        resolvedCount,
        cancelledCount: cancelledByCustomerCount + cancelledByAgentCount,
        cancelledByCustomerCount,
        cancelledByAgentCount,
        spamCount,
        unlinkedCount: 0,
        csatSkippedCount,
        csatEligibleResolvedCount,
        csatResponseCount,
        csatLowScoreCount,
        csatAverageScore,
        avgFirstResponseMinutes,
        avgResolutionHours,
        activity: toSeries(
          filtered
            .map((conversation) => parseChatwootDate(conversation?.created_at))
            .filter((value): value is Date => value instanceof Date),
        ),
        statusCounts: statusOrder.map((status) => ({ status, count: statusCountsMap.get(status) || 0 })),
        channelCounts: channelOrder.map((channel) => ({ channel, count: channelCountsMap.get(channel) || 0 })),
        assigneeLoads: assigneeLoadsMapped,
        assigneeOptions: Array.from(assigneeOptionsMap.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((left, right) => left.name.localeCompare(right.name)),
        topContacts: topContactsMapped,
        csatScoreDistribution: [1, 2, 3, 4, 5].map((score) => ({ score, count: csatDistributionMap.get(score) || 0 })),
        csatAgentPerformance: Array.from(csatAgentMap.values())
          .map((item) => ({
            agentId: item.agentId,
            agentName: item.agentName,
            averageScore: Math.round((item.totalScore / Math.max(item.responseCount, 1)) * 100) / 100,
            responseCount: item.responseCount,
            lowScoreCount: item.lowScoreCount,
          }))
          .sort((left, right) => right.responseCount - left.responseCount || right.averageScore - left.averageScore)
          .slice(0, 6),
        warning: contexts.length > 1 ? 'Dashboard consolidado a partir de multiplos contextos ativos do Chatwoot.' : undefined,
        // Enriched fields for Refactored Dashboard
        slaFirstResponsePct,
        slaResolutionPct,
        delayedOpenCount,
        backlog: {
          today: backlogToday,
          over1d: backlogOver1d,
          over3d: backlogOver3d,
          over7d: backlogOver7d,
        },
        categories: Array.from(categoryCountsMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((left, right) => right.count - left.count),
        topTags: Array.from(tagCountsMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((left, right) => right.count - left.count)
          .slice(0, 10),
      },
    };
    this.atendimentosCache.set(cacheKey, {
      expiresAt: Date.now() + DashboardService.ATENDIMENTOS_CACHE_TTL_MS,
      payload,
    });
    return payload;
  }

  async getCadastrosData(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.assertPermission(rawHeaders, 'dashboard:view');

    const [
      canViewCompaniesDirect,
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

    const canViewContactsModule = canViewContactsDirect || canViewContactsScoped || canViewContactsGlobal;
    const canViewUsersModule = canViewUsersGlobal || canViewUsersScoped || canViewUsersDirect;

    const fallbackCompanyIds =
      canViewCompaniesDirect || canViewContactsDirect || canViewUsersDirect
        ? await this.authorizationService.getUserCompanyIds(requester)
        : [];

    const scopedCompanyIds = companyScope.isGlobal
      ? undefined
      : companyScope.companyIds.length > 0
        ? companyScope.companyIds
        : canViewCompaniesDirect
          ? fallbackCompanyIds
          : [];
    const scopedContactIds = contactScope.isGlobal
      ? undefined
      : contactScope.companyIds.length > 0
        ? contactScope.companyIds
        : canViewContactsDirect
          ? fallbackCompanyIds
          : [];
    const scopedUserIds = userScope.isGlobal
      ? undefined
      : userScope.companyIds.length > 0
        ? userScope.companyIds
        : canViewUsersDirect
          ? fallbackCompanyIds
          : [];

    const companyBaseWhere = this.buildScopedCompaniesWhere(scopedCompanyIds);
    const userBaseWhere = this.buildScopedUsersWhere(scopedUserIds);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      companiesCount,
      companiesThisMonth,
      inactivatedCompaniesThisMonth,
      usersCount,
      usersThisMonth,
      inactivatedUsersThisMonth,
      contactsCount,
      contactsThisMonth,
      inactivatedContactsThisMonth,
      recentCompanies,
      recentInactivatedCompanies,
      recentContacts,
      recentInactivatedContacts,
      recentUsers,
      recentInactivatedUsers,
    ] = await Promise.all([
      canViewCompaniesDirect ? this.prisma.company.count({ where: { ...companyBaseWhere, status: 'ACTIVE' } }) : Promise.resolve(0),
      canViewCompaniesDirect ? this.prisma.company.count({ where: { ...companyBaseWhere, createdAt: { gte: monthStart } } }) : Promise.resolve(0),
      canViewCompaniesDirect ? this.prisma.company.count({ where: { ...companyBaseWhere, status: { in: ['INACTIVE', 'SUSPENDED'] }, updatedAt: { gte: monthStart } } }) : Promise.resolve(0),
      canViewUsersModule ? this.prisma.user.count({ where: userBaseWhere }) : Promise.resolve(0),
      canViewUsersModule ? this.prisma.user.count({ where: { ...userBaseWhere, createdAt: { gte: monthStart } } }) : Promise.resolve(0),
      canViewUsersModule ? this.prisma.user.count({ where: { ...userBaseWhere, isActive: false, updatedAt: { gte: monthStart } } }) : Promise.resolve(0),
      canViewContactsModule ? (this.prisma as any).companyContactCompanyLink.count({ where: scopedContactIds ? { companyId: { in: scopedContactIds } } : undefined }) : Promise.resolve(0),
      canViewContactsModule ? (this.prisma as any).companyContact.count({ where: scopedContactIds ? { companyLinks: { some: { companyId: { in: scopedContactIds } } }, createdAt: { gte: monthStart } } : { createdAt: { gte: monthStart } } }) : Promise.resolve(0),
      canViewContactsModule ? (this.prisma as any).companyContact.count({ where: scopedContactIds ? { status: 'ARCHIVED', companyLinks: { some: { companyId: { in: scopedContactIds } } }, updatedAt: { gte: monthStart } } : { status: 'ARCHIVED', updatedAt: { gte: monthStart } } }) : Promise.resolve(0),
      canViewCompaniesDirect ? this.prisma.company.findMany({ where: companyBaseWhere, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, razaoSocial: true, nomeFantasia: true, cnpj: true, status: true, createdAt: true, _count: { select: { memberships: true } }, contactLinks: { select: { id: true } }, addresses: { take: 1, select: { cidade: true, estado: true } } } }) : Promise.resolve([]),
      canViewCompaniesDirect ? this.prisma.company.findMany({ where: { ...companyBaseWhere, status: { in: ['INACTIVE', 'SUSPENDED'] } }, orderBy: { updatedAt: 'desc' }, take: 5, select: { id: true, razaoSocial: true, nomeFantasia: true, cnpj: true, status: true, createdAt: true, _count: { select: { memberships: true } }, contactLinks: { select: { id: true } }, addresses: { take: 1, select: { cidade: true, estado: true } } } }) : Promise.resolve([]),
      canViewContactsModule ? (this.prisma as any).companyContact.findMany({ where: scopedContactIds ? { status: { not: 'ARCHIVED' }, companyLinks: { some: { companyId: { in: scopedContactIds } } } } : { status: { not: 'ARCHIVED' } }, orderBy: [{ createdAt: 'desc' }], take: 5, select: { id: true, name: true, email: true, whatsapp: true, createdAt: true, companyLinks: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], select: { company: { select: { nomeFantasia: true, razaoSocial: true } } } } } }) : Promise.resolve([]),
      canViewContactsModule ? (this.prisma as any).companyContact.findMany({ where: scopedContactIds ? { status: 'ARCHIVED', companyLinks: { some: { companyId: { in: scopedContactIds } } } } : { status: 'ARCHIVED' }, orderBy: [{ updatedAt: 'desc' }], take: 5, select: { id: true, name: true, email: true, whatsapp: true, createdAt: true, companyLinks: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], select: { company: { select: { nomeFantasia: true, razaoSocial: true } } } } } }) : Promise.resolve([]),
      canViewUsersModule ? this.prisma.user.findMany({ where: userBaseWhere, orderBy: [{ createdAt: 'desc' }], take: 5, select: { id: true, name: true, email: true, role: true, createdAt: true, memberships: { orderBy: [{ createdAt: 'asc' }], select: { company: { select: { nomeFantasia: true, razaoSocial: true } } } } } }) : Promise.resolve([]),
      canViewUsersModule ? this.prisma.user.findMany({ where: { ...userBaseWhere, isActive: false }, orderBy: [{ updatedAt: 'desc' }], take: 5, select: { id: true, name: true, email: true, role: true, createdAt: true, memberships: { orderBy: [{ createdAt: 'asc' }], select: { company: { select: { nomeFantasia: true, razaoSocial: true } } } } } }) : Promise.resolve([]),
    ]);

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
      name: contact.name?.trim() || contact.email?.trim() || contact.whatsapp?.trim() || 'Contato sem nome',
      email: contact.email ?? null,
      whatsapp: contact.whatsapp ?? null,
      createdAt: contact.createdAt.toISOString(),
      companyNames: Array.from(new Set((contact.companyLinks ?? []).map((l: any) => l.company?.nomeFantasia || l.company?.razaoSocial).filter(Boolean) as string[])),
    });

    const mapUser = (user: any) => ({
      id: user.id,
      name: user.name?.trim() || user.email,
      email: user.email,
      role: String(user.role),
      createdAt: user.createdAt.toISOString(),
      companyNames: Array.from(new Set((user.memberships ?? []).map((m: any) => m.company?.nomeFantasia || m.company?.razaoSocial).filter(Boolean) as string[])),
    });

    return {
      success: true as const,
      data: {
        canViewCompanies: canViewCompaniesDirect,
        canViewContacts: canViewContactsModule,
        canViewUsers: canViewUsersModule || userScope.isGlobal,
        companies: recentCompanies.map(mapCompany),
        recentContacts: recentContacts.map(mapContact),
        recentUsers: recentUsers.map(mapUser),
        companiesCount,
        contactsCount,
        usersCount,
        cadastros: {
          companies: { total: companiesCount, registeredThisMonth: companiesThisMonth, inactivatedThisMonth: inactivatedCompaniesThisMonth },
          contacts: { total: contactsCount, registeredThisMonth: contactsThisMonth, inactivatedThisMonth: inactivatedContactsThisMonth },
          users: { total: usersCount, registeredThisMonth: usersThisMonth, inactivatedThisMonth: inactivatedUsersThisMonth },
          recentInactivatedCompanies: recentInactivatedCompanies.map(mapCompany),
          recentInactivatedContacts: recentInactivatedContacts.map(mapContact),
          recentInactivatedUsers: recentInactivatedUsers.map(mapUser),
        },
      },
    };
  }

  async getComercialData(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.assertPermission(rawHeaders, 'dashboard:view');

    const canViewCrm =
      (await this.authorizationService.userHasPermission(requester, 'crm:view', { acceptCompanyScope: true })) ||
      (await this.authorizationService.userHasPermission(requester, 'crm:manage', { acceptCompanyScope: true }));

    if (!canViewCrm) {
      return { success: true as const, data: { crm: undefined, contracts: undefined } };
    }

    const companyScope = await this.authorizationService.resolveCompanyAccessScope(
      requester,
      'companies:view_own',
      'companies:view_all',
    );
    const contractsBaseWhere = this.buildScopedContractsWhere(
      companyScope.isGlobal ? undefined : companyScope.companyIds,
    );

    const [crmLeads, activeContracts] = await Promise.all([
      (this.prisma as any).crmLead.findMany({ select: { stage: true, estimatedValue: true, expectedCloseAt: true, nextStep: true } }).catch(() => []),
      this.prisma.contract.findMany({
        where: { status: 'ACTIVE', ...contractsBaseWhere },
        select: { totalValue: true, minimumWage: true, percentage: true, taxRate: true, programmerRate: true },
      }).catch(() => []),
    ]);

    return {
      success: true as const,
      data: {
        crm: buildCrmSummary(crmLeads),
        contracts: {
          ...summarizeActiveContracts(activeContracts),
        },
      },
    };
  }

  async getSefazStatus(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.assertPermission(rawHeaders, 'dashboard:view');
    const dashboardUFs = await this.getUserDashboardUFs(requester.userId);
    const configuredSefazRoutes = await this.getConfiguredSefazRoutes();

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [sefazRecords, nationalSefazRecords, historyRecords] = await Promise.all([
      this.prisma.sefazStatusCurrent
        .findMany({ where: { uf: { in: dashboardUFs } }, orderBy: { checkedAt: 'desc' } })
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
    await this.authorizationService.assertPermission(rawHeaders, 'dashboard:view');

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const tasks = await this.prisma.task.findMany({
      where: { year, month, status: { not: 'CANCELED' } },
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        completedAt: true,
        receivedAt: true,
        company: { select: { nomeFantasia: true, razaoSocial: true } },
        assignedTo: { select: { name: true } },
      },
    });

    let total = 0;
    let pending = 0;
    let waitingCustomer = 0;
    let received = 0;
    let sentToAccounting = 0;
    let completed = 0;
    let overdue = 0;
    let canceled = 0;

    const overdueRaw: Array<{ id: string; title: string; companyName: string; dueDate: Date; assignedToName: string | null }> = [];
    const completedDates: Date[] = [];
    const receivedDates: Date[] = [];

    for (const task of tasks) {
      total++;
      switch (task.status) {
        case 'PENDING': pending++; break;
        case 'WAITING_CUSTOMER': waitingCustomer++; break;
        case 'RECEIVED': received++; break;
        case 'SENT_TO_ACCOUNTING': sentToAccounting++; break;
        case 'COMPLETED': completed++; break;
        case 'OVERDUE': overdue++; break;
        case 'CANCELED': canceled++; break;
      }

      if (task.status === 'OVERDUE') {
        overdueRaw.push({
          id: task.id,
          title: task.title,
          companyName: task.company.nomeFantasia ?? task.company.razaoSocial,
          dueDate: task.dueDate,
          assignedToName: task.assignedTo?.name ?? null,
        });
      }

      if (task.completedAt) completedDates.push(task.completedAt);
      if (task.receivedAt) receivedDates.push(task.receivedAt);
    }

    const activityEvents = [...completedDates, ...receivedDates];
    const activity = toSeries(activityEvents);

    const overdueItems: DashboardTarefasOverdueItem[] = overdueRaw
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        title: item.title,
        companyName: item.companyName,
        dueDate: item.dueDate.toISOString(),
        assignedToName: item.assignedToName,
        daysOverdue: Math.max(0, Math.floor((now.getTime() - item.dueDate.getTime()) / 86_400_000)),
      }));

    return {
      success: true as const,
      data: { year, month, summary: { total, pending, waitingCustomer, received, sentToAccounting, completed, overdue, canceled }, activity, overdueItems },
    };
  }
}
