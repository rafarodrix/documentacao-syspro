import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import type {
  TicketModuleSettings,
  TicketModuleCreateRequest,
  TicketModuleEntryPoint,
  TicketModuleListQuery,
  TicketModuleReplyRequest,
  TicketModuleTriageRequest,
  TicketModuleUpdateRequest,
} from '@dosc-syspro/contracts/ticket';
import { TICKET_ATTACHMENT_MAX_BYTES, TICKET_REPLY_MAX_ATTACHMENTS, isAllowedTicketAttachmentMimeType } from '@dosc-syspro/contracts/ticket';
import { buildPaginationMeta } from '@dosc-syspro/contracts';
import {
  ConversationAssignmentStatus as TicketAssignmentStatus,
  ConversationAssignmentType as TicketAssignmentType,
  ConversationMessageDirection as TicketMessageDirection,
  ConversationMessageStatus as TicketMessageStatus,
  ConversationMessageType as TicketMessageType,
  ConversationParticipantKind as TicketParticipantKind,
  ConversationChannel as TicketChannel,
  ConversationEntryPoint as TicketEntryPoint,
  ConversationPriority as TicketPriority,
  ConversationStatus as TicketStatus,
  Prisma,
  Role,
} from '@prisma/client';
import type { IncomingHttpHeaders } from 'node:http';
import type { Response } from 'express';
import { createHash } from 'node:crypto';
import { normalizePhone } from '@dosc-syspro/shared';
import {
  normalizeReleaseType,
  readReleaseMetadataString,
} from '@dosc-syspro/core';
import { PrismaService } from '../../prisma/prisma.service';
import {
  serializeLinkedCompaniesResponse,
  serializeMutationResponse,
  serializeTicketDetailsResponse,
  serializeTicketListResponse,
} from './ticket-contract.mapper';
import { AuthorizationService } from '../authorization/authorization.service';
import {
  buildTicketCustomerOptionCompanySearchWhere,
  buildTicketCustomerOptionContactSearchWhere,
  buildTicketSearchWhere,
} from '../shared/search/domain-search';
import { buildConversationSearchText } from '../shared/search/search-index';
import {
  generateTicketNumber,
  resolveTicketTeam,
  resolveCategoryType,
  resolveAttachmentType,
  resolveMessageType,
  buildReplyPreview,
} from '@dosc-syspro/tickets-domain';
import { withTicketTeam, findTicketDetail, listTicketPage, countTicketQueues } from '@dosc-syspro/tickets-infra';
import { TicketHistoryService } from './ticket-history.service';
import { AutomationSettingsService } from '../automation/automation-settings.service';
import { R2StorageService } from '../integrations/storage/r2-storage.service';
import { TarefasService } from '../tarefas/tarefas.service';
import { TicketSlaService } from './ticket-sla.service';
import { TicketNotificationService } from './ticket-notification.service';
import { TicketIntegrationService } from './ticket-integration.service';

type TicketAttachmentInsertRow = {
  messageId: string;
  type: TicketMessageType;
  filename: string;
  mediaMimeType: string;
  fileSize: number;
  checksum: string;
  storageBackend: 'DATABASE' | 'R2';
  mediaUrl?: string | null;
  storageKey?: string | null;
  binaryData?: Buffer | null;
};

type TicketReplyAttachmentInput = {
  filename: string;
  mimeType: string;
  buffer: Buffer;
};

