import { ConversationPriority, ConversationStatus } from '@prisma/client';

export class UpdateTicketDto {
  status?: ConversationStatus;

  priority?: ConversationPriority;

  assignedUserId?: string;
}
