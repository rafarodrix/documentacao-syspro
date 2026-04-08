import {
  ConversationPriority as TicketPriority,
  ConversationStatus as TicketStatus,
} from '@prisma/client';

export class UpdateTicketDto {
  status?: TicketStatus;

  priority?: TicketPriority;

  assignedUserId?: string;
}
