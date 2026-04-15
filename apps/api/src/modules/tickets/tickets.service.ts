import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  TicketModuleCreateRequest,
  TicketModuleEntryPoint,
  TicketModuleListQuery,
  TicketModuleUpdateRequest,
} from '@dosc-syspro/contracts/ticket';
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

    let resolvedCompanyId = data.companyId?.trim() || undefined;
    let resolvedContactId = data.companyContactId;

    const isSystemAdmin = accessScope.isGlobal;

    if (isSystemAdmin && data.customerEmail) {
      const contact = await this.prisma.companyContact.findFirst({
        where: { email: data.customerEmail },
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

    await this.prisma.conversation.create({
      data: {
        channel: data.channel ?? TicketChannel.PORTAL,
        entryPoint: this.toConversationEntryPoint(data.entryPoint),
        status: TicketStatus.NEW,
        priority: data.priority ?? TicketPriority.NORMAL,
        subject: data.title,
        ticketNumber,
        companyId: resolvedCompanyId,
        companyContactId: resolvedContactId,
        assignedUserId: requester.userId,
        externalThreadId: data.externalThreadId?.trim() || null,
        contactPhoneSnapshot: data.contactPhoneSnapshot?.trim() || null,
        contactWhatsappSnapshot: data.contactWhatsappSnapshot?.trim() || null,
        contactNameSnapshot: data.contactNameSnapshot?.trim() || null,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
        messages: {
          create: {
            direction: TicketMessageDirection.INTERNAL,
            type: TicketMessageType.TEXT,
            authorKind: TicketParticipantKind.USER,
            authorUserId: requester.userId,
            body: data.description,
            status: TicketMessageStatus.SENT,
            sentAt: new Date(),
          },
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

  async findAll(input: TicketModuleListQuery, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const accessScope = await this.getTicketAccessScope(requester);

    const page = Math.max(1, Number.parseInt(input.page || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(input.pageSize || '20', 10) || 20));

    const where: Prisma.ConversationWhereInput = {};

    if (!accessScope.isGlobal) {
      where.companyId = { in: accessScope.companyIds };
    }

    if (input.status && Object.values(TicketStatus).includes(input.status as TicketStatus)) {
      where.status = input.status as TicketStatus;
    }

    if (input.assignedUserId) {
      where.assignedUserId = input.assignedUserId;
    }

    if (input.companyId) {
      if (!accessScope.isGlobal && !accessScope.companyIds.includes(input.companyId)) {
        return serializeTicketListResponse({ items: [], page, pageSize, total: 0, requesterUserId: requester.userId });
      }

      where.companyId = input.companyId;
    }

    if (input.search?.trim()) {
      const search = input.search.trim();
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { companyContact: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
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
    ]);

    return serializeTicketListResponse({ items, page, pageSize, total, requesterUserId: requester.userId });
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

  async reply(id: string, message: string | undefined, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const accessScope = await this.getTicketAccessScope(requester);

    if (!message?.trim()) {
      throw new BadRequestException('Mensagem obrigatoria.');
    }

    const ticket = await this.prisma.conversation.findUnique({
      where: { id },
      select: { id: true, companyId: true },
    });
    if (!ticket) throw new NotFoundException('Ticket nao encontrado.');
    this.assertTicketAccess(ticket.companyId, accessScope);

    await this.prisma.conversationMessage.create({
      data: {
        conversationId: id,
        direction: TicketMessageDirection.INTERNAL,
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
      },
    });

    return serializeMutationResponse('Resposta enviada com sucesso.');
  }

  async updateStatus(id: string, input: TicketModuleUpdateRequest, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const accessScope = await this.getTicketAccessScope(requester);

    const exists = await this.prisma.conversation.findUnique({
      where: { id },
      select: { id: true, status: true, companyId: true },
    });
    if (!exists) throw new NotFoundException('Ticket nao encontrado.');
    this.assertTicketAccess(exists.companyId, accessScope);

    const resolutionSummary = input.resolutionSummary?.trim();
    const resolutionVideoUrl = input.resolutionVideoUrl?.trim();
    const releaseType = input.releaseType?.trim().toUpperCase();
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

      if (input.status !== undefined) {
        data.status = input.status;
        data.closedAt =
          input.status === TicketStatus.RESOLVED || input.status === TicketStatus.ARCHIVED ? new Date() : null;
        data.resolvedByUserId = input.status === TicketStatus.RESOLVED ? requester.userId : null;
      }

      if (input.priority !== undefined) data.priority = input.priority;
      if (input.assignedUserId !== undefined) data.assignedUserId = input.assignedUserId;
      if (input.resolutionSummary !== undefined) data.resolutionSummary = resolutionSummary || null;
      if (input.resolutionVideoUrl !== undefined) data.resolutionVideoUrl = resolutionVideoUrl || null;
      if (input.releaseType !== undefined) data.releaseType = releaseType || null;
      if (input.releaseModule !== undefined) data.releaseModule = releaseModule || null;
      if (input.publishToReleases !== undefined) data.publishToReleases = Boolean(publishToReleases);

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

  private generateTicketNumber() {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 900 + 100);
    return `TK-${timestamp}${random}`;
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