type TicketReplyInput = Omit<TicketModuleReplyRequest, 'attachments'> & {
  attachments?: TicketReplyAttachmentInput[];
};

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly ticketHistoryService: TicketHistoryService,
    private readonly automationSettingsService: AutomationSettingsService,
    private readonly ticketSlaService: TicketSlaService,
    private readonly ticketNotificationService: TicketNotificationService,
    private readonly ticketIntegrationService: TicketIntegrationService,
    private readonly r2StorageService: R2StorageService,
    @Optional() private readonly tarefasService: TarefasService | null,
  ) {}

  async create(
    data: TicketModuleCreateRequest,
    rawHeaders?: IncomingHttpHeaders,
    attachments: TicketReplyAttachmentInput[] = [],
  ) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const ticketNumber = generateTicketNumber();
    const accessScope = await this.getTicketAccessScope(requester);
    const settings = await this.getTicketModuleSettings();
    const ticketCapabilities = await this.getTicketOperatorCapabilities(requester);

    const { resolvedCompanyId, resolvedContactId } = await this.ticketIntegrationService.resolveAndValidateCustomer(
      data,
      requester,
      accessScope,
    );

    const isSystemAdmin = accessScope.isGlobal;
    const normalizedCategory = data.category?.trim() || null;
    const normalizedModule = data.module?.trim() || null;
    const normalizedTeam = resolveTicketTeam(
      data.team,
      settings,
      normalizedCategory,
      ticketCapabilities.canRouteDevelopment,
      ticketCapabilities.canOwnDevelopmentQueue,
    );
    const normalizedCategoryType = resolveCategoryType(settings, normalizedCategory, normalizedTeam);
    const databaseUrl = data.databaseUrl?.trim() || null;
    const developmentVideoUrl = data.developmentVideoUrl?.trim() || null;
    const openedByName = await this.resolveRequesterDisplayName(requester.userId, requester.email);
    const assignedUserId =
      settings.autoAssignToCreator && isSystemAdmin && normalizedTeam === 'SUPORTE'
        ? requester.userId
        : null;
    const now = new Date();
    const priority = data.priority ?? TicketPriority.NORMAL;

    const {
      slaResponseDueAt,
      slaResolutionDueAt,
      slaPolicyName,
      slaFirstResponseMinutes,
      slaResolutionMinutes,
    } = this.ticketSlaService.calculateSlaDates(priority, settings, now);

    const metadata = {
      ...(data.metadata && typeof data.metadata === 'object' ? data.metadata : {}),
      category: normalizedCategory,
      categoryType: normalizedCategoryType,
      module: normalizedModule,
      currentTeam: normalizedTeam,
      currentOwnerUserId: assignedUserId,
      currentOwnerName: assignedUserId ? openedByName : null,
      currentOwnerRole: assignedUserId ? requester.role : null,
      openedByUserId: requester.userId,
      openedByName,
      openedByEmail: requester.email,
      openedByRole: requester.role,
      slaPolicyName,
      slaFirstResponseMinutes,
      slaResolutionMinutes,
      databaseUrl,
      developmentVideoUrl,
      supportOwnerUserId: normalizedTeam === 'SUPORTE' && assignedUserId ? requester.userId : null,
      supportOwnerName: normalizedTeam === 'SUPORTE' && assignedUserId ? openedByName : null,
      developmentOwnerUserId: null,
      developmentOwnerName: null,
    } as Prisma.InputJsonValue;

    const normalizedAttachments = await Promise.all(
      attachments.map((attachment) => this.normalizeReplyAttachment(attachment)),
    );

    const createdTicket = await this.prisma.$transaction(async (tx) => {
      const conversation = await tx.ticket.create({
        data: {
          channel: data.channel ?? TicketChannel.PORTAL,
          entryPoint: this.toConversationEntryPoint(data.entryPoint),
          status: TicketStatus.NEW,
          priority,
          subject: data.title,
          searchText: buildConversationSearchText({
            subject: data.title,
            ticketNumber,
            contactNameSnapshot: data.contactNameSnapshot?.trim() || null,
            contactPhoneSnapshot: data.contactPhoneSnapshot?.trim() || null,
            contactWhatsappSnapshot: data.contactWhatsappSnapshot?.trim() || null,
            externalThreadId: data.externalThreadId?.trim() || null,
          }),
          ticketNumber,
          companyId: resolvedCompanyId,
          companyContactId: resolvedContactId,
          assignedUserId,
          slaResponseDueAt,
          slaResolutionDueAt,
          externalThreadId: data.externalThreadId?.trim() || null,
          contactPhoneSnapshot: data.contactPhoneSnapshot?.trim() || null,
          contactWhatsappSnapshot: data.contactWhatsappSnapshot?.trim() || null,
          contactNameSnapshot: data.contactNameSnapshot?.trim() || null,
          metadata,
          lastMessagePreview: data.description.slice(0, 500),
          lastMessageAt: now,
        },
        select: {
          id: true,
          ticketNumber: true,
        },
      });

      const initialMessage = await tx.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          direction: TicketMessageDirection.INBOUND,
          type: resolveMessageType(data.description, normalizedAttachments) as TicketMessageType,
          authorKind: TicketParticipantKind.USER,
          authorUserId: requester.userId,
          body: data.description,
          status: TicketMessageStatus.SENT,
          sentAt: now,
        },
        select: { id: true },
      });

      if (normalizedAttachments.length > 0) {
        const attachmentRows = await this.persistMessageAttachments(conversation.id, initialMessage.id, normalizedAttachments);
        if (attachmentRows.length > 0) {
          await tx.conversationMessageAttachment.createMany({
            data: attachmentRows,
          });
        }
      }

      if (databaseUrl) {
        await tx.conversationMessage.create({
          data: {
            conversationId: conversation.id,
            direction: TicketMessageDirection.INTERNAL,
            type: TicketMessageType.TEXT,
            authorKind: TicketParticipantKind.USER,
            authorUserId: requester.userId,
            body: `**Recurso tecnico: base de dados**\n\n${databaseUrl}`,
            status: TicketMessageStatus.SENT,
            sentAt: new Date(now.getTime() + 1000),
          },
        });
      }

      if (developmentVideoUrl) {
        await tx.conversationMessage.create({
          data: {
            conversationId: conversation.id,
            direction: TicketMessageDirection.INTERNAL,
            type: TicketMessageType.TEXT,
            authorKind: TicketParticipantKind.USER,
            authorUserId: requester.userId,
            body: `**Recurso tecnico: video explicativo**\n\n${developmentVideoUrl}`,
            status: TicketMessageStatus.SENT,
            sentAt: new Date(now.getTime() + 2000),
          },
        });
      }

      return conversation;
    });

    this.ticketNotificationService.sendTicketCreatedGroupNotification({
      settings,
      ticketId: createdTicket.id,
      ticketNumber: createdTicket.ticketNumber || ticketNumber,
      title: data.title,
      team: normalizedTeam,
      category: normalizedCategory,
      companyId: resolvedCompanyId,
      databaseUrl,
      developmentVideoUrl,
      rawHeaders,
    });

    return serializeMutationResponse('Ticket criado com sucesso.');
  }

  async getLinkedCompanies(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    
    const companiesMap = new Map<string, { id: string; name: string }>();

    const memberships = await this.prisma.membership.findMany({
      where: { userId: requester.userId },
      include: { company: true },
    });
    for (const m of memberships) {
      if (m.company) {
        companiesMap.set(m.companyId, {
          id: m.company.id,
          name: m.company.nomeFantasia || m.company.razaoSocial,
        });
      }
    }

    const contacts = await this.prisma.companyContact.findMany({
      where: { email: requester.email },
      include: {
        companyLinks: {
          include: { company: true }
        }
      },
    });

    for (const contact of contacts) {
      for (const link of contact.companyLinks) {
        if (link.company) {
          companiesMap.set(link.company.id, {
            id: link.company.id,
            name: link.company.nomeFantasia || link.company.razaoSocial,
          });
        }
      }
    }

    return serializeLinkedCompaniesResponse(Array.from(companiesMap.values()));
  }

  async findCustomerOptions(input: { q?: string; limit?: string }, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const accessScope = await this.getTicketAccessScope(requester);

    if (!accessScope.isGlobal) {
      throw new ForbiddenException('Nao autorizado a consultar empresas para tickets.');
    }

    const q = (input.q || '').trim();
    const rawLimit = Number(input.limit || 15);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(30, Math.trunc(rawLimit))) : 15;

    const companyRows = await this.prisma.company.findMany({
      where: {
        deletedAt: null,
        ...buildTicketCustomerOptionCompanySearchWhere(q),
      },
      orderBy: [{ nomeFantasia: 'asc' }, { razaoSocial: 'asc' }],
      select: {
        id: true,
        nomeFantasia: true,
        razaoSocial: true,
        cnpj: true,
        emailContato: true,
      },
      take: limit,
    });

    const contactRows = await this.prisma.companyContact.findMany({
      where: {
        status: 'LINKED',
        companyLinks: {
          some: {
            company: { deletedAt: null },
          },
        },
        ...buildTicketCustomerOptionContactSearchWhere(q),
      },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        companyLinks: {
          where: {
            company: { deletedAt: null },
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          select: {
            companyId: true,
            company: {
              select: {
                nomeFantasia: true,
                razaoSocial: true,
                cnpj: true,
              },
            },
          },
        },
      },
      take: limit * 2,
    });

    const dedup = new Map<string, {
      companyId: string;
      email: string;
      companyName: string;
      legalName: string | null;
      cnpj: string | null;
      contactName: string | null;
    }>();

    for (const company of companyRows) {
      const companyName = company.nomeFantasia?.trim() || company.razaoSocial?.trim();
      if (!companyName) continue;

      dedup.set(`company:${company.id}`, {
        companyId: company.id,
        email: '',
        companyName,
        legalName:
          company.nomeFantasia?.trim() && company.razaoSocial?.trim() && company.nomeFantasia.trim() !== company.razaoSocial.trim()
            ? company.razaoSocial.trim()
            : null,
        cnpj: company.cnpj?.trim() || null,
        contactName: null,
      });
    }

    for (const contact of contactRows) {
      const email = String(contact.email || '').trim().toLowerCase();

      for (const link of contact.companyLinks) {
        const companyName = link.company?.nomeFantasia?.trim() || link.company?.razaoSocial || '';
        if (!companyName) continue;

        const dedupKey = email ? `${email}:${link.companyId}` : `contact:${contact.id}:${link.companyId}`;
        if (dedup.has(dedupKey)) continue;

        dedup.set(dedupKey, {
          companyId: link.companyId,
          email,
          companyName,
          legalName:
            link.company?.nomeFantasia?.trim() &&
            link.company?.razaoSocial?.trim() &&
            link.company.nomeFantasia.trim() !== link.company.razaoSocial.trim()
              ? link.company.razaoSocial.trim()
              : null,
          cnpj: link.company?.cnpj?.trim() || null,
          contactName: contact.name?.trim() || null,
        });

        if (dedup.size >= limit) {
          return { options: Array.from(dedup.values()) };
        }
      }
    }

    return { options: Array.from(dedup.values()) };
  }

  async findAll(input: TicketModuleListQuery, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const accessScope = await this.getTicketAccessScope(requester);

    const page = Math.max(1, Number.parseInt(input.page || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(input.pageSize || '50', 10) || 50));

    const baseWhere: Prisma.TicketWhereInput = {};

    if (!accessScope.isGlobal) {
      baseWhere.companyId = { in: accessScope.companyIds };
    }

    if (input.companyId) {
      if (!accessScope.isGlobal && !accessScope.companyIds.includes(input.companyId)) {
        return serializeTicketListResponse({ items: [], page, pageSize, total: 0, requesterUserId: requester.userId });
      }

      baseWhere.companyId = input.companyId;
    }

    if (input.search?.trim()) {
      Object.assign(baseWhere, buildTicketSearchWhere(input.search));
    }

    const where: Prisma.TicketWhereInput = { ...baseWhere };
    const teamScopeWhere = input.team ? withTicketTeam(baseWhere, input.team) : baseWhere;
    if (input.team) {
      Object.assign(where, teamScopeWhere);
    }

    if (input.status && Object.values(TicketStatus).includes(input.status as TicketStatus)) {
      where.status = input.status as TicketStatus;
    } else if (input.statusGroup && input.statusGroup !== 'all') {
      const statusesByGroup: Record<'open' | 'development' | 'testing' | 'closed', TicketStatus[]> = {
        open: [TicketStatus.NEW, TicketStatus.UNASSIGNED],
        development: [TicketStatus.IN_PROGRESS],
        testing: [TicketStatus.TRIAGE, TicketStatus.TESTING, TicketStatus.WAITING_CUSTOMER, TicketStatus.WAITING_INTERNAL],
        closed: [TicketStatus.RESOLVED, TicketStatus.ARCHIVED],
      };
      where.status = { in: statusesByGroup[input.statusGroup] };
      if (input.statusGroup === 'closed' && input.closedWindow && input.closedWindow !== 'all') {
        const days = Number.parseInt(input.closedWindow.replace('d', ''), 10);
        if (Number.isFinite(days) && days > 0) {
          where.closedAt = { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
        }
      }
    }

    if (input.assignedUserId) {
      where.assignedUserId = input.assignedUserId;
    }

    if (input.category?.trim()) {
      const normalizedCategory = input.category.trim();
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        { metadata: { path: ['category'], equals: normalizedCategory } },
      ];
    }

    if (input.module?.trim()) {
      const normalizedModule = input.module.trim();
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        { metadata: { path: ['module'], equals: normalizedModule } },
      ];
    }

    const isClosedStatusView =
      input.status === TicketStatus.RESOLVED ||
      input.status === TicketStatus.ARCHIVED ||
      input.statusGroup === 'closed';

    if (input.queue && input.queue !== 'all' && !isClosedStatusView) {
      if (input.queue === 'my_queue') where.assignedUserId = requester.userId;
      if (input.queue === 'unassigned') where.assignedUserId = null;
      if (input.queue === 'critical') where.priority = TicketPriority.CRITICAL;
      if (input.queue === 'no_response') {
        where.slaResponseHitAt = null;
        where.status = { notIn: [TicketStatus.RESOLVED, TicketStatus.ARCHIVED] };
      }
    }

    const openStatusWhere: Prisma.TicketWhereInput = { ...teamScopeWhere, status: { in: [TicketStatus.NEW, TicketStatus.UNASSIGNED] } };
    const developmentStatusWhere: Prisma.TicketWhereInput = { ...teamScopeWhere, status: { in: [TicketStatus.IN_PROGRESS] } };
    const testingStatusWhere: Prisma.TicketWhereInput = {
      ...teamScopeWhere,
      status: { in: [TicketStatus.TRIAGE, TicketStatus.TESTING, TicketStatus.WAITING_CUSTOMER, TicketStatus.WAITING_INTERNAL] },
    };
    const closedStatusWhere: Prisma.TicketWhereInput = {
      ...teamScopeWhere,
      status: { in: [TicketStatus.RESOLVED, TicketStatus.ARCHIVED] },
    };
    if (input.statusGroup === 'closed' && input.closedWindow && input.closedWindow !== 'all') {
      const days = Number.parseInt(input.closedWindow.replace('d', ''), 10);
      if (Number.isFinite(days) && days > 0) {
        closedStatusWhere.closedAt = { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
      }
    }
    const queueBaseWhere = teamScopeWhere;
    const sortBy = input.sortBy || 'updatedAt';
    const sortOrder: Prisma.SortOrder = input.sortOrder === 'asc' ? 'asc' : 'desc';
    const orderBy: Prisma.TicketOrderByWithRelationInput[] =
      sortBy === 'subject'
        ? [{ subject: sortOrder }, { updatedAt: 'desc' }]
        : sortBy === 'customer'
          ? [{ company: { nomeFantasia: sortOrder } }, { company: { razaoSocial: sortOrder } }, { updatedAt: 'desc' }]
          : [{ updatedAt: sortOrder }];

    const [items, { total, baseTotal, openCount, developmentCount, testingCount, closedCount, myQueueCount, unassignedCount, criticalCount, noResponseCount }] =
      await Promise.all([
        listTicketPage(this.prisma, where, (page - 1) * pageSize, pageSize, orderBy),
        countTicketQueues(this.prisma, {
          where,
          queueBaseWhere,
          openStatusWhere,
          developmentStatusWhere,
          testingStatusWhere,
          closedStatusWhere,
          requesterUserId: requester.userId,
        }),
      ]);

    return serializeTicketListResponse({
      items,
      page,
      pageSize,
      total,
      requesterUserId: requester.userId,
      statusCounts: {
        open: openCount,
        development: developmentCount,
        testing: testingCount,
        closed: closedCount,
      },
      queueCounts: {
        all: baseTotal,
        my_queue: myQueueCount,
        unassigned: unassignedCount,
        critical: criticalCount,
        no_response: noResponseCount,
      },
    });
  }

  async findOne(id: string, input?: { page?: string; pageSize?: string }, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const accessScope = await this.getTicketAccessScope(requester);
    const page = Math.max(1, Number.parseInt(input?.page || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(10, Number.parseInt(input?.pageSize || '50', 10) || 50));
    const [ticket, totalMessages] = await findTicketDetail(this.prisma, id, page, pageSize);

    if (!ticket) throw new NotFoundException('Ticket nao encontrado.');
    this.assertTicketAccess(ticket.companyId, accessScope);

    const orderedMessages = [...ticket.messages].reverse();

    return serializeTicketDetailsResponse(
      {
        ...ticket,
        messages: orderedMessages,
      },
      {
        ...buildPaginationMeta({ page, pageSize, total: totalMessages }),
      },
    );
  }

  async reply(id: string, input: TicketReplyInput, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const accessScope = await this.getTicketAccessScope(requester);
    const message = input.message?.trim();
    const visibility = input.visibility ?? 'INTERNAL';
    const attachments = input.attachments ?? [];

    if (!message && attachments.length === 0) {
      throw new BadRequestException('Mensagem ou anexo obrigatorio.');
    }

    if (attachments.length > TICKET_REPLY_MAX_ATTACHMENTS) {
      throw new BadRequestException(`Limite de ${TICKET_REPLY_MAX_ATTACHMENTS} anexos por mensagem.`);
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: { id: true, companyId: true, slaResponseHitAt: true },
    });
    if (!ticket) throw new NotFoundException('Ticket nao encontrado.');
    this.assertTicketAccess(ticket.companyId, accessScope);

    const normalizedAttachments = await Promise.all(
      attachments.map((attachment) => this.normalizeReplyAttachment(attachment)),
    );

    const createdMessage = await this.prisma.conversationMessage.create({
      data: {
        conversationId: id,
        direction: visibility === 'PUBLIC' ? TicketMessageDirection.OUTBOUND : TicketMessageDirection.INTERNAL,
        type: resolveMessageType(message, normalizedAttachments) as TicketMessageType,
        authorKind: TicketParticipantKind.USER,
        authorUserId: requester.userId,
        body: message || null,
        status: TicketMessageStatus.SENT,
        sentAt: new Date(),
      },
      select: { id: true },
    });

    if (normalizedAttachments.length > 0) {
      const attachmentRows = await this.persistMessageAttachments(id, createdMessage.id, normalizedAttachments);
      if (attachmentRows.length > 0) {
        await this.prisma.conversationMessageAttachment.createMany({
          data: attachmentRows,
        });
      }
    }

    const preview = buildReplyPreview(message, normalizedAttachments);

    await this.prisma.ticket.update({
      where: { id },
      data: {
        lastMessagePreview: preview,
        lastMessageAt: new Date(),
        ...((await this.authorizationService.userHasPermission(requester, 'tickets:manage', { acceptCompanyScope: true })) && !ticket.slaResponseHitAt
          ? { slaResponseHitAt: new Date() }
          : {}),
      },
    });

    return serializeMutationResponse('Resposta enviada com sucesso.');
  }

  async updateStatus(id: string, input: TicketModuleUpdateRequest, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const accessScope = await this.getTicketAccessScope(requester);
    const settings = await this.getTicketModuleSettings();
    const isArchiveFlow = input.status === TicketStatus.ARCHIVED;

    const exists = await this.prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        ticketNumber: true,
        status: true,
        priority: true,
        companyId: true,
        assignedUserId: true,
        subject: true,
        resolutionSummary: true,
        releaseType: true,
        releaseModule: true,
        publishToReleases: true,
        metadata: true,
      },
    });
    if (!exists) throw new NotFoundException('Ticket nao encontrado.');
    this.assertTicketAccess(exists.companyId, accessScope);

    if (input.status !== undefined) {
      await this.assertCanManageTickets(requester);
    }

    if (isArchiveFlow) {
      this.logger.log(JSON.stringify({
        flow: 'tickets_archive',
        stage: 'update_status_enter',
        ticketId: exists.id,
        ticketNumber: exists.ticketNumber ?? null,
        previousStatus: exists.status,
        requestedStatus: input.status,
        requesterUserId: requester.userId,
        requesterRole: requester.role,
      }));
    }

    const existingMetadata =
      exists.metadata && typeof exists.metadata === 'object' && !Array.isArray(exists.metadata)
        ? { ...(exists.metadata as Record<string, unknown>) }
        : {};
    const resolutionSummary = input.resolutionSummary?.trim();
    const resolutionVideoUrl = input.resolutionVideoUrl?.trim();
    const releaseType = input.releaseType?.trim().toUpperCase();
    const releaseTitle = input.releaseTitle?.trim();
    const releaseModule = input.releaseModule?.trim();
    const supportOwnerUserId = input.supportOwnerUserId?.trim();
    const developmentOwnerUserId = input.developmentOwnerUserId?.trim();
    const publishToReleases = input.publishToReleases;
    const followUpTask = input.followUpTask;
    const shouldPublishToReleases = publishToReleases === true;
    const effectiveResolutionSummary = resolutionSummary || exists.resolutionSummary?.trim();
    const ticketCapabilities = await this.getTicketOperatorCapabilities(requester);
    const requestedTeam =
      input.team !== undefined
        ? resolveTicketTeam(
            input.team,
            settings,
            undefined,
            ticketCapabilities.canRouteDevelopment,
            ticketCapabilities.canOwnDevelopmentQueue,
          )
        : undefined;
    const previousTeam =
      typeof existingMetadata.currentTeam === 'string' && existingMetadata.currentTeam.trim()
        ? existingMetadata.currentTeam.trim().toUpperCase()
        : null;
    const currentTeam =
      requestedTeam ||
      previousTeam;
    const shouldResetDevelopmentWorkflow =
      requestedTeam === 'DESENVOLVIMENTO' && previousTeam !== 'DESENVOLVIMENTO';
    const requestedStatus = shouldResetDevelopmentWorkflow ? TicketStatus.NEW : input.status;
    const nextCategory =
      input.category !== undefined
        ? input.category?.trim() || null
        : typeof existingMetadata.category === 'string'
          ? existingMetadata.category
          : null;
    const nextCategoryType = resolveCategoryType(settings, nextCategory, currentTeam);
    const effectiveReleaseType =
      normalizeReleaseType(releaseType) || normalizeReleaseType(exists.releaseType) || normalizeReleaseType(nextCategoryType);
    const effectiveReleaseTitle =
      releaseTitle || readReleaseMetadataString(existingMetadata, 'releaseTitle') || exists.subject?.trim();
    const effectiveReleaseModule =
      releaseModule || exists.releaseModule?.trim() || readReleaseMetadataString(existingMetadata, 'module');
    const handoffNote = input.note?.trim();
    const requesterDisplayName = await this.resolveRequesterDisplayName(requester.userId, requester.email);
    const isTestingReturn = exists.status === TicketStatus.TESTING && requestedStatus === TicketStatus.IN_PROGRESS;
    let resolvedNextTeam = previousTeam;
    let resolvedNextStatus = exists.status as TicketStatus;
    let resolvedPublishToReleases = Boolean((exists as { publishToReleases?: boolean | null }).publishToReleases);
    let resolvedReleaseTitle = readReleaseMetadataString(existingMetadata, 'releaseTitle') || exists.subject?.trim() || 'Atualizacao sem titulo';
    let resolvedReleaseType = normalizeReleaseType(exists.releaseType) || normalizeReleaseType(existingMetadata.categoryType);
    let resolvedResolutionSummary = exists.resolutionSummary?.trim() || null;
    let resolvedClosedAt: Date | null = null;
    let followUpTaskCreated = false;
    let followUpTaskId: string | undefined;
    let followUpTaskSkippedReason: string | undefined;

    if (shouldPublishToReleases && !effectiveResolutionSummary) {
      throw new BadRequestException('Resolucao obrigatoria para publicar em releases.');
    }

    if (shouldPublishToReleases && !effectiveReleaseType) {
      throw new BadRequestException('Tipo obrigatorio para publicar em releases.');
    }

    if (requestedStatus === TicketStatus.RESOLVED && currentTeam === 'DESENVOLVIMENTO' && !effectiveResolutionSummary) {
      throw new BadRequestException('Resolucao obrigatoria para concluir tickets do setor de Desenvolvimento.');
    }

    if (requestedTeam === 'DESENVOLVIMENTO' && previousTeam !== 'DESENVOLVIMENTO' && (!handoffNote || handoffNote.length < 20)) {
      throw new BadRequestException('Nota de contexto obrigatoria ao transferir para Desenvolvimento (min. 20 caracteres).');
    }

    if (settings.requireTestingReturnReason && isTestingReturn && (!handoffNote || handoffNote.length < 20)) {
      throw new BadRequestException('Motivo obrigatorio ao retornar de Em testes para Em desenvolvimento (min. 20 caracteres).');
    }

    if (releaseType && !normalizeReleaseType(releaseType)) {
      throw new BadRequestException('Tipo de release invalido. Use BUG, MELHORIA ou NOVA_FUNCIONALIDADE.');
    }

    if (resolutionVideoUrl) {
      try {
        new URL(resolutionVideoUrl);
      } catch {
        throw new BadRequestException('Link de video invalido.');
      }
    }

    if (followUpTask) {
      if (requestedStatus !== TicketStatus.RESOLVED) {
        throw new BadRequestException('A tarefa de acompanhamento so pode ser criada ao concluir o ticket.');
      }
      if (!exists.companyId) {
        throw new BadRequestException('O ticket precisa estar vinculado a uma empresa para gerar tarefa de acompanhamento.');
      }
      if (!this.tarefasService) {
        throw new BadRequestException('O modulo de tarefas nao esta disponivel para criar a tarefa de acompanhamento.');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = {};
      const currentMetadata = { ...existingMetadata };

      if (input.team !== undefined) {
        currentMetadata.currentTeam = requestedTeam;
        if (shouldResetDevelopmentWorkflow) {
          data.status = TicketStatus.NEW;
          data.closedAt = null;
          data.resolvedByUserId = null;
          data.slaResolutionHitAt = null;
          data.assignedUserId = null;
          delete currentMetadata.currentOwnerUserId;
          delete currentMetadata.currentOwnerName;
          delete currentMetadata.currentOwnerRole;
          delete currentMetadata.developmentOwnerUserId;
          delete currentMetadata.developmentOwnerName;
          delete currentMetadata.resolvedByName;
          delete currentMetadata.resolvedByRole;
        }
      }
      if (input.category !== undefined) currentMetadata.category = input.category?.trim() || null;
      if (input.category !== undefined || input.team !== undefined) currentMetadata.categoryType = nextCategoryType;
      if (input.module !== undefined) currentMetadata.module = input.module?.trim() || null;
      if (requestedStatus !== undefined) {
        const isClosingStatus = requestedStatus === TicketStatus.RESOLVED || requestedStatus === TicketStatus.ARCHIVED;
        data.status = requestedStatus;
        data.closedAt = isClosingStatus ? new Date() : null;
        data.resolvedByUserId = requestedStatus === TicketStatus.RESOLVED ? requester.userId : null;
        if (requestedStatus === TicketStatus.RESOLVED) {
          data.slaResolutionHitAt = new Date();
        }
        if (!isClosingStatus) {
          data.slaResolutionHitAt = null;
          delete currentMetadata.resolvedByName;
          delete currentMetadata.resolvedByRole;
        }
        if (requestedStatus === TicketStatus.RESOLVED) {
          const resolver = await tx.user.findUnique({
            where: { id: requester.userId },
            select: { name: true, email: true },
          });
          const resolverName = resolver?.name?.trim() || resolver?.email || requester.email;
          currentMetadata.resolvedByName = resolverName;
          currentMetadata.resolvedByRole = requester.role;
          if (ticketCapabilities.canOwnDevelopmentQueue) {
            currentMetadata.developmentOwnerUserId = requester.userId;
            currentMetadata.developmentOwnerName = resolverName;
          }
          if (ticketCapabilities.canOwnSupportQueue) {
            currentMetadata.supportOwnerUserId = requester.userId;
            currentMetadata.supportOwnerName = resolverName;
          }

          if (typeof currentMetadata.currentTeam !== 'string' || !currentMetadata.currentTeam.trim()) {
            currentMetadata.currentTeam =
              ticketCapabilities.canOwnDevelopmentQueue && !ticketCapabilities.canOwnSupportQueue
                ? 'DESENVOLVIMENTO'
                : 'SUPORTE';
          }
        }

        const hasCurrentOwner =
          typeof currentMetadata.currentOwnerUserId === 'string' && currentMetadata.currentOwnerUserId.trim().length > 0;
        const hasSupportOwner =
          typeof currentMetadata.supportOwnerUserId === 'string' && currentMetadata.supportOwnerUserId.trim().length > 0;
        const hasDevelopmentOwner =
          typeof currentMetadata.developmentOwnerUserId === 'string' && currentMetadata.developmentOwnerUserId.trim().length > 0;

        if (
          currentTeam === 'DESENVOLVIMENTO' &&
          ticketCapabilities.canOwnDevelopmentQueue &&
          !hasDevelopmentOwner &&
          !shouldResetDevelopmentWorkflow
        ) {
          const developerName = await this.resolveRequesterDisplayName(requester.userId, requester.email);
          currentMetadata.developmentOwnerUserId = requester.userId;
          currentMetadata.developmentOwnerName = developerName;
          if (!hasCurrentOwner && !input.assignedUserId && !exists.assignedUserId) {
            currentMetadata.currentOwnerUserId = requester.userId;
            currentMetadata.currentOwnerName = developerName;
            currentMetadata.currentOwnerRole = requester.role;
            data.assignedUserId = requester.userId;
          }
        }

        if (
          currentTeam === 'SUPORTE' &&
          ticketCapabilities.canOwnSupportQueue &&
          !hasSupportOwner &&
          !shouldResetDevelopmentWorkflow
        ) {
          const supportName = await this.resolveRequesterDisplayName(requester.userId, requester.email);
          currentMetadata.supportOwnerUserId = requester.userId;
          currentMetadata.supportOwnerName = supportName;
          if (!hasCurrentOwner && !input.assignedUserId && !exists.assignedUserId) {
            currentMetadata.currentOwnerUserId = requester.userId;
            currentMetadata.currentOwnerName = supportName;
            currentMetadata.currentOwnerRole = requester.role;
            data.assignedUserId = requester.userId;
          }
        }
      }

      if (input.priority !== undefined) data.priority = input.priority;

      if (input.supportOwnerUserId !== undefined) {
        if (supportOwnerUserId) {
          const supportOwner = await tx.user.findUnique({
            where: { id: supportOwnerUserId },
            select: { id: true, name: true, email: true, role: true },
          });

          if (!supportOwner) {
            throw new NotFoundException('Analista de suporte nao encontrado.');
          }
          const canOwnSupportQueue = await this.authorizationService.userIdHasPermission(
            supportOwner.id,
            'tickets:own_support_queue',
          );
          if (!canOwnSupportQueue) {
            throw new BadRequestException('O analista responsavel precisa ser um usuario de Suporte ou Admin.');
          }

          const supportOwnerName = supportOwner.name?.trim() || supportOwner.email;
          currentMetadata.supportOwnerUserId = supportOwner.id;
          currentMetadata.supportOwnerName = supportOwnerName;

          if (currentTeam === 'SUPORTE') {
            data.assignedUserId = supportOwner.id;
            currentMetadata.currentOwnerUserId = supportOwner.id;
            currentMetadata.currentOwnerName = supportOwnerName;
            currentMetadata.currentOwnerRole = supportOwner.role;
          }
        } else {
          delete currentMetadata.supportOwnerUserId;
          delete currentMetadata.supportOwnerName;

          if (currentTeam === 'SUPORTE') {
            data.assignedUserId = null;
            delete currentMetadata.currentOwnerUserId;
            delete currentMetadata.currentOwnerName;
            delete currentMetadata.currentOwnerRole;
          }
        }
      }

      if (input.developmentOwnerUserId !== undefined) {
        if (developmentOwnerUserId) {
          const developmentOwner = await tx.user.findUnique({
            where: { id: developmentOwnerUserId },
            select: { id: true, name: true, email: true, role: true },
          });

          if (!developmentOwner) {
            throw new NotFoundException('Desenvolvedor nao encontrado.');
          }
          const canOwnDevelopmentQueue = await this.authorizationService.userIdHasPermission(
            developmentOwner.id,
            'tickets:own_development_queue',
          );
          if (!canOwnDevelopmentQueue) {
            throw new BadRequestException('O desenvolvedor responsavel precisa ser um usuario de Desenvolvimento ou Admin.');
          }

          const developmentOwnerName = developmentOwner.name?.trim() || developmentOwner.email;
          currentMetadata.developmentOwnerUserId = developmentOwner.id;
          currentMetadata.developmentOwnerName = developmentOwnerName;

          if (currentTeam === 'DESENVOLVIMENTO') {
            data.assignedUserId = developmentOwner.id;
            currentMetadata.currentOwnerUserId = developmentOwner.id;
            currentMetadata.currentOwnerName = developmentOwnerName;
            currentMetadata.currentOwnerRole = developmentOwner.role;
          }
        } else {
          delete currentMetadata.developmentOwnerUserId;
          delete currentMetadata.developmentOwnerName;

          if (currentTeam === 'DESENVOLVIMENTO') {
            data.assignedUserId = null;
            delete currentMetadata.currentOwnerUserId;
            delete currentMetadata.currentOwnerName;
            delete currentMetadata.currentOwnerRole;
          }
        }
      }

      if (input.assignedUserId !== undefined) {
        data.assignedUserId = input.assignedUserId;
        if (input.assignedUserId) {
          const assignee = await tx.user.findUnique({
            where: { id: input.assignedUserId },
            select: { id: true, name: true, email: true, role: true },
          });

          if (assignee) {
            const [assigneeCanOwnDevelopmentQueue, assigneeCanOwnSupportQueue] = await Promise.all([
              this.authorizationService.userIdHasPermission(assignee.id, 'tickets:own_development_queue'),
              this.authorizationService.userIdHasPermission(assignee.id, 'tickets:own_support_queue'),
            ]);
            const assigneeName = assignee.name?.trim() || assignee.email;
            currentMetadata.currentOwnerUserId = assignee.id;
            currentMetadata.currentOwnerName = assigneeName;
            currentMetadata.currentOwnerRole = assignee.role;

            if (assigneeCanOwnDevelopmentQueue) {
              currentMetadata.developmentOwnerUserId = assignee.id;
              currentMetadata.developmentOwnerName = assigneeName;
            }

            if (assigneeCanOwnSupportQueue) {
              currentMetadata.supportOwnerUserId = assignee.id;
              currentMetadata.supportOwnerName = assigneeName;
            }
          }
        }
      }
      if (input.resolutionSummary !== undefined || shouldPublishToReleases) data.resolutionSummary = effectiveResolutionSummary || null;
      if (input.resolutionVideoUrl !== undefined) data.resolutionVideoUrl = resolutionVideoUrl || null;
      if (input.releaseType !== undefined || shouldPublishToReleases) data.releaseType = effectiveReleaseType;
      if (input.releaseTitle !== undefined || shouldPublishToReleases) currentMetadata.releaseTitle = effectiveReleaseTitle || null;
      if (input.releaseModule !== undefined || shouldPublishToReleases) data.releaseModule = effectiveReleaseModule || null;
      if (input.publishToReleases !== undefined) {
        data.publishToReleases = Boolean(publishToReleases);
        if (publishToReleases === false) {
          data.releaseType = null;
          data.releaseModule = null;
          delete currentMetadata.releaseTitle;
        }
      }
      if (isTestingReturn && handoffNote) {
        data.lastMessagePreview = handoffNote.slice(0, 500);
        data.lastMessageAt = new Date();
      }
      data.metadata = currentMetadata as Prisma.InputJsonValue;

      await tx.ticket.update({
        where: { id },
        data: data as Prisma.TicketUncheckedUpdateInput,
      });

      if (isArchiveFlow) {
        this.logger.log(JSON.stringify({
          flow: 'tickets_archive',
          stage: 'conversation_updated',
          ticketId: id,
          previousStatus: exists.status,
          persistedRequestedStatus: data.status ?? null,
          persistedClosedAt: data.closedAt instanceof Date ? data.closedAt.toISOString() : data.closedAt ?? null,
        }));
      }

      if (input.assignedUserId) {
        await tx.conversationAssignment.create({
          data: {
            conversationId: id,
            assignedUserId: input.assignedUserId,
            assignedByUserId: requester.userId,
            assignmentType: TicketAssignmentType.MANUAL,
            status: TicketAssignmentStatus.ACTIVE,
          },
        });
      }

      const nextTeam =
        typeof currentMetadata.currentTeam === 'string' && currentMetadata.currentTeam.trim()
          ? currentMetadata.currentTeam.trim().toUpperCase()
          : previousTeam;
      const nextStatus = (requestedStatus ?? exists.status) as TicketStatus;
      resolvedNextTeam = nextTeam;
      resolvedNextStatus = nextStatus;
      const nextCategory =
        typeof currentMetadata.category === 'string' && currentMetadata.category.trim()
          ? currentMetadata.category.trim()
          : null;
      const nextPriority = (data.priority as TicketPriority | undefined) ?? exists.priority;
      const previousCategory =
        typeof existingMetadata.category === 'string' && existingMetadata.category.trim()
          ? existingMetadata.category.trim()
          : null;
      const previousSupportOwnerName = this.ticketHistoryService.readMetadataString(existingMetadata, 'supportOwnerName');
      const nextSupportOwnerName = this.ticketHistoryService.readMetadataString(currentMetadata, 'supportOwnerName');
      const previousDevelopmentOwnerName = this.ticketHistoryService.readMetadataString(existingMetadata, 'developmentOwnerName');
      const nextDevelopmentOwnerName = this.ticketHistoryService.readMetadataString(currentMetadata, 'developmentOwnerName');
      const previousCurrentOwnerName = this.ticketHistoryService.readMetadataString(existingMetadata, 'currentOwnerName');
      const nextCurrentOwnerName = this.ticketHistoryService.readMetadataString(currentMetadata, 'currentOwnerName');
      const previousReleaseTitle = readReleaseMetadataString(existingMetadata, 'releaseTitle');
      const nextReleaseTitle = this.ticketHistoryService.readMetadataString(currentMetadata, 'releaseTitle');
      const nextPublishToReleases =
        typeof data.publishToReleases === 'boolean'
          ? Boolean(data.publishToReleases)
          : Boolean((exists as { publishToReleases?: boolean | null }).publishToReleases);
      resolvedPublishToReleases = nextPublishToReleases;
      resolvedReleaseTitle = effectiveReleaseTitle || exists.subject?.trim() || 'Atualizacao sem titulo';
      resolvedReleaseType = effectiveReleaseType;
      resolvedResolutionSummary = effectiveResolutionSummary || null;
      resolvedClosedAt =
        nextStatus === TicketStatus.RESOLVED
          ? ((data.closedAt as Date | undefined) ?? new Date())
          : null;
      const historyBody = this.ticketHistoryService.buildUpdateBody({
        requesterDisplayName,
        settings,
        previousTeam,
        nextTeam,
        previousStatus: exists.status,
        nextStatus,
        previousCategory,
        nextCategory,
        previousPriority: exists.priority,
        nextPriority,
        previousCurrentOwnerName,
        nextCurrentOwnerName,
        previousSupportOwnerName,
        nextSupportOwnerName,
        previousDevelopmentOwnerName,
        nextDevelopmentOwnerName,
        previousPublishToReleases: Boolean((exists as { publishToReleases?: boolean | null }).publishToReleases),
        nextPublishToReleases,
        previousReleaseTitle,
        nextReleaseTitle,
        previousReleaseModule: exists.releaseModule?.trim() || null,
        nextReleaseModule: effectiveReleaseModule || null,
        previousReleaseType: exists.releaseType?.trim() || null,
        nextReleaseType: effectiveReleaseType || null,
        previousResolutionSummary: exists.resolutionSummary?.trim() || null,
        nextResolutionSummary: effectiveResolutionSummary || null,
        handoffNote: isTestingReturn ? undefined : handoffNote,
      });

      if (historyBody) {
        await tx.conversationMessage.create({
          data: {
            conversationId: id,
            direction: TicketMessageDirection.INTERNAL,
            type: TicketMessageType.SYSTEM_EVENT,
            authorKind: TicketParticipantKind.USER,
            authorUserId: requester.userId,
            body: historyBody,
            status: TicketMessageStatus.SENT,
            sentAt: new Date(),
          },
        });
      }

      if (isTestingReturn && handoffNote) {
        await tx.conversationMessage.create({
          data: {
            conversationId: id,
            direction: TicketMessageDirection.INTERNAL,
            type: TicketMessageType.TEXT,
            authorKind: TicketParticipantKind.USER,
            authorUserId: requester.userId,
            body: handoffNote,
            status: TicketMessageStatus.SENT,
            sentAt: new Date(),
          },
        });
      }

      if (followUpTask && requestedStatus === TicketStatus.RESOLVED && exists.companyId && this.tarefasService) {
        const followUpResult = await this.tarefasService.createFollowUpTaskFromTicket(
          {
            ticketId: exists.id,
            ticketSubject: exists.subject ?? null,
            companyId: exists.companyId,
            assignedUserId: exists.assignedUserId ?? null,
            title: followUpTask.title,
            description: followUpTask.description ?? effectiveResolutionSummary ?? null,
            dueDays: followUpTask.dueDays,
            assignToOwner: Boolean(followUpTask.assignToOwner),
            authorUserId: requester.userId,
          },
          tx,
        );

        followUpTaskCreated = followUpResult.created;
        followUpTaskId = followUpResult.taskId;
        followUpTaskSkippedReason = followUpResult.skippedReason;
      }
    });

    if (
      previousTeam &&
      resolvedNextTeam &&
      previousTeam !== resolvedNextTeam &&
      (previousTeam === 'SUPORTE' || previousTeam === 'DESENVOLVIMENTO') &&
      (resolvedNextTeam === 'SUPORTE' || resolvedNextTeam === 'DESENVOLVIMENTO')
    ) {
      const previousRoutingTeam: 'SUPORTE' | 'DESENVOLVIMENTO' = previousTeam;
      const nextRoutingTeam: 'SUPORTE' | 'DESENVOLVIMENTO' = resolvedNextTeam;

      this.ticketNotificationService.sendTicketTeamRoutingGroupNotifications({
        settings,
        ticketId: exists.id,
        ticketNumber: exists.ticketNumber || exists.id.slice(0, 8).toUpperCase(),
        title: exists.subject?.trim() || 'Sem titulo',
        companyId: exists.companyId,
        previousTeam: previousRoutingTeam,
        nextTeam: nextRoutingTeam,
        note: handoffNote,
        rawHeaders,
      });
    }

    if (exists.status !== resolvedNextStatus && resolvedNextStatus === TicketStatus.TESTING) {
      this.ticketNotificationService.sendTicketStatusGroupNotification({
        settings,
        ticketId: exists.id,
        ticketNumber: exists.ticketNumber || exists.id.slice(0, 8).toUpperCase(),
        title: exists.subject?.trim() || 'Sem titulo',
        companyId: exists.companyId,
        status: TicketStatus.TESTING,
        notificationType: 'testing',
        rawHeaders,
      });
    }

    if (isTestingReturn) {
      this.ticketNotificationService.sendTicketStatusGroupNotification({
        settings,
        ticketId: exists.id,
        ticketNumber: exists.ticketNumber || exists.id.slice(0, 8).toUpperCase(),
        title: exists.subject?.trim() || 'Sem titulo',
        companyId: exists.companyId,
        status: TicketStatus.IN_PROGRESS,
        notificationType: 'testing_failed',
        note: handoffNote,
        rawHeaders,
      });
    }

    if (
      exists.status !== TicketStatus.RESOLVED &&
      resolvedNextStatus === TicketStatus.RESOLVED &&
      resolvedNextTeam === 'DESENVOLVIMENTO' &&
      resolvedPublishToReleases &&
      resolvedResolutionSummary
    ) {
      this.ticketNotificationService.sendReleasePublishedNotification({
        settings,
        ticketId: exists.id,
        ticketNumber: exists.ticketNumber || exists.id.slice(0, 8).toUpperCase(),
        title: resolvedReleaseTitle,
        summary: resolvedResolutionSummary as string,
        releaseType: resolvedReleaseType ?? null,
        companyId: exists.companyId,
        publishedAt: resolvedClosedAt,
        rawHeaders,
      });
    }

    if (
      exists.status !== TicketStatus.RESOLVED &&
      resolvedNextStatus === TicketStatus.RESOLVED &&
      this.tarefasService &&
      !followUpTask
    ) {
      this.runAutomationInBackground('tarefas_create_from_ticket', exists.id, async () => {
        await this.tarefasService!.createFromTicket({
          id: exists.id,
          subject: exists.subject ?? null,
          companyId: exists.companyId ?? null,
          assignedUserId: exists.assignedUserId ?? null,
        });
      });
    }

    if (isArchiveFlow) {
      const persistedTicket = await this.prisma.ticket.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          closedAt: true,
          updatedAt: true,
          assignedUserId: true,
        },
      });

      this.logger.log(JSON.stringify({
        flow: 'tickets_archive',
        stage: 'update_status_exit',
        ticketId: id,
        returnedStatus: resolvedNextStatus,
        persistedStatus: persistedTicket?.status ?? null,
        persistedClosedAt: persistedTicket?.closedAt?.toISOString() ?? null,
        persistedUpdatedAt: persistedTicket?.updatedAt?.toISOString() ?? null,
        persistedAssignedUserId: persistedTicket?.assignedUserId ?? null,
      }));
    }

    return serializeMutationResponse('Ticket atualizado com sucesso.', resolvedNextStatus, {
      followUpTaskCreated: followUpTask ? followUpTaskCreated : undefined,
      followUpTaskId,
      followUpTaskSkippedReason,
    });
  }

  async archiveTicket(id: string, rawHeaders?: IncomingHttpHeaders) {
    this.logger.log(JSON.stringify({
      flow: 'tickets_archive',
      stage: 'archive_ticket_enter',
      ticketId: id,
    }));
    return this.updateStatus(id, { status: TicketStatus.ARCHIVED }, rawHeaders);
  }

  async downloadAttachment(
    ticketId: string,
    attachmentId: string,
    rawHeaders: IncomingHttpHeaders | undefined,
    res: Response,
  ) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const accessScope = await this.getTicketAccessScope(requester);

    const attachment = await this.prisma.conversationMessageAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        message: {
          select: {
            conversationId: true,
            ticket: {
              select: { companyId: true },
            },
          },
        },
      },
    });

    if (!attachment || attachment.message.conversationId !== ticketId) {
      throw new NotFoundException('Anexo nao encontrado.');
    }

    this.assertTicketAccess(attachment.message.ticket.companyId, accessScope);

    if (attachment.storageBackend === 'R2') {
      if (!attachment.storageKey) {
        throw new NotFoundException('Anexo sem referencia valida no storage.');
      }
      const url = await this.r2StorageService.getObjectUrl(attachment.storageKey, 'tickets');
      return res.redirect(url);
    }

    if (!attachment.binaryData) {
      throw new NotFoundException('Anexo sem conteudo disponivel.');
    }

    const dispositionType = attachment.mediaMimeType.startsWith('image/') ? 'inline' : 'attachment';
    res.setHeader('Content-Type', attachment.mediaMimeType);
    res.setHeader('Content-Length', String(attachment.fileSize));
    res.setHeader(
      'Content-Disposition',
      `${dispositionType}; filename="${this.toContentDispositionFilename(attachment.filename)}"`,
    );
    return res.send(Buffer.from(attachment.binaryData));
  }

  // --- ERP Actions ---
  // Assign a ticket directly to the current user (Self-Assign)
  async assignToMe(id: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const accessScope = await this.getTicketAccessScope(requester);
    await this.assertCanManageTickets(requester);

    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: { id: true, companyId: true, metadata: true, assignedUserId: true },
    });
    if (!ticket) throw new NotFoundException('Ticket nao encontrado.');
    this.assertTicketAccess(ticket.companyId, accessScope);

    if (ticket.assignedUserId === requester.userId) {
      throw new BadRequestException('Voce ja e o responsavel atual deste ticket.');
    }

    const currentMetadata = ticket.metadata && typeof ticket.metadata === 'object' && !Array.isArray(ticket.metadata) 
      ? { ...(ticket.metadata as Record<string, unknown>) } 
      : {};

    const requesterName = await this.resolveRequesterDisplayName(requester.userId, requester.email);
    const ticketCapabilities = await this.getTicketOperatorCapabilities(requester);
    const currentTeam =
      typeof currentMetadata.currentTeam === 'string' && currentMetadata.currentTeam.trim()
        ? currentMetadata.currentTeam.trim().toUpperCase()
        : ticketCapabilities.canOwnDevelopmentQueue && !ticketCapabilities.canOwnSupportQueue
          ? 'DESENVOLVIMENTO'
          : 'SUPORTE';
    
    currentMetadata.currentOwnerUserId = requester.userId;
    currentMetadata.currentOwnerName = requesterName;
    currentMetadata.currentOwnerRole = requester.role;
    currentMetadata.currentTeam = currentTeam;

    if (ticketCapabilities.canOwnDevelopmentQueue && currentTeam === 'DESENVOLVIMENTO') {
      currentMetadata.developmentOwnerUserId = requester.userId;
      currentMetadata.developmentOwnerName = requesterName;
    }
    if (ticketCapabilities.canOwnSupportQueue && currentTeam === 'SUPORTE') {
      currentMetadata.supportOwnerUserId = requester.userId;
      currentMetadata.supportOwnerName = requesterName;
    }

    const assignmentBody = this.ticketHistoryService.buildAssignmentBody({
      requesterName,
      currentTeam: currentMetadata.currentTeam as string | null,
    });

    await this.prisma.$transaction([
      this.prisma.ticket.update({
        where: { id },
        data: {
          assignedUserId: requester.userId,
          status: TicketStatus.IN_PROGRESS,
          metadata: currentMetadata as Prisma.InputJsonValue,
        },
      }),
      this.prisma.conversationAssignment.create({
        data: {
          conversationId: id,
          assignedUserId: requester.userId,
          assignedByUserId: requester.userId,
          assignmentType: TicketAssignmentType.MANUAL,
          status: TicketAssignmentStatus.ACTIVE,
          reason: 'Auto-assigned by internal user',
        },
      }),
      // Add system message logging the assignment
      this.prisma.conversationMessage.create({
        data: {
          conversationId: id,
          direction: TicketMessageDirection.INTERNAL,
          type: TicketMessageType.SYSTEM_EVENT,
          authorKind: TicketParticipantKind.USER,
          authorUserId: requester.userId,
          body: assignmentBody,
          status: TicketMessageStatus.SENT,
          sentAt: new Date(),
        }
      })
    ]);

    return serializeMutationResponse('Ticket atribuido a voce com sucesso.');
  }

  // Triage ticket
  async triageTicket(id: string, input: TicketModuleTriageRequest, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const accessScope = await this.getTicketAccessScope(requester);
    await this.assertCanManageTickets(requester);

    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: { id: true, companyId: true, metadata: true },
    });
    if (!ticket) throw new NotFoundException('Ticket nao encontrado.');
    this.assertTicketAccess(ticket.companyId, accessScope);

    const currentMetadata = ticket.metadata && typeof ticket.metadata === 'object' && !Array.isArray(ticket.metadata) 
      ? { ...(ticket.metadata as Record<string, unknown>) } 
      : {};

    const requesterName = await this.resolveRequesterDisplayName(requester.userId, requester.email);
    const settings = await this.getTicketModuleSettings();
    const ticketCapabilities = await this.getTicketOperatorCapabilities(requester);
    const resolvedTeam = input.team
      ? resolveTicketTeam(
          input.team,
          settings,
          input.category,
          ticketCapabilities.canRouteDevelopment,
          ticketCapabilities.canOwnDevelopmentQueue,
        )
      : undefined;
    const triageBody = this.ticketHistoryService.buildTriageBody({
      requesterName,
      settings,
      triage: input,
      resolvedTeam,
    });

    if (input.category) currentMetadata.category = input.category;
    if (resolvedTeam) currentMetadata.currentTeam = resolvedTeam;

    await this.prisma.$transaction([
      this.prisma.ticket.update({
        where: { id },
        data: {
          status: TicketStatus.TRIAGE,
          ...(input.priority ? { priority: input.priority as TicketPriority } : {}),
          metadata: currentMetadata as Prisma.InputJsonValue,
        },
      }),
      // Add system message
      this.prisma.conversationMessage.create({
        data: {
          conversationId: id,
          direction: TicketMessageDirection.INTERNAL,
          type: TicketMessageType.SYSTEM_EVENT,
          authorKind: TicketParticipantKind.USER,
          authorUserId: requester.userId,
          body: triageBody,
          status: TicketMessageStatus.SENT,
          sentAt: new Date(),
        }
      })
    ]);

    return serializeMutationResponse('Triagem realizada com sucesso.');
  }

  private async normalizeReplyAttachment(
    attachment: TicketReplyAttachmentInput,
  ) {
    const filename = attachment.filename.trim() || 'arquivo';
    const mimeType = attachment.mimeType.trim().toLowerCase() || 'application/octet-stream';
    const buffer = Buffer.isBuffer(attachment.buffer)
      ? attachment.buffer
      : Buffer.from(attachment.buffer);

    if (!buffer.length) {
      throw new BadRequestException(`Anexo ${filename} sem conteudo valido.`);
    }

    if (buffer.length > TICKET_ATTACHMENT_MAX_BYTES) {
      throw new BadRequestException(`O anexo ${filename} excede o limite de 5 MB.`);
    }

    if (!isAllowedTicketAttachmentMimeType(mimeType)) {
      throw new BadRequestException(`O anexo ${filename} possui um tipo nao suportado: ${mimeType}.`);
    }

    return {
      filename,
      mimeType,
      buffer,
      fileSize: buffer.length,
      checksum: createHash('sha256').update(buffer).digest('hex'),
      type: resolveAttachmentType(mimeType),
    };
  }

  private async persistMessageAttachments(
    ticketId: string,
    messageId: string,
    attachments: Array<{
      filename: string;
      mimeType: string;
      buffer: Buffer;
      fileSize: number;
      checksum: string;
      type: TicketMessageType;
    }>,
  ): Promise<TicketAttachmentInsertRow[]> {
    return Promise.all(
      attachments.map(async (attachment) => {
        if (await this.r2StorageService.isEnabled('tickets')) {
          const uploaded = await this.r2StorageService.uploadBuffer({
            buffer: attachment.buffer,
            filename: attachment.filename,
            contentType: attachment.mimeType,
            scope: 'tickets',
            prefix: ticketId,
          });

          return {
            messageId,
            type: attachment.type,
            filename: attachment.filename,
            mediaMimeType: attachment.mimeType,
            fileSize: attachment.fileSize,
            checksum: attachment.checksum,
            storageBackend: 'R2',
            mediaUrl: uploaded.url,
            storageKey: uploaded.key,
          };
        }

        if (!(await this.r2StorageService.shouldFallbackToDatabase())) {
          throw new BadRequestException('Storage de anexos indisponivel e o fallback em banco esta desabilitado.');
        }

        return {
          messageId,
          type: attachment.type,
          filename: attachment.filename,
          mediaMimeType: attachment.mimeType,
          fileSize: attachment.fileSize,
          checksum: attachment.checksum,
          storageBackend: 'DATABASE',
          binaryData: attachment.buffer,
        };
      }),
    );
  }

  private toContentDispositionFilename(filename: string) {
    return filename.replace(/["\\\r\n]+/g, '_');
  }

  private async getTicketModuleSettings(): Promise<TicketModuleSettings> {
    return this.automationSettingsService.readMergedTicketModuleSettings();
  }

  private runAutomationInBackground(
    automationName: string,
    ticketId: string,
    task: () => Promise<void>,
  ) {
    void Promise.resolve()
      .then(task)
      .catch((error: any) => {
        this.logger.error(JSON.stringify({
          flow: 'portal_to_automation',
          stage: 'background_automation_failed',
          automationName,
          ticketId,
          error: error?.message ?? 'unknown_error',
        }));
      });
  }


  private async resolveRequesterDisplayName(userId: string, email: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    return user?.name?.trim() || user?.email || email;
  }

  private getPrimaryCompanyId(contact: { companyLinks?: Array<{ companyId: string }> }) {
    return contact.companyLinks?.[0]?.companyId;
  }

  private async getTicketAccessScope(requester: { userId: string; role: Role; email: string }): Promise<{
    isGlobal: boolean;
    companyIds: string[];
  }> {
    return this.authorizationService.resolveCompanyAccessScope(
      requester,
      'tickets:view_own',
      'tickets:view_all',
    );
  }

  private async assertCanManageTickets(requester: { userId: string; role: Role; email: string }) {
    const canManage = await this.authorizationService.userHasPermission(
      requester,
      'tickets:manage',
      { acceptCompanyScope: true },
    );

    if (!canManage) {
      throw new ForbiddenException('Sem permissao para gerenciar tickets.');
    }
  }

  private async getTicketOperatorCapabilities(requester: { userId: string; role: Role; email: string }) {
    const [canRouteDevelopment, canOwnSupportQueue, canOwnDevelopmentQueue] = await Promise.all([
      this.authorizationService.userHasPermission(requester, 'tickets:route_development', { acceptCompanyScope: true }),
      this.authorizationService.userHasPermission(requester, 'tickets:own_support_queue', { acceptCompanyScope: true }),
      this.authorizationService.userHasPermission(requester, 'tickets:own_development_queue', { acceptCompanyScope: true }),
    ]);

    return {
      canRouteDevelopment,
      canOwnSupportQueue,
      canOwnDevelopmentQueue,
    };
  }

  private assertTicketAccess(companyId: string | null, accessScope: { isGlobal: boolean; companyIds: string[] }) {
    if (accessScope.isGlobal) {
      return;
    }

    if (!companyId || !accessScope.companyIds.includes(companyId)) {
      throw new NotFoundException('Ticket nao encontrado.');
    }
  }

  private toConversationEntryPoint(entryPoint?: TicketModuleEntryPoint): TicketEntryPoint {
    if (!entryPoint || entryPoint === 'INBOUND') return TicketEntryPoint.INBOUND;
    if (entryPoint === 'OUTBOUND') return TicketEntryPoint.OUTBOUND;
    return TicketEntryPoint.SYSTEM;
  }
}
