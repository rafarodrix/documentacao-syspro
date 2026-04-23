import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  TicketModuleSettings,
  TicketModuleCreateRequest,
  TicketModuleEntryPoint,
  TicketModuleListQuery,
  TicketModuleTriageRequest,
  TicketModuleUpdateRequest,
} from '@dosc-syspro/contracts/ticket';
import { DEFAULT_TICKET_MODULE_SETTINGS, ticketModuleSettingsSchema } from '@dosc-syspro/contracts/ticket';
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
  inferReleaseTypeFromCategory,
  normalizeReleaseType,
  readReleaseMetadataString,
} from '@dosc-syspro/core';
import { PrismaService } from '../../prisma/prisma.service';
import { EvolutionClient } from '../integrations/evolution/evolution.client';
import {
  serializeLinkedCompaniesResponse,
  serializeMutationResponse,
  serializeTicketDetailsResponse,
  serializeTicketListResponse,
} from './ticket-contract.mapper';
import { AuthorizationService } from '../authorization/authorization.service';
import { IntegrationContextService } from '../settings/integration-context.service';

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
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly evolutionClient: EvolutionClient,
    private readonly integrationContext: IntegrationContextService,
  ) {}

  async create(data: TicketModuleCreateRequest, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const ticketNumber = this.generateTicketNumber();
    const accessScope = await this.getTicketAccessScope(requester);
    const settings = await this.getTicketModuleSettings();

    let resolvedCompanyId = data.companyId?.trim() || undefined;
    let resolvedContactId = data.companyContactId;

    const isSystemAdmin = accessScope.isGlobal;

    if (isSystemAdmin && data.customerEmail) {
      const contact = await this.prisma.companyContact.findFirst({
        where: { email: { equals: data.customerEmail, mode: 'insensitive' } },
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
    const databaseUrl = data.databaseUrl?.trim() || null;
    const developmentVideoUrl = data.developmentVideoUrl?.trim() || null;
    const openedByName = await this.resolveRequesterDisplayName(requester.userId, requester.email);
    const assignedUserId = settings.autoAssignToCreator && isSystemAdmin ? requester.userId : null;
    const now = new Date();
    const priority = data.priority ?? TicketPriority.NORMAL;
    const slaPolicy = this.resolveTicketSlaPolicy(priority, settings);
    const slaResponseDueAt = new Date(now.getTime() + slaPolicy.firstResponseMinutes * 60000);
    const slaResolutionDueAt = new Date(now.getTime() + slaPolicy.resolutionMinutes * 60000);
    const metadata = {
      ...(data.metadata && typeof data.metadata === 'object' ? data.metadata : {}),
      category: normalizedCategory,
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
      developmentOwnerUserId: normalizedTeam === 'DESENVOLVIMENTO' && assignedUserId ? requester.userId : null,
      developmentOwnerName: normalizedTeam === 'DESENVOLVIMENTO' && assignedUserId ? openedByName : null,
    } as Prisma.InputJsonValue;

    // Timeline messages builder
    const messagesToCreate: Prisma.ConversationMessageCreateWithoutConversationInput[] = [
      {
        direction: TicketMessageDirection.INTERNAL,
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
        type: TicketMessageType.SYSTEM_EVENT,
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
        type: TicketMessageType.SYSTEM_EVENT,
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

    await this.sendTicketCreatedGroupNotification({
      ticketId: createdTicket.id,
      ticketNumber: createdTicket.ticketNumber || ticketNumber,
      title: data.title,
      team: normalizedTeam,
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

    const q = (input.q || '').trim().toLowerCase();
    const rawLimit = Number(input.limit || 15);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(30, Math.trunc(rawLimit))) : 15;
    const cnpjQuery = q.replace(/\D/g, '');

    const companyRows = await this.prisma.company.findMany({
      where: {
        deletedAt: null,
        ...(q
          ? {
              OR: [
                { nomeFantasia: { contains: q, mode: 'insensitive' } },
                { razaoSocial: { contains: q, mode: 'insensitive' } },
                ...(cnpjQuery ? [{ cnpj: { contains: cnpjQuery, mode: 'insensitive' as const } }] : []),
              ],
            }
          : {}),
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
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: 'insensitive' } },
                { name: { contains: q, mode: 'insensitive' } },
                {
                  companyLinks: {
                    some: {
                      company: {
                        deletedAt: null,
                        OR: [
                          { nomeFantasia: { contains: q, mode: 'insensitive' } },
                          { razaoSocial: { contains: q, mode: 'insensitive' } },
                        ],
                      },
                    },
                  },
                },
              ],
            }
          : {}),
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
      const search = input.search.trim();
      baseWhere.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { companyContact: { name: { contains: search, mode: 'insensitive' } } },
        { companyContact: { email: { contains: search, mode: 'insensitive' } } },
        { company: { nomeFantasia: { contains: search, mode: 'insensitive' } } },
        { company: { razaoSocial: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const where: Prisma.ConversationWhereInput = { ...baseWhere };
    const teamScopeWhere = input.team ? this.withTicketTeam(baseWhere, input.team) : baseWhere;
    if (input.team) {
      Object.assign(where, teamScopeWhere);
    }

    if (input.status && Object.values(TicketStatus).includes(input.status as TicketStatus)) {
      where.status = input.status as TicketStatus;
    } else if (input.statusGroup && input.statusGroup !== 'all') {
      const statusesByGroup: Record<'open' | 'pending' | 'closed', TicketStatus[]> = {
        open: [TicketStatus.NEW, TicketStatus.UNASSIGNED],
        pending: [TicketStatus.TRIAGE, TicketStatus.IN_PROGRESS, TicketStatus.TESTING, TicketStatus.WAITING_CUSTOMER],
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
    const pendingStatusWhere: Prisma.ConversationWhereInput = { ...teamScopeWhere, status: { in: [TicketStatus.TRIAGE, TicketStatus.IN_PROGRESS, TicketStatus.TESTING, TicketStatus.WAITING_CUSTOMER] } };
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

    const [items, total, baseTotal, openCount, pendingCount, closedCount, myQueueCount, unassignedCount, criticalCount, noResponseCount] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
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
      this.prisma.conversation.count({ where: pendingStatusWhere }),
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
        pending: pendingCount,
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

  async findOne(id: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const accessScope = await this.getTicketAccessScope(requester);

    const ticket = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
        companyContact: { select: { id: true, name: true, email: true, whatsapp: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
        resolvedByUser: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            authorUser: { select: { id: true, name: true, email: true } },
            authorContact: { select: { id: true, name: true } },
          },
        },
        assignments: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignedUser: { select: { id: true, name: true, email: true } },
            assignedByUser: { select: { id: true, name: true, email: true } },
            transferFromUser: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket nao encontrado.');
    this.assertTicketAccess(ticket.companyId, accessScope);

    return serializeTicketDetailsResponse(ticket);
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
        status: true,
        companyId: true,
        subject: true,
        resolutionSummary: true,
        releaseType: true,
        releaseModule: true,
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
    const publishToReleases = input.publishToReleases;
    const shouldPublishToReleases = publishToReleases === true;
    const effectiveResolutionSummary = resolutionSummary || exists.resolutionSummary?.trim();
    const effectiveReleaseType =
      normalizeReleaseType(releaseType) || normalizeReleaseType(exists.releaseType) || inferReleaseTypeFromCategory(input.category ?? existingMetadata.category);
    const effectiveReleaseTitle =
      releaseTitle || readReleaseMetadataString(existingMetadata, 'releaseTitle') || exists.subject?.trim();
    const effectiveReleaseModule =
      releaseModule || exists.releaseModule?.trim() || readReleaseMetadataString(existingMetadata, 'module');
    const requestedTeam =
      input.team !== undefined
        ? this.resolveTicketTeam(input.team, requester.role, settings, undefined, accessScope.isGlobal)
        : undefined;
    const handoffNote = input.note?.trim();

    if (shouldPublishToReleases && !effectiveResolutionSummary) {
      throw new BadRequestException('Resolucao obrigatoria para publicar em releases.');
    }

    if (requestedTeam === 'DESENVOLVIMENTO' && (!handoffNote || handoffNote.length < 20)) {
      throw new BadRequestException('Nota de contexto obrigatoria ao transferir para Desenvolvimento (min. 20 caracteres).');
    }

    if (releaseType && !normalizeReleaseType(releaseType)) {
      throw new BadRequestException('Tipo de release invalido. Use BUG ou MELHORIA.');
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
      }
      if (input.category !== undefined) currentMetadata.category = input.category?.trim() || null;
      if (input.module !== undefined) currentMetadata.module = input.module?.trim() || null;
      if (input.status !== undefined) {
        const isClosingStatus = input.status === TicketStatus.RESOLVED || input.status === TicketStatus.ARCHIVED;
        data.status = input.status;
        data.closedAt = isClosingStatus ? new Date() : null;
        data.resolvedByUserId = input.status === TicketStatus.RESOLVED ? requester.userId : null;
        if (input.status === TicketStatus.RESOLVED) {
          data.slaResolutionHitAt = new Date();
        }
        if (!isClosingStatus) {
          data.slaResolutionHitAt = null;
          delete currentMetadata.resolvedByName;
          delete currentMetadata.resolvedByRole;
        }
        if (input.status === TicketStatus.RESOLVED) {
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
      }

      if (input.priority !== undefined) data.priority = input.priority;
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

      if (requestedTeam) {
        await tx.conversationMessage.create({
          data: {
            conversationId: id,
            direction: TicketMessageDirection.INTERNAL,
            type: TicketMessageType.SYSTEM_EVENT,
            authorKind: TicketParticipantKind.USER,
            authorUserId: requester.userId,
            body: `Transferido para a fila **${requestedTeam}**.${handoffNote ? `\n\nNota: ${handoffNote}` : ''}`,
            status: TicketMessageStatus.SENT,
            sentAt: new Date(),
          },
        });
      }

    });

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
          body: `Ticket assumido por ${requesterName} e movido para EM ANDAMENTO.`,
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
    let logMessage = `Ticket triado por ${requesterName}.`;
    if (input.priority) logMessage += ` Nova prioridade: ${input.priority}.`;
    if (input.category) logMessage += ` Categoria: ${input.category}.`;
    if (resolvedTeam) logMessage += ` Direcionado para: ${resolvedTeam}.`;

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
          body: logMessage,
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

  private async sendTicketCreatedGroupNotification(input: {
    ticketId: string;
    ticketNumber: string;
    title: string;
    team: 'SUPORTE' | 'DESENVOLVIMENTO';
    companyId: string | null;
    databaseUrl: string | null;
    developmentVideoUrl: string | null;
    rawHeaders?: IncomingHttpHeaders;
  }) {
    const settings = await this.getTicketModuleSettings();
    const configuredGroups =
      input.team === 'DESENVOLVIMENTO'
        ? settings.developmentNotificationGroups
        : settings.supportNotificationGroups;
    const targetGroups = configuredGroups
      .filter((group) => group.active)
      .map((group) => ({
        ...group,
        jid: this.normalizeGroupRecipient(group.jid),
      }))
      .filter((group): group is { id: string; label: string; jid: string; active: boolean } => Boolean(group.jid));

    if (!targetGroups.length) {
      this.logger.debug(JSON.stringify({
        flow: 'portal_to_evolution',
        stage: 'ticket_group_notification_skipped_no_group',
        ticketId: input.ticketId,
        ticketNumber: input.ticketNumber,
        team: input.team,
      }));
      return;
    }

    const connection = await this.integrationContext.getDefaultContext();
    if (!connection) {
      this.logger.warn(JSON.stringify({
        flow: 'portal_to_evolution',
        stage: 'ticket_group_notification_skipped_no_connection',
        ticketId: input.ticketId,
        ticketNumber: input.ticketNumber,
        team: input.team,
        groupCount: targetGroups.length,
      }));
      return;
    }

    const company = input.companyId
      ? await this.prisma.company.findUnique({
          where: { id: input.companyId },
          select: {
            nomeFantasia: true,
            razaoSocial: true,
            cnpj: true,
          },
        })
      : null;

    const companyName = company?.nomeFantasia?.trim() || company?.razaoSocial?.trim() || 'Empresa nao informada';
    const companyCnpj = this.formatCnpj(company?.cnpj);
    const ticketUrl = this.buildPortalTicketUrl(input.ticketId, input.rawHeaders);
    const message = [
      `Novo ticket aberto - ${input.team}`,
      `Ticket: ${input.ticketNumber}`,
      `Titulo: ${input.title}`,
      `Empresa: ${companyName}`,
      companyCnpj ? `CNPJ: ${companyCnpj}` : undefined,
      input.developmentVideoUrl ? `Video: ${input.developmentVideoUrl}` : undefined,
      input.databaseUrl ? `Base: ${input.databaseUrl}` : undefined,
      ticketUrl ? `Portal: ${ticketUrl}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');

    for (const group of targetGroups) {
      try {
        await this.evolutionClient.sendTextMessage(connection.evolution, group.jid, message);
        this.logger.log(JSON.stringify({
          flow: 'portal_to_evolution',
          stage: 'ticket_group_notification_sent',
          ticketId: input.ticketId,
          ticketNumber: input.ticketNumber,
          team: input.team,
          groupJid: group.jid,
          groupLabel: group.label,
        }));
      } catch (error: any) {
        this.logger.warn(JSON.stringify({
          flow: 'portal_to_evolution',
          stage: 'ticket_group_notification_failed',
          ticketId: input.ticketId,
          ticketNumber: input.ticketNumber,
          team: input.team,
          groupJid: group.jid,
          groupLabel: group.label,
          error: error?.message ?? 'unknown_error',
        }));
      }
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

  private normalizeGroupRecipient(value?: string | null): string | null {
    const normalized = String(value ?? '').trim();
    if (!normalized) return null;
    if (normalized.endsWith('@g.us')) return normalized;

    const digits = normalized.replace(/\D/g, '');
    return digits ? `${digits}@g.us` : null;
  }

  private formatCnpj(value?: string | null): string | null {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (digits.length !== 14) return null;
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  private buildPortalTicketUrl(ticketId: string, rawHeaders?: IncomingHttpHeaders): string | null {
    const explicitOrigin = this.readHeader(rawHeaders, 'x-portal-origin') || this.readHeader(rawHeaders, 'origin');
    if (explicitOrigin) {
      try {
        return `${new URL(explicitOrigin).origin}/portal/tickets/${ticketId}`;
      } catch {
        return null;
      }
    }

    const host = this.readHeader(rawHeaders, 'x-forwarded-host') || this.readHeader(rawHeaders, 'host');
    if (!host) return null;

    const protocol = this.readHeader(rawHeaders, 'x-forwarded-proto') || 'https';
    try {
      return `${new URL(`${protocol}://${host}`).origin}/portal/tickets/${ticketId}`;
    } catch {
      return null;
    }
  }

  private readHeader(rawHeaders: IncomingHttpHeaders | undefined, key: string): string | null {
    const header = rawHeaders?.[key];
    if (Array.isArray(header)) {
      return header[0]?.trim() || null;
    }
    return typeof header === 'string' && header.trim() ? header.trim() : null;
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
