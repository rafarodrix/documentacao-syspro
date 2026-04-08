import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
import { CreateTicketDto } from './create-ticket.dto';
import { UpdateTicketDto } from './update-ticket.dto';

type TicketQueryInput = {
  page?: string;
  pageSize?: string;
  search?: string;
  status?: string;
  assignedUserId?: string;
  companyId?: string;
};

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async create(data: CreateTicketDto, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);
    const ticketNumber = this.generateTicketNumber();

    const conversation = await this.prisma.conversation.create({
      data: {
        channel: data.channel ?? TicketChannel.PORTAL,
        entryPoint: data.entryPoint ?? TicketEntryPoint.INBOUND,
        status: TicketStatus.NEW,
        priority: data.priority ?? TicketPriority.NORMAL,
        subject: data.title,
        ticketNumber,
        companyId: data.companyId,
        companyContactId: data.companyContactId,
        assignedUserId: requester.userId,
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
      include: {
        company: true,
        companyContact: true,
        assignedUser: true,
      },
    });

    return {
      success: true,
      data: conversation,
    };
  }

  async findAll(input: TicketQueryInput, rawHeaders?: IncomingHttpHeaders) {
    await this.getRequester(rawHeaders);

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

    return {
      success: true,
      data: items,
      pagination: {
        page,
        pageSize,
        total,
        hasNextPage: page * pageSize < total,
        hasPreviousPage: page > 1,
      },
    };
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

    return {
      success: true,
      data: ticket,
    };
  }

  async reply(id: string, message: string | undefined, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);

    if (!message?.trim()) {
      throw new BadRequestException('Mensagem obrigatoria.');
    }

    const ticket = await this.prisma.conversation.findUnique({ where: { id }, select: { id: true } });
    if (!ticket) throw new NotFoundException('Ticket nao encontrado.');

    const created = await this.prisma.conversationMessage.create({
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

    return {
      success: true,
      data: created,
    };
  }

  async updateStatus(id: string, input: UpdateTicketDto, rawHeaders?: IncomingHttpHeaders) {
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

    const updated = await this.prisma.$transaction(async (tx) => {
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

      const conversation = await tx.conversation.update({
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

      return conversation;
    });

    return {
      success: true,
      data: updated,
    };
  }

  private async getRequester(rawHeaders?: IncomingHttpHeaders): Promise<{ userId: string; role: Role }> {
    const session = await this.authService.auth.api.getSession({
      headers: this.toHeaders(rawHeaders),
    });

    const email = session?.user?.email;
    if (!email) throw new UnauthorizedException('Nao autenticado.');

    const requester = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, isActive: true, deletedAt: true },
    });

    if (!requester || requester.deletedAt || !requester.isActive) {
      throw new UnauthorizedException('Sessao invalida.');
    }

    return { userId: requester.id, role: requester.role };
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
}
