import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  TicketModuleSettings,
  TicketModuleCreateRequest,
  TicketModuleEntryPoint,
  TicketModuleListQuery,
  TicketModuleTriageRequest,
  TicketModuleUpdateRequest,
} from '@dosc-syspro/contracts/ticket';
import { DEFAULT_TICKET_MODULE_SETTINGS, ticketModuleSettingsSchema } from '@dosc-syspro/contracts/ticket';
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
import { TicketHistoryService } from './ticket-history.service';
import { TicketNotificationService } from './ticket-notification.service';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly ticketHistoryService: TicketHistoryService,
    private readonly ticketNotificationService: TicketNotificationService,
  ) {}

  async create(data: TicketModuleCreateRequest, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const ticketNumber = this.generateTicketNumber();
    const accessScope = await this.getTicketAccessScope(requester);
    const settings = await this.getTicketModuleSettings();
    const metadataSource =
      data.metadata && typeof data.metadata === 'object' && typeof data.metadata.source === 'string'
        ? data.metadata.source.trim().toLowerCase()
        : null;
    const isChatwootTicket = metadataSource === 'chatwoot';

    let resolvedCompanyId = data.companyId?.trim() || undefined;
    let resolvedContactId = data.companyContactId;

    const isSystemAdmin = accessScope.isGlobal;

    if (isSystemAdmin && (data.customerEmail || data.contactWhatsappSnapshot || data.contactPhoneSnapshot)) {
      const normalizedEmail = data.customerEmail?.trim().toLowerCase();
      const normalizedWhatsapp = data.contactWhatsappSnapshot?.replace(/\D/g, '') || undefined;
      const normalizedPhone = data.contactPhoneSnapshot?.replace(/\D/g, '') || undefined;
      const contactLookupConditions: Prisma.CompanyContactWhereInput[] = [
        ...(normalizedEmail ? [{ email: { equals: normalizedEmail, mode: 'insensitive' as const } }] : []),
        ...(normalizedWhatsapp ? [{ whatsapp: normalizedWhatsapp }] : []),
        ...(normalizedPhone ? [{ whatsapp: normalizedPhone }] : []),
      ];
      const contact = contactLookupConditions.length === 0
        ? null
        : await this.prisma.companyContact.findFirst({
            where: {
              OR: contactLookupConditions,
            },
            select: {
              id: true,
              name: true,
              companyLinks: {
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                select: { companyId: true },
              },
            },
          });
      if (contact) {
        resolvedContactId = contact.id;
        const linkedCompanyIds = contact.companyLinks.map((link) => link.companyId);

        if (resolvedCompanyId && linkedCompanyIds.length > 0 && !linkedCompanyIds.includes(resolvedCompanyId)) {
          throw new BadRequestException('A empresa selecionada nao esta vinculada ao contato informado.');
        }

        if (!resolvedCompanyId) {
          resolvedCompanyId = this.getPrimaryCompanyId(contact) ?? undefined;
        }

        if (isChatwootTicket && linkedCompanyIds.length === 0) {
          throw new BadRequestException('O contato do Chatwoot precisa estar vinculado a uma empresa no portal para abrir ticket.');
        }
      } else if (isChatwootTicket) {
        throw new BadRequestException('O contato do Chatwoot precisa existir no portal e estar vinculado a uma empresa para abrir ticket.');
      }
    } else if (!isSystemAdmin) {
      const selfContact = await this.prisma.companyContact.findFirst({
        where: { email: requester.email },
        select: {
          id: true,
          companyLinks: {
            where: { isPrimary: true },
            select: { companyId: true },
            take: 1,
          },
        },
      });
      if (selfContact) {
        resolvedContactId = selfContact.id;
      }
      
      if (data.userSelectedCompanyId) {
        resolvedCompanyId = data.userSelectedCompanyId;
      } else if (selfContact) {
        resolvedCompanyId = this.getPrimaryCompanyId(selfContact);
      } else {
        const membership = await this.prisma.membership.findFirst({
          where: { userId: requester.userId },
          select: { companyId: true },
        });
        resolvedCompanyId = membership?.companyId;
      }
    }

    if (isSystemAdmin && resolvedCompanyId) {
      const companyExists = await this.prisma.company.findFirst({
        where: { id: resolvedCompanyId, deletedAt: null },
        select: { id: true },
      });

      if (!companyExists) {
        throw new NotFoundException('Empresa nao encontrada para vincular ao ticket.');
      }
    }

    if (isChatwootTicket && (!resolvedCompanyId || !resolvedContactId)) {
      throw new BadRequestException('Tickets originados do Chatwoot exigem contato vinculado a uma empresa do portal.');
    }

    if (!accessScope.isGlobal) {
      if (!resolvedCompanyId) {
        throw new BadRequestException('Empresa obrigatoria para abrir ticket.');
      }

      if (!accessScope.companyIds.includes(resolvedCompanyId)) {
        throw new NotFoundException('Empresa nao encontrada para este usuario.');
      }
    }

    const normalizedCategory = data.category?.trim() || null;
    const normalizedModule = data.module?.trim() || null;
    const normalizedTeam = this.resolveTicketTeam(data.team, requester.role, settings, normalizedCategory, isSystemAdmin);
    const normalizedCategoryType = this.resolveCategoryType(settings, normalizedCategory, normalizedTeam);
    const databaseUrl = data.databaseUrl?.trim() || null;
    const developmentVideoUrl = data.developmentVideoUrl?.trim() || null;
    const openedByName = await this.resolveRequesterDisplayName(requester.userId, requester.email);
    const assignedUserId =
      settings.autoAssignToCreator && isSystemAdmin && normalizedTeam === 'SUPORTE'
        ? requester.userId
        : null;
    const now = new Date();
    const priority = data.priority ?? TicketPriority.NORMAL;
    const slaPolicy = this.resolveTicketSlaPolicy(priority, settings);
    const slaResponseDueAt = new Date(now.getTime() + slaPolicy.firstResponseMinutes * 60000);
    const slaResolutionDueAt = new Date(now.getTime() + slaPolicy.resolutionMinutes * 60000);
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
      slaPolicyName: slaPolicy.name,
      slaFirstResponseMinutes: slaPolicy.firstResponseMinutes,
      slaResolutionMinutes: slaPolicy.resolutionMinutes,
      databaseUrl,
      developmentVideoUrl,
      supportOwnerUserId: normalizedTeam === 'SUPORTE' && assignedUserId ? requester.userId : null,
      supportOwnerName: normalizedTeam === 'SUPORTE' && assignedUserId ? openedByName : null,
      developmentOwnerUserId: null,
      developmentOwnerName: null,
    } as Prisma.InputJsonValue;

    // Timeline messages builder
    const messagesToCreate: Prisma.ConversationMessageCreateWithoutConversationInput[] = [
      {
        direction: TicketMessageDirection.INBOUND,
        type: TicketMessageType.TEXT,
        authorKind: TicketParticipantKind.USER,
        authorUser: { connect: { id: requester.userId } },
        body: data.description,
        status: TicketMessageStatus.SENT,
        sentAt: now,
      }
    ];

    if (databaseUrl) {
      const safeDatabaseUrl = escapeHtml(databaseUrl);
      messagesToCreate.push({
        direction: TicketMessageDirection.INTERNAL,
        type: TicketMessageType.TEXT,
        authorKind: TicketParticipantKind.USER,
        authorUser: { connect: { id: requester.userId } },
        body: `<p><strong>Recurso tecnico: base de dados</strong></p><p><a href="${safeDatabaseUrl}" target="_blank" rel="noopener noreferrer">${safeDatabaseUrl}</a></p>`,
        status: TicketMessageStatus.SENT,
        sentAt: new Date(now.getTime() + 1000),
      });
    }

    if (developmentVideoUrl) {
      const safeDevelopmentVideoUrl = escapeHtml(developmentVideoUrl);
      messagesToCreate.push({
        direction: TicketMessageDirection.INTERNAL,
        type: TicketMessageType.TEXT,
        authorKind: TicketParticipantKind.USER,
        authorUser: { connect: { id: requester.userId } },
        body: `<p><strong>Recurso tecnico: video explicativo</strong></p><p><a href="${safeDevelopmentVideoUrl}" target="_blank" rel="noopener noreferrer">${safeDevelopmentVideoUrl}</a></p>`,
        status: TicketMessageStatus.SENT,
        sentAt: new Date(now.getTime() + 2000), // slightly after
      });
    }

    const createdTicket = await this.prisma.conversation.create({
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
        messages: {
          create: messagesToCreate,
        },
      },
      select: {
        id: true,
        ticketNumber: true,
      },
    });

    await this.ticketNotificationService.sendTicketCreatedGroupNotification({
      settings,
      ticketId: createdTicket.id,
      ticketNumber: createdTicket.ticketNumber || ticketNumber,
      title: data.title,
      team: normalizedTeam,
      category: normalizedCategory,
      companyId: resolvedCompanyId ?? null,
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
              },
            },
          },
        },
      },
      take: limit * 2,
    });

    const dedup = new Map<string, { companyId: string; email: string; companyName: string; contactName: string | null }>();

    for (const company of companyRows) {
      const companyName = company.nomeFantasia?.trim() || company.razaoSocial?.trim();
      if (!companyName) continue;

      dedup.set(`company:${company.id}`, {
        companyId: company.id,
        email: '',
        companyName,
        contactName: company.emailContato?.trim() || company.cnpj || 'Empresa cadastrada',
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

    const baseWhere: Prisma.ConversationWhereInput = {};

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

    const where: Prisma.ConversationWhereInput = { ...baseWhere };
    const teamScopeWhere = input.team ? this.withTicketTeam(baseWhere, input.team) : baseWhere;
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

    const openStatusWhere: Prisma.ConversationWhereInput = { ...teamScopeWhere, status: { in: [TicketStatus.NEW, TicketStatus.UNASSIGNED] } };
    const developmentStatusWhere: Prisma.ConversationWhereInput = { ...teamScopeWhere, status: { in: [TicketStatus.IN_PROGRESS] } };
    const testingStatusWhere: Prisma.ConversationWhereInput = {
      ...teamScopeWhere,
      status: { in: [TicketStatus.TRIAGE, TicketStatus.TESTING, TicketStatus.WAITING_CUSTOMER, TicketStatus.WAITING_INTERNAL] },
    };
    const closedStatusWhere: Prisma.ConversationWhereInput = {
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
    const orderBy: Prisma.ConversationOrderByWithRelationInput[] =
      sortBy === 'subject'
        ? [{ subject: sortOrder }, { updatedAt: 'desc' }]
        : sortBy === 'customer'
          ? [{ company: { nomeFantasia: sortOrder } }, { company: { razaoSocial: sortOrder } }, { updatedAt: 'desc' }]
          : [{ updatedAt: sortOrder }];

    const [items, total, baseTotal, openCount, developmentCount, testingCount, closedCount, myQueueCount, unassignedCount, criticalCount, noResponseCount] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          company: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
          companyContact: { select: { id: true, name: true, email: true, whatsapp: true } },
          assignedUser: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.conversation.count({ where }),
      this.prisma.conversation.count({ where: queueBaseWhere }),
      this.prisma.conversation.count({ where: openStatusWhere }),
      this.prisma.conversation.count({ where: developmentStatusWhere }),
      this.prisma.conversation.count({ where: testingStatusWhere }),
      this.prisma.conversation.count({ where: closedStatusWhere }),
      this.prisma.conversation.count({ where: { ...queueBaseWhere, assignedUserId: requester.userId } }),
      this.prisma.conversation.count({ where: { ...queueBaseWhere, assignedUserId: null } }),
      this.prisma.conversation.count({ where: { ...queueBaseWhere, priority: TicketPriority.CRITICAL } }),
      this.prisma.conversation.count({
        where: {
          ...queueBaseWhere,
          slaResponseHitAt: null,
          status: { notIn: [TicketStatus.RESOLVED, TicketStatus.ARCHIVED] },
        },
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
    const skip = (page - 1) * pageSize;

    const [ticket, totalMessages] = await this.prisma.$transaction([
      this.prisma.conversation.findUnique({
        where: { id },
        include: {
          company: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
          companyContact: { select: { id: true, name: true, email: true, whatsapp: true } },
          assignedUser: { select: { id: true, name: true, email: true } },
          resolvedByUser: { select: { id: true, name: true, email: true } },
          messages: {
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            skip,
            take: pageSize,
            include: {
              authorUser: { select: { id: true, name: true, email: true } },
              authorContact: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.conversationMessage.count({
        where: { conversationId: id },
      }),
    ]);

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

  async reply(id: string, message: string | undefined, visibility: 'PUBLIC' | 'INTERNAL' = 'INTERNAL', rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const accessScope = await this.getTicketAccessScope(requester);

    if (!message?.trim()) {
      throw new BadRequestException('Mensagem obrigatoria.');
    }

    const ticket = await this.prisma.conversation.findUnique({
      where: { id },
      select: { id: true, companyId: true, slaResponseHitAt: true },
    });
    if (!ticket) throw new NotFoundException('Ticket nao encontrado.');
    this.assertTicketAccess(ticket.companyId, accessScope);

    await this.prisma.conversationMessage.create({
      data: {
        conversationId: id,
        direction: visibility === 'PUBLIC' ? TicketMessageDirection.OUTBOUND : TicketMessageDirection.INTERNAL,
        type: TicketMessageType.TEXT,
        authorKind: TicketParticipantKind.USER,
        authorUserId: requester.userId,
        body: message.trim(),
        status: TicketMessageStatus.SENT,
        sentAt: new Date(),
      },
      include: {
        authorUser: { select: { id: true, name: true, email: true } },
      },
    });

    await this.prisma.conversation.update({
      where: { id },
      data: {
        lastMessagePreview: message.trim().slice(0, 500),
        lastMessageAt: new Date(),
        ...(this.authorizationService.isSystemRole(requester.role) && !ticket.slaResponseHitAt
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

    const exists = await this.prisma.conversation.findUnique({
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
    const shouldPublishToReleases = publishToReleases === true;
    const effectiveResolutionSummary = resolutionSummary || exists.resolutionSummary?.trim();
    const requestedTeam =
      input.team !== undefined
        ? this.resolveTicketTeam(input.team, requester.role, settings, undefined, accessScope.isGlobal)
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
    const nextCategoryType = this.resolveCategoryType(settings, nextCategory, currentTeam);
    const effectiveReleaseType =
      normalizeReleaseType(releaseType) || normalizeReleaseType(exists.releaseType) || normalizeReleaseType(nextCategoryType);
    const effectiveReleaseTitle =
      releaseTitle || readReleaseMetadataString(existingMetadata, 'releaseTitle') || exists.subject?.trim();
    const effectiveReleaseModule =
      releaseModule || exists.releaseModule?.trim() || readReleaseMetadataString(existingMetadata, 'module');
    const handoffNote = input.note?.trim();
    const requesterDisplayName = await this.resolveRequesterDisplayName(requester.userId, requester.email);
    const isTestingReturn = exists.status === TicketStatus.TESTING && requestedStatus === TicketStatus.IN_PROGRESS;

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
          if (requester.role === Role.DEVELOPER) {
            currentMetadata.developmentOwnerUserId = requester.userId;
            currentMetadata.developmentOwnerName = resolverName;
          } else {
            currentMetadata.supportOwnerUserId = requester.userId;
            currentMetadata.supportOwnerName = resolverName;
          }

          if (typeof currentMetadata.currentTeam !== 'string' || !currentMetadata.currentTeam.trim()) {
            currentMetadata.currentTeam = requester.role === Role.DEVELOPER ? 'DESENVOLVIMENTO' : 'SUPORTE';
          }
        }

        const hasCurrentOwner =
          typeof currentMetadata.currentOwnerUserId === 'string' && currentMetadata.currentOwnerUserId.trim().length > 0;
        const hasSupportOwner =
          typeof currentMetadata.supportOwnerUserId === 'string' && currentMetadata.supportOwnerUserId.trim().length > 0;
        const hasDevelopmentOwner =
          typeof currentMetadata.developmentOwnerUserId === 'string' && currentMetadata.developmentOwnerUserId.trim().length > 0;

        if (requester.role === Role.DEVELOPER && !hasDevelopmentOwner && !shouldResetDevelopmentWorkflow) {
          const developerName = await this.resolveRequesterDisplayName(requester.userId, requester.email);
          currentMetadata.developmentOwnerUserId = requester.userId;
          currentMetadata.developmentOwnerName = developerName;
          currentMetadata.currentTeam = 'DESENVOLVIMENTO';
          if (!hasCurrentOwner && !input.assignedUserId && !exists.assignedUserId) {
            currentMetadata.currentOwnerUserId = requester.userId;
            currentMetadata.currentOwnerName = developerName;
            currentMetadata.currentOwnerRole = requester.role;
            data.assignedUserId = requester.userId;
          }
        }

        if (requester.role !== Role.DEVELOPER && !hasSupportOwner && !shouldResetDevelopmentWorkflow) {
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
          if (supportOwner.role !== Role.SUPORTE && supportOwner.role !== Role.ADMIN) {
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
          if (developmentOwner.role !== Role.DEVELOPER && developmentOwner.role !== Role.ADMIN) {
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
            const assigneeName = assignee.name?.trim() || assignee.email;
            currentMetadata.currentOwnerUserId = assignee.id;
            currentMetadata.currentOwnerName = assigneeName;
            currentMetadata.currentOwnerRole = assignee.role;
            const targetTeam =
              input.team !== undefined
                ? requestedTeam
                : assignee.role === Role.DEVELOPER
                  ? 'DESENVOLVIMENTO'
                  : 'SUPORTE';
            currentMetadata.currentTeam = targetTeam;
            if (targetTeam === 'DESENVOLVIMENTO') {
              currentMetadata.developmentOwnerUserId = assignee.id;
              currentMetadata.developmentOwnerName = assigneeName;
            } else {
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

      await tx.conversation.update({
        where: { id },
        data: data as Prisma.ConversationUncheckedUpdateInput,
      });

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
    });

    if (exists.status !== requestedStatus && requestedStatus === TicketStatus.TESTING) {
      await this.ticketNotificationService.sendTicketStatusGroupNotification({
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
      await this.ticketNotificationService.sendTicketStatusGroupNotification({
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

    return serializeMutationResponse('Ticket atualizado com sucesso.');
  }

  // --- ERP Actions ---
  // Assign a ticket directly to the current user (Self-Assign)
  async assignToMe(id: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const accessScope = await this.getTicketAccessScope(requester);
    await this.assertCanManageTickets(requester);

    const ticket = await this.prisma.conversation.findUnique({
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
    
    currentMetadata.currentOwnerUserId = requester.userId;
    currentMetadata.currentOwnerName = requesterName;
    currentMetadata.currentOwnerRole = requester.role;

    if (requester.role === Role.DEVELOPER) {
      currentMetadata.developmentOwnerUserId = requester.userId;
      currentMetadata.developmentOwnerName = requesterName;
      currentMetadata.currentTeam = 'DESENVOLVIMENTO';
    } else {
      currentMetadata.supportOwnerUserId = requester.userId;
      currentMetadata.supportOwnerName = requesterName;
      currentMetadata.currentTeam = 'SUPORTE';
    }

    const assignmentBody = this.ticketHistoryService.buildAssignmentBody({
      requesterName,
      currentTeam: currentMetadata.currentTeam as string | null,
    });

    await this.prisma.$transaction([
      this.prisma.conversation.update({
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

    const ticket = await this.prisma.conversation.findUnique({
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
    const resolvedTeam = input.team
      ? this.resolveTicketTeam(input.team, requester.role, settings, input.category, accessScope.isGlobal)
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
      this.prisma.conversation.update({
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

  private generateTicketNumber() {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 900 + 100);
    return `TK-${timestamp}${random}`;
  }

  private async getTicketModuleSettings(): Promise<TicketModuleSettings> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'tickets.module.settings' },
        select: { value: true },
      });

      if (!setting?.value) {
        return DEFAULT_TICKET_MODULE_SETTINGS;
      }

      const parsed = this.normalizeLegacyTicketModuleSettings(JSON.parse(setting.value));
      const validation = ticketModuleSettingsSchema.safeParse(parsed);
      return validation.success ? validation.data : DEFAULT_TICKET_MODULE_SETTINGS;
    } catch {
      return DEFAULT_TICKET_MODULE_SETTINGS;
    }
  }

  private normalizeLegacyTicketModuleSettings(raw: unknown): unknown {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return raw;
    }

    const parsed = { ...(raw as Record<string, unknown>) };
    const supportLegacyJid = typeof parsed.supportNotificationGroupJid === 'string' ? parsed.supportNotificationGroupJid.trim() : '';
    const developmentLegacyJid =
      typeof parsed.developmentNotificationGroupJid === 'string' ? parsed.developmentNotificationGroupJid.trim() : '';

    if (!Array.isArray(parsed.supportNotificationGroups) && supportLegacyJid) {
      parsed.supportNotificationGroups = [
        {
          id: 'support-legacy',
          label: 'Grupo legado de suporte',
          jid: supportLegacyJid,
          active: true,
        },
      ];
    }

    if (!Array.isArray(parsed.developmentNotificationGroups) && developmentLegacyJid) {
      parsed.developmentNotificationGroups = [
        {
          id: 'development-legacy',
          label: 'Grupo legado de desenvolvimento',
          jid: developmentLegacyJid,
          active: true,
        },
      ];
    }

    return parsed;
  }


  private resolveTicketTeam(
    requestedTeam: string | undefined,
    role: Role,
    settings: TicketModuleSettings,
    category?: string | null,
    allowDevelopment = true,
  ): 'SUPORTE' | 'DESENVOLVIMENTO' {
    const normalizedRequestedTeam = requestedTeam?.trim().toUpperCase();
    if (normalizedRequestedTeam === 'SUPORTE' || normalizedRequestedTeam === 'DESENVOLVIMENTO') {
      return normalizedRequestedTeam === 'DESENVOLVIMENTO' && !allowDevelopment ? 'SUPORTE' : normalizedRequestedTeam;
    }

    const categoryDefaultTeam = settings.categories.find((item) => item.value === category)?.defaultTeam;
    if (categoryDefaultTeam === 'SUPORTE' || categoryDefaultTeam === 'DESENVOLVIMENTO') {
      return categoryDefaultTeam === 'DESENVOLVIMENTO' && !allowDevelopment ? 'SUPORTE' : categoryDefaultTeam;
    }

    if (role === Role.DEVELOPER && allowDevelopment) {
      return 'DESENVOLVIMENTO';
    }

    return settings.defaultTeam === 'DESENVOLVIMENTO' && allowDevelopment ? 'DESENVOLVIMENTO' : 'SUPORTE';
  }

  private resolveCategoryType(
    settings: TicketModuleSettings,
    category?: string | null,
    team?: string | null,
  ): 'SUPORTE' | 'BUG' | 'MELHORIA' | 'NOVA_FUNCIONALIDADE' | null {
    const normalizedCategory = category?.trim();
    const configuredType = settings.categories.find((item) => item.value === normalizedCategory)?.type;
    if (configuredType === 'SUPORTE' || configuredType === 'BUG' || configuredType === 'MELHORIA' || configuredType === 'NOVA_FUNCIONALIDADE') {
      return configuredType;
    }

    return team === 'SUPORTE' ? 'SUPORTE' : null;
  }

  private resolveTicketSlaPolicy(priority: TicketPriority, settings: TicketModuleSettings) {
    const fallbackByPriority: Record<TicketPriority, { firstResponseMinutes: number; resolutionMinutes: number }> = {
      [TicketPriority.LOW]: { firstResponseMinutes: 240, resolutionMinutes: 4320 },
      [TicketPriority.NORMAL]: { firstResponseMinutes: 60, resolutionMinutes: 1440 },
      [TicketPriority.HIGH]: { firstResponseMinutes: 15, resolutionMinutes: 240 },
      [TicketPriority.CRITICAL]: { firstResponseMinutes: 15, resolutionMinutes: 240 },
    };
    const configured = settings.priorities.find((item) => {
      const value = `${item.id} ${item.value} ${item.label}`.toLowerCase();
      if (priority === TicketPriority.CRITICAL) {
        return value.includes('critical') || value.includes('urgent') || value.includes('alta') || value.includes('high') || item.id === '3';
      }
      if (priority === TicketPriority.HIGH) return value.includes('high') || value.includes('alta') || item.id === '3';
      if (priority === TicketPriority.LOW) return value.includes('low') || value.includes('baixa') || item.id === '1';
      return value.includes('normal') || item.id === '2';
    });
    const fallback = fallbackByPriority[priority] ?? fallbackByPriority[TicketPriority.NORMAL];

    return {
      name: configured?.label ?? priority,
      firstResponseMinutes: configured?.firstResponseMinutes ?? fallback.firstResponseMinutes,
      resolutionMinutes: configured?.resolutionMinutes ?? (configured?.slaHours ? configured.slaHours * 60 : fallback.resolutionMinutes),
    };
  }

  private withTicketTeam(where: Prisma.ConversationWhereInput, team: 'SUPORTE' | 'DESENVOLVIMENTO'): Prisma.ConversationWhereInput {
    return {
      ...where,
      AND: [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        { metadata: { path: ['currentTeam'], equals: team } },
      ],
    };
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
