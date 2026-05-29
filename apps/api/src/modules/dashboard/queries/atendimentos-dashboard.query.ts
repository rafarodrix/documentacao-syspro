import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { ChatwootClient } from '../../integrations/chatwoot/chatwoot.client';
import { IntegrationContextService, type ResolvedIntegrationContext } from '../../settings/integration-context.service';
import {
  extractChatwootAssignee,
  extractChatwootChannel,
  extractChatwootContactSummary,
  extractChatwootConversationCustomAttributes,
  extractChatwootConversationLabels,
  parseChatwootDate,
  parseDateInput,
  resolveChatwootClosureOrigin,
  shouldSkipChatwootCsat,
  startOfDay,
} from '../dashboard.shared';

type AtendimentosFilters = {
  from?: string;
  to?: string;
  assigneeId?: string;
  contact?: string;
  refresh?: boolean;
};

type ChatwootConversationRecord = {
  id: string;
  connectionKey: string;
  context: ResolvedIntegrationContext;
  raw: any;
  createdAt: Date;
  updatedAt: Date | null;
  channel: 'WHATSAPP' | 'EMAIL' | 'PORTAL' | 'PHONE';
  assigneeId: string | null;
  assigneeName: string;
  contactKey: string;
  contactName: string;
  contactText: string;
  labels: string[];
  customAttributes: Record<string, unknown>;
  closureOrigin: string | null;
  skipCsat: boolean;
  statusLabel: 'Novo' | 'Sem responsavel' | 'Triagem' | 'Em andamento' | 'Aguardando cliente' | 'Aguardando interno' | 'Teste' | 'Resolvido' | 'Arquivado';
};

type AssigneeMeta = {
  id: string;
  name: string;
  portalUserId: string | null;
};

type ConversationLinkRecord = {
  companyId: string | null;
  chatwootConversationId: string;
  connectionKey: string;
  company: {
    id: string;
    razaoSocial: string;
    nomeFantasia: string | null;
  } | null;
};

type CompanySummary = {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
};

type ContactSummary = {
  id: string;
  name: string;
  companyLinks: Array<{ company: CompanySummary }>;
};

@Injectable()
export class AtendimentosDashboardQuery {
  private static readonly CACHE_TTL_MS = 45_000;
  private static readonly PAGE_LIMIT = 30;
  private readonly cache = new Map<string, { expiresAt: number; payload: any }>();
  private readonly logger = new Logger(AtendimentosDashboardQuery.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly integrationContextService: IntegrationContextService,
    private readonly chatwootClient: ChatwootClient,
  ) {}

  async execute(rawHeaders?: IncomingHttpHeaders, filters?: AtendimentosFilters) {
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
    const cached = this.cache.get(cacheKey);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return cached.payload;
    }

    const accessScope = await this.authorizationService.resolveCompanyAccessScope(
      requester,
      'tickets:view_own',
      'tickets:view_all',
    );

    const contexts = await this.resolveVisibleContexts(accessScope);
    if (contexts.length === 0) {
      return this.buildEmptyPayload(periodStart, periodEnd, assigneeId, contactQuery);
    }

    const [agentsByContext, conversations] = await Promise.all([
      this.loadAgentsByContext(contexts),
      this.loadConversations(contexts, periodStart, periodEnd),
    ]);

    const filteredConversations = conversations.filter((conversation) => {
      if (assigneeId && conversation.assigneeId !== assigneeId) return false;
      if (!contactQuery) return true;
      const companyText = String(conversation.customAttributes.company_name ?? conversation.customAttributes.company_id ?? '').trim().toLowerCase();
      const labelText = conversation.labels.join(' ').toLowerCase();
      return (
        conversation.contactText.includes(contactQuery) ||
        companyText.includes(contactQuery) ||
        labelText.includes(contactQuery)
      );
    });

