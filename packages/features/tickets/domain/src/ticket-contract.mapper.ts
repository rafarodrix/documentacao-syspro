import type {
  TicketModuleCompany,
  TicketModuleContact,
  TicketModuleDetailsResponse,
  TicketModuleLinkedCompaniesResponse,
  TicketModuleMessageAttachment,
  TicketModuleListResponse,
  TicketModuleMessage,
  TicketModuleMutationResponse,
  TicketModuleRecord,
  TicketModuleUser,
} from '@dosc-syspro/contracts/ticket';
import { buildPaginationMeta } from '@dosc-syspro/contracts';
import type { PaginationMeta } from '@dosc-syspro/contracts';
import { readMetadataString } from './ticket-metadata';

type NullableRecord = Record<string, unknown> | null;

export type TicketRecordSource = {
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
  releaseModule?: string | null;
  publishToReleases?: boolean | null;
  externalThreadId?: string | null;
  metadata?: unknown;
  contactPhoneSnapshot?: string | null;
  contactWhatsappSnapshot?: string | null;
  contactNameSnapshot?: string | null;
  slaResponseDueAt?: Date | string | null;
  slaResolutionDueAt?: Date | string | null;
  slaResponseHitAt?: Date | string | null;
  slaResolutionHitAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  closedAt: Date | string | null;
  messages?: Array<{
    id: string;
    conversationId: string;
    direction: string;
    type: string;
    body: string | null;
    createdAt: Date | string;
    attachments?: Array<{
      id: string;
      type: string;
      filename: string;
      mediaMimeType: string;
      fileSize: number;
      checksum: string | null;
      storageBackend: string;
      mediaUrl: string | null;
    }>;
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
  return { id: contact.id, name: contact.name, email: contact.email ?? null, whatsapp: contact.whatsapp ?? null };
}

function toCompany(
  company?: { id: string; razaoSocial: string; nomeFantasia: string | null } | null,
): TicketModuleCompany | null | undefined {
  if (company === undefined) return undefined;
  if (company === null) return null;
  return { id: company.id, razaoSocial: company.razaoSocial, nomeFantasia: company.nomeFantasia };
}

function toMetadata(metadata: unknown): NullableRecord {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  return metadata as NullableRecord;
}

function toAttachment(
  conversationId: string,
  attachment: NonNullable<NonNullable<TicketRecordSource['messages']>[number]['attachments']>[number],
): TicketModuleMessageAttachment {
  return {
    id: attachment.id,
    type: attachment.type as TicketModuleMessageAttachment['type'],
    filename: attachment.filename,
    url: `/api/tickets/${conversationId}/attachments/${attachment.id}`,
    mimeType: attachment.mediaMimeType,
    fileSize: attachment.fileSize,
    checksum: attachment.checksum ?? null,
    storageBackend: attachment.storageBackend as TicketModuleMessageAttachment['storageBackend'],
  };
}

function toMessage(message: NonNullable<TicketRecordSource['messages']>[number]): TicketModuleMessage {
  return {
    id: message.id,
    direction: message.direction as TicketModuleMessage['direction'],
    type: message.type as TicketModuleMessage['type'],
    body: message.body,
    createdAt: toIso(message.createdAt) ?? new Date(0).toISOString(),
    attachments: message.attachments?.map((a) => toAttachment(message.conversationId, a)) ?? [],
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
    releaseTitle: readMetadataString(ticket.metadata, 'releaseTitle'),
    releaseModule: ticket.releaseModule ?? null,
    publishToReleases: Boolean(ticket.publishToReleases),
    externalThreadId: ticket.externalThreadId ?? null,
    metadata: toMetadata(ticket.metadata),
    contactPhoneSnapshot: ticket.contactPhoneSnapshot ?? null,
    contactWhatsappSnapshot: ticket.contactWhatsappSnapshot ?? null,
    contactNameSnapshot: ticket.contactNameSnapshot ?? null,
    slaResponseDueAt: toIso(ticket.slaResponseDueAt),
    slaResolutionDueAt: toIso(ticket.slaResolutionDueAt),
    slaResponseHitAt: toIso(ticket.slaResponseHitAt),
    slaResolutionHitAt: toIso(ticket.slaResolutionHitAt),
    createdAt: toIso(ticket.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIso(ticket.updatedAt) ?? new Date(0).toISOString(),
    closedAt: toIso(ticket.closedAt),
    messages: ticket.messages?.map(toMessage),
  };
}

export function serializeMutationResponse(
  message?: string,
  status?: TicketModuleRecord['status'],
  extra?: Partial<Pick<TicketModuleMutationResponse, 'followUpTaskCreated' | 'followUpTaskId' | 'followUpTaskSkippedReason'>>,
): TicketModuleMutationResponse {
  return {
    success: true,
    ...(message ? { message } : {}),
    ...(status ? { status } : {}),
    ...(extra ?? {}),
  };
}

export function serializeTicketDetailsResponse(
  ticket: TicketRecordSource,
  messagePagination?: PaginationMeta,
): TicketModuleDetailsResponse {
  return {
    success: true,
    data: serializeTicketRecord(ticket),
    ...(messagePagination ? { messagePagination } : {}),
  };
}

export function serializeTicketListResponse(input: {
  items: TicketRecordSource[];
  page: number;
  pageSize: number;
  total: number;
  requesterUserId?: string;
  queueCounts?: TicketModuleListResponse['queueCounts'];
  statusCounts?: TicketModuleListResponse['statusCounts'];
}): TicketModuleListResponse {
  const { items, page, pageSize, total, requesterUserId } = input;
  const criticalCount = items.filter((item) => item.priority === 'CRITICAL').length;
  const unassignedCount = items.filter((item) => !item.assignedUserId).length;
  const noResponseCount = items.filter(
    (item) => !item.slaResponseHitAt && !['RESOLVED', 'ARCHIVED'].includes(item.status),
  ).length;

  return {
    success: true,
    data: items.map(serializeTicketRecord),
    pagination: { ...buildPaginationMeta({ page, pageSize, total }) },
    queueCounts: input.queueCounts ?? {
      all: total,
      my_queue: requesterUserId ? items.filter((item) => item.assignedUserId === requesterUserId).length : 0,
      unassigned: unassignedCount,
      critical: criticalCount,
      no_response: noResponseCount,
    },
    statusCounts: input.statusCounts ?? { open: 0, development: 0, testing: 0, closed: 0 },
  };
}

export function serializeLinkedCompaniesResponse(
  companies: Array<{ id: string; name: string }>,
): TicketModuleLinkedCompaniesResponse {
  return { success: true, data: companies };
}
