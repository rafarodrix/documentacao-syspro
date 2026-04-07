import { ConversationChannel, ConversationEntryPoint, ConversationPriority } from '@prisma/client';

export class CreateTicketDto {
  title: string = '';

  description: string = '';

  priority?: ConversationPriority;

  channel?: ConversationChannel;

  entryPoint?: ConversationEntryPoint;

  companyId?: string;

  companyContactId?: string;
}