    const conversationIds = filteredConversations.map((item) => item.id);
    const conversationLinks = conversationIds.length > 0
      ? await this.prisma.conversationLink.findMany({
          where: {
            chatwootConversationId: { in: conversationIds },
            connectionKey: { in: Array.from(new Set(filteredConversations.map((item) => item.connectionKey))) },
          },
          include: {
            company: {
              select: {
                id: true,
                razaoSocial: true,
                nomeFantasia: true,
              },
            },
          },
        })
      : [];
    const linkedTickets = conversationIds.length > 0
      ? await this.prisma.ticket.findMany({
          where: {
            externalThreadId: { in: conversationIds },
          },
          include: {
            company: {
              select: {
                id: true,
                razaoSocial: true,
                nomeFantasia: true,
              },
            },
            companyContact: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      : [];

    const sysproCompanyIds = Array.from(
      new Set(
        filteredConversations
          .map((item) => String(
            item.customAttributes.syspro_primary_company_id ??
            item.customAttributes.syspro_company_id ??
            item.customAttributes.company_id ??
            '',
          ).trim())
          .filter(Boolean),
      ),
    );
    const sysproContactIds = Array.from(
      new Set(
        filteredConversations
          .map((item) => String(item.customAttributes.syspro_contact_id ?? '').trim())
          .filter(Boolean),
      ),
    );

    const [sysproCompanies, sysproContacts] = await Promise.all([
      sysproCompanyIds.length > 0
        ? this.prisma.company.findMany({
            where: { id: { in: sysproCompanyIds } },
            select: {
              id: true,
              razaoSocial: true,
              nomeFantasia: true,
            },
          })
        : Promise.resolve([]),
      sysproContactIds.length > 0
        ? this.prisma.companyContact.findMany({
            where: { id: { in: sysproContactIds } },
            select: {
              id: true,
              name: true,
              companyLinks: {
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                select: {
                  company: {
                    select: {
                      id: true,
                      razaoSocial: true,
                      nomeFantasia: true,
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const ticketByConversationId = new Map<string, (typeof linkedTickets)[number]>();
    for (const ticket of linkedTickets) {
      const key = String(ticket.externalThreadId ?? '').trim();
      if (!key) continue;
      const current = ticketByConversationId.get(key);
      if (!current || ticket.updatedAt > current.updatedAt) {
        ticketByConversationId.set(key, ticket);
      }
    }

    const conversationLinkByKey = new Map<string, ConversationLinkRecord>();
    for (const link of conversationLinks as ConversationLinkRecord[]) {
      conversationLinkByKey.set(`${link.connectionKey}:${link.chatwootConversationId}`, link);
    }

    const companyById = new Map(sysproCompanies.map((company) => [company.id, company] as const));
    const contactById = new Map(sysproContacts.map((contact) => [contact.id, contact] as const));

    const csatRatings = conversationIds.length > 0
      ? await this.prisma.chatwootCsatRating.findMany({
          where: {
            chatwootConversationId: { in: conversationIds },
          },
          select: {
            chatwootConversationId: true,
            agentId: true,
            agentName: true,
            score: true,
            status: true,
          },
        }).catch(() => [])
      : [];

    const csatDistributionMap = new Map<number, number>([1, 2, 3, 4, 5].map((score) => [score, 0]));
    const csatAgentMap = new Map<string, { agentId: string | null; agentName: string; totalScore: number; responseCount: number; lowScoreCount: number }>();

    for (const rating of csatRatings) {
      const score = Math.max(1, Math.min(5, Number(rating.score ?? 0) || 0));
      csatDistributionMap.set(score, (csatDistributionMap.get(score) || 0) + 1);

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

    const statusOrder = ['Novo', 'Sem responsavel', 'Triagem', 'Em andamento', 'Aguardando cliente', 'Aguardando interno', 'Teste', 'Resolvido', 'Arquivado'] as const;
    const statusCountsMap = new Map<string, number>(statusOrder.map((status) => [status, 0]));
    const channelOrder = ['WHATSAPP', 'EMAIL', 'PORTAL', 'PHONE'] as const;
    const channelCountsMap = new Map<string, number>(channelOrder.map((channel) => [channel, 0]));
    const assigneeOptionsMap = new Map<string, string>();
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
    const companyRecurrenceMap = new Map<string, {
      key: string;
      name: string;
      count: number;
      channel: 'WHATSAPP' | 'EMAIL' | 'PORTAL' | 'PHONE';
      lastAttendance: Date | null;
    }>();
    const contactRecurrenceMap = new Map<string, {
      key: string;
      name: string;
      count: number;
      channel: 'WHATSAPP' | 'EMAIL' | 'PORTAL' | 'PHONE';
      lastAttendance: Date | null;
    }>();
    const categoryMap = new Map<string, number>();
    const tagMap = new Map<string, number>();

    let resolvedCount = 0;
    let openCount = 0;
    let unassignedCount = 0;
    let cancelledCount = 0;
    let cancelledByCustomerCount = 0;
    let cancelledByAgentCount = 0;
    let spamCount = 0;
    let unlinkedCount = 0;
    let csatSkippedCount = 0;
    let csatEligibleResolvedCount = 0;
    let delayedOpenCount = 0;

    const backlog = {
      today: 0,
      over1d: 0,
      over3d: 0,
      over7d: 0,
    };

    for (const conversation of filteredConversations) {
      const linkedTicket = ticketByConversationId.get(conversation.id);
      const conversationLink = conversationLinkByKey.get(`${conversation.connectionKey}:${conversation.id}`) ?? null;
      const sysproCompanyId = String(
        conversation.customAttributes.syspro_primary_company_id ??
        conversation.customAttributes.syspro_company_id ??
        conversation.customAttributes.company_id ??
        '',
      ).trim();
      const sysproContactId = String(conversation.customAttributes.syspro_contact_id ?? '').trim();
      const sysproCompany = sysproCompanyId ? companyById.get(sysproCompanyId) ?? null : null;
      const sysproContact = sysproContactId ? contactById.get(sysproContactId) ?? null : null;
      const sysproContactCompany = sysproContact?.companyLinks?.[0]?.company ?? null;
      const displayParts = this.splitDisplayName(conversation.contactName);
      const companyName = this.resolveCompanyName({
        linkedTicket,
        conversationLink,
        sysproCompany,
        sysproContact,
        customAttributes: conversation.customAttributes,
        displayCompanyName: displayParts.companyName,
      });
      const companyKey = linkedTicket?.companyId ||
        conversationLink?.companyId ||
        sysproCompany?.id ||
        sysproContactCompany?.id ||
        companyName ||
        `conversation:${conversation.id}`;
      const contactKey = linkedTicket?.companyContactId || sysproContact?.id || conversation.contactKey || `conversation:${conversation.id}`;
      const contactName = this.resolveContactName({
        linkedTicket,
        sysproContact,
        customAttributes: conversation.customAttributes,
        fallbackConversationName: conversation.contactName,
        displayContactName: displayParts.contactName,
      });
      const categoryName = this.resolveCategoryName(conversation, linkedTicket?.metadata);

      statusCountsMap.set(conversation.statusLabel, (statusCountsMap.get(conversation.statusLabel) || 0) + 1);
      channelCountsMap.set(conversation.channel, (channelCountsMap.get(conversation.channel) || 0) + 1);

      const companyItem = companyRecurrenceMap.get(companyKey) || {
        key: companyKey,
        name: companyName,
        count: 0,
        channel: conversation.channel,
        lastAttendance: null,
      };
      companyItem.count += 1;
      companyItem.channel = conversation.channel;
      if (!companyItem.lastAttendance || conversation.createdAt > companyItem.lastAttendance) {
        companyItem.lastAttendance = conversation.createdAt;
      }
      companyRecurrenceMap.set(companyKey, companyItem);

      const contactItem = contactRecurrenceMap.get(contactKey) || {
        key: contactKey,
        name: contactName,
        count: 0,
        channel: conversation.channel,
        lastAttendance: null,
      };
      contactItem.count += 1;
      contactItem.channel = conversation.channel;
      if (!contactItem.lastAttendance || conversation.createdAt > contactItem.lastAttendance) {
        contactItem.lastAttendance = conversation.createdAt;
      }
      contactRecurrenceMap.set(contactKey, contactItem);

      if (conversation.assigneeId) {
        assigneeOptionsMap.set(conversation.assigneeId, conversation.assigneeName);
        const current = assigneeLoadMap.get(conversation.assigneeId) || {
          userId: conversation.assigneeId,
          name: conversation.assigneeName,
          openCount: 0,
          waitingCount: 0,
          resolvedCount: 0,
          firstResponseSum: 0,
          firstResponseCount: 0,
          resolutionSum: 0,
          resolutionCount: 0,
        };
        if (conversation.statusLabel !== 'Resolvido' && conversation.statusLabel !== 'Arquivado') current.openCount += 1;
        if (conversation.statusLabel === 'Aguardando cliente' || conversation.statusLabel === 'Aguardando interno') {
          current.waitingCount += 1;
        }
        if (conversation.statusLabel === 'Resolvido') current.resolvedCount += 1;
        if (linkedTicket?.createdAt instanceof Date && linkedTicket?.slaResponseHitAt instanceof Date) {
          current.firstResponseSum += (linkedTicket.slaResponseHitAt.getTime() - linkedTicket.createdAt.getTime()) / 60000;
          current.firstResponseCount += 1;
        }
        if (linkedTicket?.status === 'RESOLVED' && linkedTicket?.createdAt instanceof Date && linkedTicket.closedAt instanceof Date) {
          current.resolutionSum += (linkedTicket.closedAt.getTime() - linkedTicket.createdAt.getTime()) / 3600000;
          current.resolutionCount += 1;
        }
        assigneeLoadMap.set(conversation.assigneeId, current);
      } else {
        unassignedCount += 1;
      }

      if (conversation.statusLabel === 'Resolvido' || conversation.statusLabel === 'Arquivado') resolvedCount += 1;
      else openCount += 1;

      if (!linkedTicket?.companyId && !conversationLink?.companyId && !sysproCompany?.id && !sysproContactCompany?.id) {
        unlinkedCount += 1;
      }

      if (conversation.skipCsat) {
        csatSkippedCount += 1;
      }

      if (conversation.statusLabel === 'Resolvido' && !conversation.skipCsat && !conversation.closureOrigin) {
        csatEligibleResolvedCount += 1;
      }

      if (conversation.closureOrigin) {
        cancelledCount += 1;
        if (conversation.closureOrigin === 'cancelled_by_customer') cancelledByCustomerCount += 1;
        if (conversation.closureOrigin === 'cancelled_by_agent') cancelledByAgentCount += 1;
        if (conversation.closureOrigin === 'spam') spamCount += 1;
      }

      if (categoryName) {
        categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1);
      }

      for (const label of conversation.labels) {
        tagMap.set(label, (tagMap.get(label) || 0) + 1);
      }

      if (conversation.statusLabel !== 'Resolvido' && conversation.statusLabel !== 'Arquivado') {
        const ageDays = Math.floor((Date.now() - conversation.createdAt.getTime()) / 86400000);
        if (ageDays <= 0) backlog.today += 1;
        if (ageDays >= 1) backlog.over1d += 1;
        if (ageDays >= 3) backlog.over3d += 1;
        if (ageDays >= 7) backlog.over7d += 1;
        if (ageDays >= 3) delayedOpenCount += 1;
      }
    }

    for (const agents of agentsByContext.values()) {
      for (const agent of agents.values()) {
        assigneeOptionsMap.set(agent.id, agent.name);
      }
    }

    const avgFirstResponseMinutes = (() => {
      const valid = linkedTickets
        .map((ticket) => {
          if (!(ticket.createdAt instanceof Date) || !(ticket.slaResponseHitAt instanceof Date)) return null;
          return (ticket.slaResponseHitAt.getTime() - ticket.createdAt.getTime()) / 60000;
        })
        .filter((value): value is number => value !== null && value >= 0);
      if (!valid.length) return null;
      return Math.round(valid.reduce((sum, item) => sum + item, 0) / valid.length);
    })();

    const avgResolutionHours = (() => {
      const valid = linkedTickets
        .map((ticket) => {
          if (ticket.status !== 'RESOLVED' || !(ticket.createdAt instanceof Date) || !(ticket.closedAt instanceof Date)) return null;
          return (ticket.closedAt.getTime() - ticket.createdAt.getTime()) / 3600000;
        })
        .filter((value): value is number => value !== null && value >= 0);
      if (!valid.length) return null;
      return Math.round((valid.reduce((sum, item) => sum + item, 0) / valid.length) * 10) / 10;
    })();

    const slaFirstResponsePct = (() => {
      const eligible = linkedTickets.filter(
        (ticket) =>
          (ticket.status !== 'RESOLVED' && ticket.status !== 'ARCHIVED') ||
          ticket.slaResponseHitAt instanceof Date,
      );
      if (!eligible.length) return null;
      const hits = eligible.filter((ticket) => ticket.slaResponseHitAt instanceof Date).length;
      return Math.round((hits / eligible.length) * 100);
    })();

    const slaResolutionPct = (() => {
      const eligible = linkedTickets.filter((ticket) => ticket.status === 'RESOLVED' || ticket.status === 'ARCHIVED');
      if (!eligible.length) return null;
      const hits = eligible.filter((ticket) => ticket.closedAt instanceof Date).length;
      return Math.round((hits / eligible.length) * 100);
    })();

    const mapRecurrenceItems = (
      items: Array<{ key: string; name: string; count: number; channel: 'WHATSAPP' | 'EMAIL' | 'PORTAL' | 'PHONE'; lastAttendance: Date | null }>,
    ) =>
      items.map((item) => ({
        key: item.key,
        name: item.name,
        count: item.count,
        channel: item.channel,
        motive: null,
        lastAttendance: this.formatRelativeDay(item.lastAttendance),
      }));

    const topCompaniesMapped = mapRecurrenceItems(
      Array.from(companyRecurrenceMap.values()).sort((left, right) => right.count - left.count).slice(0, 10),
    );
    const topContactsMapped = mapRecurrenceItems(
      Array.from(contactRecurrenceMap.values()).sort((left, right) => right.count - left.count).slice(0, 10),
    );

    const unassignedConversations = filteredConversations
      .filter((conversation) => !conversation.assigneeId && conversation.statusLabel !== 'Resolvido' && conversation.statusLabel !== 'Arquivado')
      .map((conversation) => {
        const linkedTicket = ticketByConversationId.get(conversation.id);
        const sysproContactId = String(conversation.customAttributes.syspro_contact_id ?? '').trim();
        const sysproContact = sysproContactId ? contactById.get(sysproContactId) ?? null : null;
        const displayParts = this.splitDisplayName(conversation.contactName);
        return {
          id: linkedTicket?.id || conversation.id,
          reference: linkedTicket?.ticketNumber || `CW-${conversation.id}`,
          subject: this.resolveConversationSubject(conversation.raw, linkedTicket?.subject),
          contactName: this.resolveContactName({
            linkedTicket,
            sysproContact,
            customAttributes: conversation.customAttributes,
            fallbackConversationName: conversation.contactName,
            displayContactName: displayParts.contactName,
          }),
          channel: conversation.channel,
          status: conversation.statusLabel,
          lastUpdate: (conversation.updatedAt ?? conversation.createdAt).toISOString(),
          detailHref: linkedTicket?.id ? `/portal/tickets/${linkedTicket.id}` : '/portal/atendimento',
        };
      });

    const assigneeLoadsMapped = Array.from(assigneeLoadMap.values())
      .map((item) => {
        const csatData = csatAgentMap.get(item.userId ?? '') || csatAgentMap.get(`__agent__${item.name}`) || null;
        const averageScore = csatData && csatData.responseCount > 0
          ? Math.round((csatData.totalScore / csatData.responseCount) * 100) / 100
          : null;
        return {
          userId: item.userId,
          name: item.name,
          openCount: item.openCount,
          waitingCount: item.waitingCount,
          resolvedCount: item.resolvedCount,
          avgFirstResponseMinutes: item.firstResponseCount > 0 ? Math.round((item.firstResponseSum / item.firstResponseCount) * 10) / 10 : null,
          avgResolutionHours: item.resolutionCount > 0 ? Math.round((item.resolutionSum / item.resolutionCount) * 10) / 10 : null,
          averageScore,
          responseCount: csatData?.responseCount ?? 0,
        };
      })
      .sort((left, right) => right.openCount - left.openCount || right.resolvedCount - left.resolvedCount)
      .slice(0, 8);

    const payload = {
      success: true as const,
      data: {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        refreshedAt: new Date().toISOString(),
        cacheTtlSeconds: Math.floor(AtendimentosDashboardQuery.CACHE_TTL_MS / 1000),
        appliedAssigneeId: assigneeId || undefined,
        appliedContactQuery: contactQuery || undefined,
        totalCount: filteredConversations.length,
        openCount,
        unassignedCount,
        resolvedCount,
        cancelledCount,
        cancelledByCustomerCount,
        cancelledByAgentCount,
        spamCount,
        unlinkedCount,
        csatSkippedCount,
        csatEligibleResolvedCount,
        csatResponseCount: csatRatings.length,
        csatLowScoreCount: csatRatings.filter((rating) => Number(rating.score) <= 2 || String(rating.status).toUpperCase() === 'LOW_SCORE').length,
        csatAverageScore: csatRatings.length > 0
          ? Math.round((csatRatings.reduce((sum, rating) => sum + Number(rating.score ?? 0), 0) / csatRatings.length) * 100) / 100
          : null,
        avgFirstResponseMinutes,
        avgResolutionHours,
        activity: this.toSeries(filteredConversations.map((item) => item.createdAt)),
        statusCounts: statusOrder.map((status) => ({ status, count: statusCountsMap.get(status) || 0 })),
        channelCounts: channelOrder.map((channel) => ({ channel, count: channelCountsMap.get(channel) || 0 })),
        assigneeLoads: assigneeLoadsMapped,
        assigneeOptions: Array.from(assigneeOptionsMap.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((left, right) => left.name.localeCompare(right.name)),
        topContacts: topContactsMapped,
        topCompanies: topCompaniesMapped,
        unassignedConversations,
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
        warning: undefined,
        slaFirstResponsePct,
        slaResolutionPct,
        delayedOpenCount,
        backlog,
        categories: Array.from(categoryMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((left, right) => right.count - left.count)
          .slice(0, 10),
        topTags: Array.from(tagMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((left, right) => right.count - left.count)
          .slice(0, 10),
      },
    };

    this.cache.set(cacheKey, {
      expiresAt: Date.now() + AtendimentosDashboardQuery.CACHE_TTL_MS,
      payload,
    });
    return payload;
  }

  private async resolveVisibleContexts(accessScope: { isGlobal: boolean; companyIds: string[] }) {
    const contexts = await this.integrationContextService.listActiveContexts();
    if (accessScope.isGlobal) return contexts;
    return contexts.filter((context) => context.companyId && accessScope.companyIds.includes(context.companyId));
  }

  private async loadAgentsByContext(contexts: ResolvedIntegrationContext[]) {
    const entries = await Promise.all(
      contexts.map(async (context) => {
        try {
          const agents = await this.chatwootClient.listAgents(context.chatwoot);
          const mapped = new Map<string, AssigneeMeta>();
          for (const agent of agents) {
            const id = String(agent?.id ?? '').trim();
            if (!id) continue;
            const name = String(agent?.name ?? agent?.available_name ?? agent?.email ?? id).trim() || id;
            const portalUserId = String(agent?.custom_attributes?.portal_user_id ?? '').trim() || null;
            mapped.set(id, { id, name, portalUserId });
          }
          return [context.connectionKey, mapped] as const;
        } catch (error: any) {
          this.logger.warn(
            `[atendimentos_dashboard] falha ao listar agentes do Chatwoot (${context.connectionKey}): ${error?.message ?? 'unknown_error'}`,
          );
          return [context.connectionKey, new Map<string, AssigneeMeta>()] as const;
        }
      }),
    );
    return new Map(entries);
  }

  private async loadConversations(
    contexts: ResolvedIntegrationContext[],
    periodStart: Date,
    periodEnd: Date,
  ): Promise<ChatwootConversationRecord[]> {
    const batches = await Promise.all(
      contexts.map((context) => this.loadContextConversations(context, periodStart, periodEnd)),
    );
    return batches.flat();
  }

  private async loadContextConversations(
    context: ResolvedIntegrationContext,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<ChatwootConversationRecord[]> {
    const items: ChatwootConversationRecord[] = [];
    const resolvedInboxId = await this.chatwootClient.resolveInboxId(context.chatwoot);
    const resolvedInboxIdentifier = await this.chatwootClient.resolveInboxIdentifier(context.chatwoot);

    for (let page = 1; page <= AtendimentosDashboardQuery.PAGE_LIMIT; page++) {
      const conversations = await this.chatwootClient.listConversations(context.chatwoot, { page, status: 'all' });
      if (!conversations.length) break;

      let pageHasInRangeConversation = false;

      for (const rawConversation of conversations) {
        if (!this.matchesContextInbox(rawConversation, resolvedInboxId, resolvedInboxIdentifier)) {
          continue;
        }

        const createdAt = parseChatwootDate(
          rawConversation?.created_at ??
          rawConversation?.meta?.created_at ??
          rawConversation?.timestamp,
        );
        if (!createdAt) continue;
        if (createdAt > periodEnd) continue;
        if (createdAt >= periodStart) pageHasInRangeConversation = true;
        if (createdAt < periodStart) continue;

        const normalized = this.normalizeConversation(rawConversation, context, createdAt);
        if (normalized) items.push(normalized);
      }

      if (!pageHasInRangeConversation) {
        const oldest = conversations
          .map((item) => parseChatwootDate(item?.created_at ?? item?.meta?.created_at ?? item?.timestamp))
          .filter((item): item is Date => item instanceof Date)
          .sort((left, right) => left.getTime() - right.getTime())[0];
        if (oldest && oldest < periodStart) break;
      }
    }

    return items;
  }

  private matchesContextInbox(conversation: any, inboxId?: string, inboxIdentifier?: string) {
    const candidateInboxId = String(
      conversation?.inbox_id ??
      conversation?.inbox?.id ??
      conversation?.meta?.inbox?.id ??
      '',
    ).trim();
    const candidateInboxIdentifier = String(
      conversation?.inbox?.identifier ??
      conversation?.meta?.inbox?.identifier ??
      '',
    ).trim();

    if (inboxId && candidateInboxId) return inboxId === candidateInboxId;
    if (inboxIdentifier && candidateInboxIdentifier) return inboxIdentifier === candidateInboxIdentifier;
    if (inboxId && candidateInboxIdentifier) return inboxId === candidateInboxIdentifier;
    return true;
  }

  private normalizeConversation(rawConversation: any, context: ResolvedIntegrationContext, createdAt: Date): ChatwootConversationRecord | null {
    const id = String(rawConversation?.id ?? rawConversation?.display_id ?? '').trim();
    if (!id) return null;

    const updatedAt = parseChatwootDate(
      rawConversation?.updated_at ??
      rawConversation?.last_activity_at ??
      rawConversation?.meta?.updated_at,
    );
    const customAttributes = extractChatwootConversationCustomAttributes(rawConversation);
    const labels = extractChatwootConversationLabels(rawConversation);
    const assignee = extractChatwootAssignee(rawConversation);
    const contact = extractChatwootContactSummary(rawConversation);
    const channel = extractChatwootChannel(rawConversation);
    const closureOrigin = resolveChatwootClosureOrigin(rawConversation);
    const skipCsat = shouldSkipChatwootCsat(rawConversation);

    return {
      id,
      connectionKey: context.connectionKey,
      context,
      raw: rawConversation,
      createdAt,
      updatedAt,
      channel,
      assigneeId: assignee?.id ?? null,
      assigneeName: assignee?.name ?? 'Sem responsavel',
      contactKey: contact?.key || `conversation:${id}`,
      contactName: contact?.name || 'Contato nao identificado',
      contactText: [
        String(contact?.name ?? '').trim(),
        String(rawConversation?.meta?.sender?.phone_number ?? rawConversation?.contact?.phone_number ?? '').trim(),
        String(rawConversation?.meta?.sender?.identifier ?? rawConversation?.contact?.identifier ?? '').trim(),
        String(customAttributes.company_name ?? '').trim(),
      ].filter(Boolean).join(' ').toLowerCase(),
      labels,
      customAttributes,
      closureOrigin,
      skipCsat,
      statusLabel: this.resolveConversationStatusLabel(rawConversation, assignee?.id ?? null, closureOrigin),
    };
  }

  private resolveConversationStatusLabel(rawConversation: any, assigneeId: string | null, closureOrigin: string | null) {
    const rawStatus = String(
      rawConversation?.status ??
      rawConversation?.conversation_status ??
      rawConversation?.meta?.status ??
      '',
    ).trim().toLowerCase();

    if (closureOrigin) return 'Arquivado' as const;
    if (rawStatus === 'resolved') return 'Resolvido' as const;
    if (rawStatus === 'pending') return 'Aguardando cliente' as const;
    if (rawStatus === 'snoozed') return 'Aguardando interno' as const;
    if (!assigneeId) return 'Sem responsavel' as const;
    return 'Em andamento' as const;
  }

  private resolveCategoryName(conversation: ChatwootConversationRecord, metadata?: Prisma.JsonValue | null) {
    const metadataObject = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? metadata as Record<string, unknown>
      : null;
    const metadataCategory = String(metadataObject?.category ?? '').trim();
    if (metadataCategory) return metadataCategory;
    const customCategory = String(
      conversation.customAttributes.category ??
      conversation.customAttributes.ticket_category ??
      '',
    ).trim();
    if (customCategory) return customCategory;
    const labelCategory = conversation.labels.find((label) => label.startsWith('categoria:') || label.startsWith('category:'));
    return labelCategory ? labelCategory.split(':').slice(1).join(':').trim() : null;
  }

  private resolveConversationSubject(rawConversation: any, fallback?: string | null) {
    const subject = String(
      rawConversation?.meta?.sender?.name ??
      rawConversation?.contact?.name ??
      rawConversation?.last_non_activity_message?.content ??
      fallback ??
      '',
    ).trim();
    return subject || 'Sem assunto';
  }

  private resolveCompanyName(input: {
    linkedTicket?: { company?: { nomeFantasia: string | null; razaoSocial: string } | null } | null;
    conversationLink?: ConversationLinkRecord | null;
    sysproCompany?: CompanySummary | null;
    sysproContact?: ContactSummary | null;
    customAttributes: Record<string, unknown>;
    displayCompanyName: string | null;
  }) {
    const primaryContactCompany = input.sysproContact?.companyLinks?.[0]?.company ?? null;
    const customName = this.cleanDisplayName(String(
      input.customAttributes.syspro_primary_company_name ??
      input.customAttributes.syspro_company_name ??
      input.customAttributes.company_name ??
      '',
    ).trim());

    return (
      input.linkedTicket?.company?.nomeFantasia ||
      input.linkedTicket?.company?.razaoSocial ||
      input.conversationLink?.company?.nomeFantasia ||
      input.conversationLink?.company?.razaoSocial ||
      input.sysproCompany?.nomeFantasia ||
      input.sysproCompany?.razaoSocial ||
      primaryContactCompany?.nomeFantasia ||
      primaryContactCompany?.razaoSocial ||
      customName ||
      this.cleanDisplayName(input.displayCompanyName) ||
      'Empresa nao vinculada'
    );
  }

  private resolveContactName(input: {
    linkedTicket?: { companyContact?: { name: string | null } | null } | null;
    sysproContact?: ContactSummary | null;
    customAttributes: Record<string, unknown>;
    fallbackConversationName: string;
    displayContactName: string | null;
  }) {
    const customName = this.cleanDisplayName(String(input.customAttributes.syspro_contact_name ?? '').trim());
    return (
      input.linkedTicket?.companyContact?.name ||
      input.sysproContact?.name ||
      customName ||
      this.cleanDisplayName(input.displayContactName) ||
      this.cleanDisplayName(input.fallbackConversationName) ||
      'Contato nao identificado'
    );
  }

  private splitDisplayName(value: string) {
    const normalized = String(value ?? '').trim();
    if (!normalized) return { contactName: null, companyName: null };
    const delimiters = [' · ', ' - ', ' | '];
    for (const delimiter of delimiters) {
      const idx = normalized.indexOf(delimiter);
      if (idx <= 0) continue;
      const left = normalized.slice(0, idx).trim();
      const right = normalized.slice(idx + delimiter.length).trim();
      if (left && right) {
        return { contactName: left, companyName: right };
      }
    }
    return { contactName: normalized, companyName: null };
  }

  private cleanDisplayName(value: string | null | undefined) {
    const normalized = String(value ?? '').trim();
    if (!normalized) return null;

    const invalidValues = new Set([
      'empresa sem nome',
      'sem empresa',
      'empresa nao vinculada',
      'empresa não vinculada',
      'contato sem nome',
      'contato nao identificado',
      'contato não identificado',
      'unknown',
      'undefined',
      'null',
      '-',
      '--',
    ]);

    return invalidValues.has(normalized.toLowerCase()) ? null : normalized;
  }

  private toSeries(dates: Date[]) {
    const counts = new Map<string, number>();
    for (const date of dates) {
      const key = date.toLocaleDateString('en-US');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([key, count]) => ({ label: key, value: count }))
      .sort((left, right) => new Date(left.label).getTime() - new Date(right.label).getTime());
  }

  private formatRelativeDay(value: Date | null) {
    if (!(value instanceof Date)) return 'Sem registro';
    const diffMs = Date.now() - value.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays <= 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    return `Ha ${diffDays} dias`;
  }

  private buildEmptyPayload(periodStart: Date, periodEnd: Date, assigneeId: string, contactQuery: string) {
    const statusOrder = ['Novo', 'Sem responsavel', 'Triagem', 'Em andamento', 'Aguardando cliente', 'Aguardando interno', 'Teste', 'Resolvido', 'Arquivado'] as const;
    const channelOrder = ['WHATSAPP', 'EMAIL', 'PORTAL', 'PHONE'] as const;

    return {
      success: true as const,
      data: {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        refreshedAt: new Date().toISOString(),
        cacheTtlSeconds: Math.floor(AtendimentosDashboardQuery.CACHE_TTL_MS / 1000),
        appliedAssigneeId: assigneeId || undefined,
        appliedContactQuery: contactQuery || undefined,
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
        statusCounts: statusOrder.map((status) => ({ status, count: 0 })),
        channelCounts: channelOrder.map((channel) => ({ channel, count: 0 })),
        assigneeLoads: [],
        assigneeOptions: [],
        topContacts: [],
        topCompanies: [],
        unassignedConversations: [],
        csatScoreDistribution: [1, 2, 3, 4, 5].map((score) => ({ score, count: 0 })),
        csatAgentPerformance: [],
        warning: undefined,
        slaFirstResponsePct: null,
        slaResolutionPct: null,
        delayedOpenCount: 0,
        backlog: {
          today: 0,
          over1d: 0,
          over3d: 0,
          over7d: 0,
        },
        categories: [],
        topTags: [],
      },
    };
  }
}
