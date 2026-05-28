import { ForbiddenException, Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { mapConversationStatus, parseDateInput, startOfDay } from '../dashboard.shared';

@Injectable()
export class AtendimentosDashboardQuery {
  private static readonly CACHE_TTL_MS = 45_000;
  private readonly cache = new Map<string, { expiresAt: number; payload: any }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async execute(
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
    const cached = this.cache.get(cacheKey);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return cached.payload;
    }

    const accessScope = await this.authorizationService.resolveCompanyAccessScope(
      requester,
      'tickets:view_own',
      'tickets:view_all',
    );

    const ticketBaseWhere: Prisma.TicketWhereInput = {
      createdAt: { gte: periodStart, lte: periodEnd },
      ...(accessScope.isGlobal ? {} : { companyId: { in: accessScope.companyIds } }),
    };

    if (assigneeId) {
      ticketBaseWhere.assignedUserId = assigneeId;
    }

    if (contactQuery) {
      ticketBaseWhere.OR = [
        { contactNameSnapshot: { contains: contactQuery, mode: 'insensitive' } },
        { contactPhoneSnapshot: { contains: contactQuery, mode: 'insensitive' } },
        { contactWhatsappSnapshot: { contains: contactQuery, mode: 'insensitive' } },
        { companyContact: { name: { contains: contactQuery, mode: 'insensitive' } } },
        { company: { razaoSocial: { contains: contactQuery, mode: 'insensitive' } } },
        { company: { nomeFantasia: { contains: contactQuery, mode: 'insensitive' } } },
      ];
    }

    const tickets = await this.prisma.ticket.findMany({
      where: ticketBaseWhere,
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
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        ticketCategory: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const statusLabelMap: Record<string, string> = {
      NEW: 'Novo',
      UNASSIGNED: 'Sem responsavel',
      TRIAGE: 'Triagem',
      IN_PROGRESS: 'Em andamento',
      WAITING_CUSTOMER: 'Aguardando cliente',
      WAITING_INTERNAL: 'Aguardando interno',
      TESTING: 'Teste',
      RESOLVED: 'Resolvido',
      ARCHIVED: 'Arquivado',
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

    const recognizedCategories = [
      'fiscal',
      'nota fiscal',
      'financeiro',
      'vendas',
      'estoque',
      'frente de caixa',
      'balanÃ§a',
      'instalaÃ§Ã£o',
      'treinamento',
      'erro operacional',
      'erro sistema',
      'dÃºvida de uso',
      'solicitaÃ§Ã£o de melhoria',
    ];

    const categoryCountsMap = new Map<string, number>(recognizedCategories.map((category) => [category, 0]));
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

    let resolvedCount = 0;
    let openCount = 0;
    let unassignedCount = 0;

    const assigneeOptionsMap = new Map<string, string>();

    type RecurrenceItem = {
      key: string;
      name: string;
      count: number;
      channel: 'WHATSAPP' | 'EMAIL' | 'PORTAL' | 'PHONE';
      lastAttendance: Date | null;
    };

    const companyRecurrenceMap = new Map<string, RecurrenceItem>();
    const contactRecurrenceMap = new Map<string, RecurrenceItem>();

    for (const ticket of tickets) {
      const rawStatus = String(ticket.status ?? '').trim().toUpperCase();
      const statusLabel =
        !ticket.assignedUserId && rawStatus === 'NEW'
          ? 'Sem responsavel'
          : statusLabelMap[rawStatus] ?? 'Em andamento';
      statusCountsMap.set(statusLabel, (statusCountsMap.get(statusLabel) || 0) + 1);

      const mappedChannel = ticket.channel;
      channelCountsMap.set(mappedChannel, (channelCountsMap.get(mappedChannel) || 0) + 1);

      if (ticket.companyId) {
        const companyKey = ticket.companyId;
        const companyName = ticket.company?.nomeFantasia || ticket.company?.razaoSocial || 'Empresa Sem Nome';
        const existing = companyRecurrenceMap.get(companyKey) || {
          key: companyKey,
          name: companyName,
          count: 0,
          channel: ticket.channel,
          lastAttendance: null,
        };
        existing.count += 1;
        existing.channel = ticket.channel;
        if (ticket.createdAt instanceof Date && (!existing.lastAttendance || ticket.createdAt > existing.lastAttendance)) {
          existing.lastAttendance = ticket.createdAt;
        }
        companyRecurrenceMap.set(companyKey, existing);
      }

      let contactKey = '';
      let contactName = '';

      if (ticket.companyContactId) {
        contactKey = ticket.companyContactId;
        contactName = ticket.companyContact?.name || ticket.contactNameSnapshot || 'Contato Avulso';
      } else {
        contactKey = ticket.contactPhoneSnapshot || ticket.contactNameSnapshot || 'unlinked';
        contactName = ticket.contactNameSnapshot || ticket.contactPhoneSnapshot || 'Cliente Avulso';
      }

      const existingContact = contactRecurrenceMap.get(contactKey) || {
        key: contactKey,
        name: contactName,
        count: 0,
        channel: ticket.channel,
        lastAttendance: null,
      };
      existingContact.count += 1;
      existingContact.channel = ticket.channel;
      if (ticket.createdAt instanceof Date && (!existingContact.lastAttendance || ticket.createdAt > existingContact.lastAttendance)) {
        existingContact.lastAttendance = ticket.createdAt;
      }
      contactRecurrenceMap.set(contactKey, existingContact);

      const assigneeName = ticket.assignedUser?.name || ticket.assignedUser?.email || 'Sem responsavel';
      if (ticket.assignedUserId) {
        assigneeOptionsMap.set(ticket.assignedUserId, assigneeName);

        const current = assigneeLoadMap.get(ticket.assignedUserId) || {
          userId: ticket.assignedUserId,
          name: assigneeName,
          openCount: 0,
          waitingCount: 0,
          resolvedCount: 0,
          firstResponseSum: 0,
          firstResponseCount: 0,
          resolutionSum: 0,
          resolutionCount: 0,
        };

        if (ticket.status !== 'RESOLVED' && ticket.status !== 'ARCHIVED') current.openCount += 1;
        if (ticket.status === 'WAITING_CUSTOMER' || ticket.status === 'WAITING_INTERNAL') current.waitingCount += 1;
        if (ticket.status === 'RESOLVED') current.resolvedCount += 1;

        if (ticket.createdAt instanceof Date) {
          if (ticket.slaResponseHitAt instanceof Date) {
            const firstResponseMin = (ticket.slaResponseHitAt.getTime() - ticket.createdAt.getTime()) / 60000;
            current.firstResponseSum += firstResponseMin;
            current.firstResponseCount += 1;
          }
          if (ticket.status === 'RESOLVED' && ticket.closedAt instanceof Date) {
            const resolutionHours = (ticket.closedAt.getTime() - ticket.createdAt.getTime()) / 3600000;
            current.resolutionSum += resolutionHours;
            current.resolutionCount += 1;
          }
        }
        assigneeLoadMap.set(ticket.assignedUserId, current);
      } else {
        unassignedCount += 1;
      }

      if (ticket.status === 'RESOLVED') resolvedCount += 1;
      else openCount += 1;

      if (ticket.createdAt instanceof Date) {
        if (ticket.slaResponseHitAt instanceof Date) {
          const firstResponseMin = (ticket.slaResponseHitAt.getTime() - ticket.createdAt.getTime()) / 60000;
          firstResponseTotalSlaCount += 1;
          if (firstResponseMin <= 15) firstResponseWithinSlaCount += 1;
        }

        if (ticket.status === 'RESOLVED' && ticket.closedAt instanceof Date) {
          const resolutionHours = (ticket.closedAt.getTime() - ticket.createdAt.getTime()) / 3600000;
          resolutionTotalSlaCount += 1;
          if (resolutionHours <= 24) resolutionWithinSlaCount += 1;
        } else if (ticket.status !== 'RESOLVED' && ticket.status !== 'ARCHIVED') {
          const ageHours = (Date.now() - ticket.createdAt.getTime()) / 3600000;
          if (ageHours > 24) delayedOpenCount += 1;

          if (ageHours <= 24) backlogToday += 1;
          else if (ageHours <= 72) backlogOver1d += 1;
          else if (ageHours <= 168) backlogOver3d += 1;
          else backlogOver7d += 1;
        }
      }

      let matchedCategory = false;
      if (ticket.ticketCategory?.name) {
        const normalizedLabel = ticket.ticketCategory.name.toLowerCase().trim();
        const matched = recognizedCategories.find((category) => category === normalizedLabel);
        if (matched) {
          categoryCountsMap.set(matched, (categoryCountsMap.get(matched) || 0) + 1);
          matchedCategory = true;
        }
      }
      if (!matchedCategory) {
        categoryCountsMap.set('Outros', (categoryCountsMap.get('Outros') || 0) + 1);
      }
    }

    const avgFirstResponseMinutes = (() => {
      const valid = tickets
        .map((ticket) => {
          if (!(ticket.createdAt instanceof Date) || !(ticket.slaResponseHitAt instanceof Date)) return null;
          return (ticket.slaResponseHitAt.getTime() - ticket.createdAt.getTime()) / 60000;
        })
        .filter((value): value is number => value !== null && value >= 0);
      if (!valid.length) return null;
      return Math.round(valid.reduce((sum, item) => sum + item, 0) / valid.length);
    })();

    const avgResolutionHours = (() => {
      const valid = tickets
        .map((ticket) => {
          if (ticket.status !== 'RESOLVED' || !(ticket.createdAt instanceof Date) || !(ticket.closedAt instanceof Date)) return null;
          return (ticket.closedAt.getTime() - ticket.createdAt.getTime()) / 3600000;
        })
        .filter((value): value is number => value !== null && value >= 0);
      if (!valid.length) return null;
      return Math.round((valid.reduce((sum, item) => sum + item, 0) / valid.length) * 10) / 10;
    })();

    const csatRatings = await this.prisma.chatwootCsatRating.findMany({
      where: {
        respondedAt: { gte: periodStart, lte: periodEnd },
        ...(assigneeId ? { agentId: assigneeId } : {}),
        ...(contactQuery
          ? {
              OR: [
                { contact: { contains: contactQuery, mode: 'insensitive' } },
                { agentName: { contains: contactQuery, mode: 'insensitive' } },
              ],
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

    const mapRecurrenceItems = (items: RecurrenceItem[]) => {
      return items.map((item) => {
        let lastAttendance = 'Sem registro';
        if (item.lastAttendance instanceof Date) {
          const diffMs = Date.now() - item.lastAttendance.getTime();
          const diffDays = Math.floor(diffMs / 86400000);
          if (diffDays === 0) lastAttendance = 'Hoje';
          else if (diffDays === 1) lastAttendance = 'Ontem';
          else lastAttendance = `HÃ¡ ${diffDays} dias`;
        }

        return {
          key: item.key,
          name: item.name,
          count: item.count,
          channel: item.channel,
          motive: 'Sem categoria',
          lastAttendance,
        };
      });
    };

    const topCompaniesMapped = mapRecurrenceItems(
      Array.from(companyRecurrenceMap.values())
        .sort((left, right) => right.count - left.count)
        .slice(0, 10),
    );

    const topContactsMapped = mapRecurrenceItems(
      Array.from(contactRecurrenceMap.values())
        .sort((left, right) => right.count - left.count)
        .slice(0, 10),
    );

    const unassignedConversations = tickets
      .filter((ticket) => !ticket.assignedUserId && ticket.status !== 'RESOLVED' && ticket.status !== 'ARCHIVED')
      .map((ticket) => ({
        id: ticket.id,
        reference: ticket.ticketNumber || ticket.id.slice(0, 8).toUpperCase(),
        subject: ticket.subject || 'Sem assunto',
        contactName:
          ticket.companyContact?.name ||
          ticket.contactNameSnapshot ||
          ticket.company?.nomeFantasia ||
          ticket.company?.razaoSocial ||
          'Contato nao identificado',
        channel: ticket.channel,
        status: mapConversationStatus(ticket.status),
        lastUpdate: ticket.updatedAt instanceof Date ? ticket.updatedAt.toISOString() : new Date().toISOString(),
        detailHref: `/portal/tickets/${ticket.id}`,
      }));

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

    const toSeries = (dates: Date[]) => {
      const counts = new Map<string, number>();
      for (const date of dates) {
        const key = date.toLocaleDateString('en-US');
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      return Array.from(counts.entries())
        .map(([key, count]) => ({ label: key, value: count }))
        .sort((left, right) => new Date(left.label).getTime() - new Date(right.label).getTime());
    };

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
        cacheTtlSeconds: Math.floor(AtendimentosDashboardQuery.CACHE_TTL_MS / 1000),
        appliedAssigneeId: assigneeId || undefined,
        appliedContactQuery: contactQuery || undefined,
        totalCount: tickets.length,
        openCount,
        unassignedCount,
        resolvedCount,
        cancelledCount: 0,
        cancelledByCustomerCount: 0,
        cancelledByAgentCount: 0,
        spamCount: 0,
        unlinkedCount: 0,
        csatSkippedCount: 0,
        csatEligibleResolvedCount: 0,
        csatResponseCount,
        csatLowScoreCount,
        csatAverageScore,
        avgFirstResponseMinutes,
        avgResolutionHours,
        activity: toSeries(tickets.map((ticket) => ticket.createdAt)),
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
    this.cache.set(cacheKey, {
      expiresAt: Date.now() + AtendimentosDashboardQuery.CACHE_TTL_MS,
      payload,
    });
    return payload;
  }
}
