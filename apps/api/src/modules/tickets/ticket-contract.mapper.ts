import type {
  TicketModuleCompany,
  TicketModuleContact,
  TicketModuleDetailsResponse,
  TicketModuleLinkedCompaniesResponse,
  TicketModuleListResponse,
  TicketModuleMessage,
  TicketModuleMutationResponse,
  TicketModuleRecord,
  TicketModuleUser,
} from '@dosc-syspro/contracts/ticket';

type NullableRecord = Record<string, unknown> | null;

type TicketRecordSource = {
  id: string;
  channel: string;
  status: string;
  priority: string;
  companyId: string | null;
  company?: { id: string; razaoSocial: string; nomeFantasia: string | null } | null;
  companyContactId: string | null;
  companyContact?: { id: string; name: string | null; email?: string | null; whatsapp?: string | null } | null;
  assignedUserId: string | null;
  assignedUser?: { id: string; name: string | null; email: string } | null;
  resolvedByUserId?: string | null;
  resolvedByUser?: { id: string; name: string | null; email: string } | null;
  ticketNumber: string | null;
  subject: string | null;
  resolutionSummary?: string | null;
  resolutionVideoUrl?: string | null;
  releaseType?: string | null;
  releaseTitle?: string | null;
  releaseModule?: string | null;
  publishToReleases?: boolean | null;
  externalThreadId?: string | null;
  metadata?: unknown;
  contactPhoneSnapshot?: string | null;
  contactWhatsappSnapshot?: string | null;
  contactNameSnapshot?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  closedAt: Date | string | null;
  messages?: Array<{
    id: string;
    direction: string;
    type: string;
    body: string | null;
    createdAt: Date | string;
    authorUser?: { id: string; name: string | null; email: string } | null;
    authorContact?: { id: string; name: string | null } | null;
  }>;
};

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function toUser(user?: { id: string; name: string | null; email: string } | null): TicketModuleUser | null | undefined {
  if (user === undefined) return undefined;
  if (user === null) return null;
  return { id: user.id, name: user.name, email: user.email };
}

function toContact(
  contact?: { id: string; name: string | null; email?: string | null; whatsapp?: string | null } | null,
): TicketModuleContact | null | undefined {
  if (contact === undefined) return undefined;
  if (contact === null) return null;
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email ?? null,
    whatsapp: contact.whatsapp ?? null,
  };
}

function toCompany(
  company?: { id: string; razaoSocial: string; nomeFantasia: string | null } | null,
): TicketModuleCompany | null | undefined {
  if (company === undefined) return undefined;
  if (company === null) return null;
  return {
    id: company.id,
    razaoSocial: company.razaoSocial,
    nomeFantasia: company.nomeFantasia,
  };
}

function toMetadata(metadata: unknown): NullableRecord {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  return metadata as NullableRecord;
}

function toMessage(message: NonNullable<TicketRecordSource['messages']>[number]): TicketModuleMessage {
  return {
    id: message.id,
    direction: message.direction as TicketModuleMessage['direction'],
    type: message.type as TicketModuleMessage['type'],
    body: message.body,
    createdAt: toIso(message.createdAt) ?? new Date(0).toISOString(),
    authorUser: toUser(message.authorUser),
    authorContact: message.authorContact
      ? { id: message.authorContact.id, name: message.authorContact.name }
      : message.authorContact,
  };
}

export function serializeTicketRecord(ticket: TicketRecordSource): TicketModuleRecord {
  return {
    id: ticket.id,
    channel: ticket.channel as TicketModuleRecord['channel'],
    status: ticket.status as TicketModuleRecord['status'],
    priority: ticket.priority as TicketModuleRecord['priority'],
    companyId: ticket.companyId,
    company: toCompany(ticket.company),
    companyContactId: ticket.companyContactId,
    companyContact: toContact(ticket.companyContact),
    assignedUserId: ticket.assignedUserId,
    assignedUser: toUser(ticket.assignedUser),
    resolvedByUserId: ticket.resolvedByUserId ?? null,
    resolvedByUser: toUser(ticket.resolvedByUser),
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    resolutionSummary: ticket.resolutionSummary ?? null,
    resolutionVideoUrl: ticket.resolutionVideoUrl ?? null,
    releaseType: ticket.releaseType ?? null,
    releaseTitle: typeof ticket.metadata === 'object' && ticket.metadata && !Array.isArray(ticket.metadata) && typeof (ticket.metadata as Record<string, unknown>).releaseTitle === 'string'
      ? ((ticket.metadata as Record<string, unknown>).releaseTitle as string)
      : null,
    releaseModule: ticket.releaseModule ?? null,
    publishToReleases: Boolean(ticket.publishToReleases),
    externalThreadId: ticket.externalThreadId ?? null,
    metadata: toMetadata(ticket.metadata),
    contactPhoneSnapshot: ticket.contactPhoneSnapshot ?? null,
    contactWhatsappSnapshot: ticket.contactWhatsappSnapshot ?? null,
    contactNameSnapshot: ticket.contactNameSnapshot ?? null,
    createdAt: toIso(ticket.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIso(ticket.updatedAt) ?? new Date(0).toISOString(),
    closedAt: toIso(ticket.closedAt),
    messages: ticket.messages?.map(toMessage),
  };
}

export function serializeMutationResponse(message?: string): TicketModuleMutationResponse {
  return {
    success: true,
    ...(message ? { message } : {}),
  };
}

export function serializeTicketDetailsResponse(ticket: TicketRecordSource): TicketModuleDetailsResponse {
  return {
    success: true,
    data: serializeTicketRecord(ticket),
  };
}

export function serializeTicketListResponse(input: {
  items: TicketRecordSource[];
  page: number;
  pageSize: number;
  total: number;
  requesterUserId?: string;
}): TicketModuleListResponse {
  const { items, page, pageSize, total, requesterUserId } = input;
  const openCount = items.filter((item) => ['NEW', 'UNASSIGNED', 'IN_PROGRESS'].includes(item.status)).length;
  const pendingCount = items.filter((item) => item.status === 'WAITING_CUSTOMER').length;
  const closedCount = items.filter((item) => ['RESOLVED', 'ARCHIVED'].includes(item.status)).length;
  const criticalCount = items.filter((item) => item.priority === 'CRITICAL').length;
  const unassignedCount = items.filter((item) => !item.assignedUserId).length;

  return {
    success: true,
    data: items.map(serializeTicketRecord),
    pagination: {
      page,
      pageSize,
      total,
      hasNextPage: page * pageSize < total,
      hasPreviousPage: page > 1,
    },
    queueCounts: {
      all: total,
      my_queue: requesterUserId ? items.filter((item) => item.assignedUserId === requesterUserId).length : 0,
      unassigned: unassignedCount,
      critical: criticalCount,
      no_response: 0,
    },
    statusCounts: {
      open: openCount,
      pending: pendingCount,
      closed: closedCount,
    },
  };
}

export function serializeLinkedCompaniesResponse(
  companies: Array<{ id: string; name: string }>,
): TicketModuleLinkedCompaniesResponse {
  return {
    success: true,
    data: companies,
  };
}
