import type {
  TicketModuleChannel,
  TicketModuleCreateRequest,
  TicketModuleEntryPoint,
  TicketModulePriority,
} from '@dosc-syspro/contracts/ticket';

export class CreateTicketDto implements TicketModuleCreateRequest {
  title: string = '';

  description: string = '';

  priority?: TicketModulePriority;

  channel?: TicketModuleChannel;

  entryPoint?: TicketModuleEntryPoint;

  companyId?: string;

  companyContactId?: string;

  externalThreadId?: string;

  contactPhoneSnapshot?: string;

  contactWhatsappSnapshot?: string;

  contactNameSnapshot?: string;

  metadata?: Record<string, unknown>;

  userSelectedCompanyId?: string;

  customerEmail?: string;

  category?: string;

  module?: string;

  environment?: string;

  team?: string;
}
