import {
  ConversationChannel as TicketChannel,
  ConversationEntryPoint as TicketEntryPoint,
  ConversationPriority as TicketPriority,
} from '@prisma/client';

export class CreateTicketDto {
  title: string = '';

  description: string = '';

  priority?: TicketPriority;

  channel?: TicketChannel;

  entryPoint?: TicketEntryPoint;

  companyId?: string;

  companyContactId?: string;

  externalThreadId?: string;

  contactPhoneSnapshot?: string;

  contactWhatsappSnapshot?: string;

  contactNameSnapshot?: string;

  metadata?: Record<string, unknown>;

  userSelectedCompanyId?: string;

  customerEmail?: string;
}
