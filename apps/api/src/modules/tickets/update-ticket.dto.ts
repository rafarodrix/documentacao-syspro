import {
  ConversationPriority as TicketPriority,
  ConversationStatus as TicketStatus,
} from '@prisma/client';

export class UpdateTicketDto {
  status?: TicketStatus;

  priority?: TicketPriority;

  assignedUserId?: string;

  resolutionSummary?: string;

  resolutionVideoUrl?: string;

  releaseType?: string;

  releaseModule?: string;

  publishToReleases?: boolean;
}
