import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TarefasService } from './tarefas.service';

@Injectable()
export class TarefasTicketBridgeService {
  constructor(private readonly tarefasService: TarefasService) {}

  async createManualFollowUpFromResolvedTicket(
    input: {
      ticketId: string;
      ticketSubject: string | null;
      companyId: string;
      assignedUserId?: string | null;
      title: string;
      description?: string | null;
      dueDays: number;
      assignToOwner?: boolean;
      authorUserId?: string | null;
    },
    prismaClient: Prisma.TransactionClient | PrismaService,
  ) {
    return this.tarefasService.createFollowUpTaskFromTicket(input, prismaClient);
  }

  async createAutomaticFollowUpFromResolvedTicket(input: {
    id: string;
    subject: string | null;
    companyId: string | null;
    assignedUserId: string | null;
  }) {
    return this.tarefasService.createFromTicket(input);
  }
}
