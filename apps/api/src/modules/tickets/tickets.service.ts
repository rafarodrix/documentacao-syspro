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
import { PrismaService } from '../../prisma/prisma.service';
import {
  serializeLinkedCompaniesResponse,
  serializeMutationResponse,
  serializeTicketDetailsResponse,
  serializeTicketListResponse,
} from './ticket-contract.mapper';
import { AuthorizationService } from '../authorization/authorization.service';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
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
    const normalizedEnvironment = data.environment?.trim() || settings.defaultEnvironment || null;
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
      environment: normalizedEnvironment,
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
      messagesToCreate.push({
        direction: TicketMessageDirection.INTERNAL,
        type: TicketMessageType.SYSTEM_EVENT,
        authorKind: TicketParticipantKind.USER,
        authorUser: { connect: { id: requester.userId } },
        body: `**Recurso de Diagnóstico (Base de Dados):**\n${databaseUrl}`,
        status: TicketMessageStatus.SENT,
        sentAt: new Date(now.getTime() + 1000), // slightly after
      });
    }

    if (developmentVideoUrl) {
      messagesToCreate.push({
        direction: TicketMessageDirection.INTERNAL,
        type: TicketMessageType.SYSTEM_EVENT,
        authorKind: TicketParticipantKind.USER,
        authorUser: { connect: { id: requester.userId } },
        body: `**Recurso de Diagnóstico (Vídeo):**\n${developmentVideoUrl}`,
        status: TicketMessageStatus.SENT,
        sentAt: new Date(now.getTime() + 2000), // slightly after
      });
    }

    await this.prisma.conversation.create({
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
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(input.pageSize || '20', 10) || 20));

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

    if (input.queue && input.queue !== 'all') {
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
    if (input.closedWindow && input.closedWindow !== 'all') {
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
      select: { id: true, status: true, companyId: true, metadata: true },
    });
    if (!exists) throw new NotFoundException('Ticket nao encontrado.');
    this.assertTicketAccess(exists.companyId, accessScope);

    const resolutionSummary = input.resolutionSummary?.trim();
    const resolutionVideoUrl = input.resolutionVideoUrl?.trim();
    const releaseType = input.releaseType?.trim().toUpperCase();
    const releaseTitle = input.releaseTitle?.trim();
    const releaseModule = input.releaseModule?.trim();
    const publishToReleases = input.publishToReleases;

    if (publishToReleases && !resolutionSummary) {
      throw new BadRequestException('Resolucao obrigatoria para publicar em releases.');
    }

    if (publishToReleases && !releaseType) {
      throw new BadRequestException('Tipo de release obrigatorio para publicar em releases.');
    }

    if (releaseType && !['BUG', 'MELHORIA'].includes(releaseType)) {
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
      const currentMetadata =
        exists.metadata && typeof exists.metadata === 'object' && !Array.isArray(exists.metadata)
          ? { ...(exists.metadata as Record<string, unknown>) }
          : {};

      if (input.team !== undefined) {
        currentMetadata.currentTeam = this.resolveTicketTeam(input.team, requester.role, settings, undefined, accessScope.isGlobal);
      }
      if (input.category !== undefined) currentMetadata.category = input.category?.trim() || null;
      if (input.module !== undefined) currentMetadata.module = input.module?.trim() || null;
      if (input.environment !== undefined) currentMetadata.environment = input.environment?.trim() || null;

      if (input.status !== undefined) {
        data.status = input.status;
        data.closedAt =
          input.status === TicketStatus.RESOLVED || input.status === TicketStatus.ARCHIVED ? new Date() : null;
        data.resolvedByUserId = input.status === TicketStatus.RESOLVED ? requester.userId : null;
        if (input.status === TicketStatus.RESOLVED) {
          data.slaResolutionHitAt = new Date();
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
            currentMetadata.currentTeam = 'DESENVOLVIMENTO';
          } else {
            currentMetadata.supportOwnerUserId = requester.userId;
            currentMetadata.supportOwnerName = resolverName;
            currentMetadata.currentTeam = 'SUPORTE';
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
                ? this.resolveTicketTeam(input.team, requester.role, settings, undefined, accessScope.isGlobal)
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
      if (input.resolutionSummary !== undefined) data.resolutionSummary = resolutionSummary || null;
      if (input.resolutionVideoUrl !== undefined) data.resolutionVideoUrl = resolutionVideoUrl || null;
      if (input.releaseType !== undefined) data.releaseType = releaseType || null;
      if (input.releaseTitle !== undefined) currentMetadata.releaseTitle = releaseTitle || null;
      if (input.releaseModule !== undefined) data.releaseModule = releaseModule || null;
      if (input.publishToReleases !== undefined) data.publishToReleases = Boolean(publishToReleases);
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

      const parsed = JSON.parse(setting.value);
      const validation = ticketModuleSettingsSchema.safeParse(parsed);
      return validation.success ? validation.data : DEFAULT_TICKET_MODULE_SETTINGS;
    } catch {
      return DEFAULT_TICKET_MODULE_SETTINGS;
    }
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
