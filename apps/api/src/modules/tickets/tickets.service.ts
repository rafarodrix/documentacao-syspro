import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type {
  TicketModuleCreateRequest,
  TicketModuleEntryPoint,
  TicketModuleListQuery,
  TicketModuleUpdateRequest,
} from '@dosc-syspro/contracts';
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
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  serializeLinkedCompaniesResponse,
  serializeMutationResponse,
  serializeTicketDetailsResponse,
  serializeTicketListResponse,
} from './ticket-contract.mapper';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async create(data: TicketModuleCreateRequest, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);
    const ticketNumber = this.generateTicketNumber();
    
    let resolvedCompanyId = data.companyId;
    let resolvedContactId = data.companyContactId;
    
    const isSystemAdmin = ([Role.ADMIN, Role.DEVELOPER, Role.SUPORTE] as Role[]).includes(requester.role);

    if (isSystemAdmin && data.customerEmail) {
      const contact = await this.prisma.companyContact.findFirst({
        where: { email: data.customerEmail },
        select: { id: true, companyId: true },
      });
      if (contact) {
        resolvedContactId = contact.id;
        resolvedCompanyId = contact.companyId ?? undefined;
      }
    } else if (!isSystemAdmin) {
      const selfContact = await this.prisma.companyContact.findFirst({
        where: { email: requester.email },
        select: { id: true, companyId: true },
      });
      if (selfContact) {
        resolvedContactId = selfContact.id;
      }
      
      if (data.userSelectedCompanyId) {
        resolvedCompanyId = data.userSelectedCompanyId;
      } else if (selfContact?.companyId) {
        resolvedCompanyId = selfContact.companyId;
      } else {
        const membership = await this.prisma.membership.findFirst({
          where: { userId: requester.userId },
          select: { companyId: true },
        });
        resolvedCompanyId = membership?.companyId;
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
    const requester = await this.getRequester(rawHeaders);
    
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
    const requester = await this.getRequester(rawHeaders);

    const page = Math.max(1, Number.parseInt(input.page || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(input.pageSize || '20', 10) || 20));

    const where: Prisma.ConversationWhereInput = {};

    if (input.status && Object.values(TicketStatus).includes(input.status as TicketStatus)) {
      where.status = input.status as TicketStatus;
    }

    if (input.assignedUserId) {
      where.assignedUserId = input.assignedUserId;
    }

    if (input.companyId) {
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
    await this.getRequester(rawHeaders);

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

    return serializeTicketDetailsResponse(ticket);
  }

  async reply(id: string, message: string | undefined, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);

    if (!message?.trim()) {
      throw new BadRequestException('Mensagem obrigatoria.');
    }

    const ticket = await this.prisma.conversation.findUnique({ where: { id }, select: { id: true } });
    if (!ticket) throw new NotFoundException('Ticket nao encontrado.');

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
    const requester = await this.getRequester(rawHeaders);

    const exists = await this.prisma.conversation.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!exists) throw new NotFoundException('Ticket nao encontrado.');

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

  private async getRequester(rawHeaders?: IncomingHttpHeaders): Promise<{ userId: string; role: Role; email: string }> {
    const session = await this.authService.auth.api.getSession({
      headers: this.toHeaders(rawHeaders),
    });

    const email = session?.user?.email;
    if (!email) throw new UnauthorizedException('Nao autenticado.');

    const requester = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, isActive: true, deletedAt: true, email: true },
    });

    if (!requester || requester.deletedAt || !requester.isActive) {
      throw new UnauthorizedException('Sessao invalida.');
    }

    return { userId: requester.id, role: requester.role, email: requester.email };
  }

  private toHeaders(rawHeaders?: IncomingHttpHeaders): Headers {
    const headers = new Headers();
    if (!rawHeaders) return headers;

    for (const [key, value] of Object.entries(rawHeaders)) {
      if (!value) continue;
      if (Array.isArray(value)) {
        headers.set(key, value.join(', '));
      } else {
        headers.set(key, value);
      }
    }

    return headers;
  }

  private generateTicketNumber() {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 900 + 100);
    return `TK-${timestamp}${random}`;
  }

  private toConversationEntryPoint(entryPoint?: TicketModuleEntryPoint): TicketEntryPoint {
    if (!entryPoint || entryPoint === 'INBOUND') return TicketEntryPoint.INBOUND;
    if (entryPoint === 'OUTBOUND') return TicketEntryPoint.OUTBOUND;
    return TicketEntryPoint.SYSTEM;
  }
}
