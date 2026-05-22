import type {
  TicketModuleDetailsResponse,
  TicketModuleRecord,
} from "@dosc-syspro/contracts/ticket";
import type { PaginationMeta } from "@dosc-syspro/contracts";
import type { TicketArticleItem, TicketDetailsResponse, TicketMessagePagination } from "@/features/tickets/domain/ticket-model";
import { calculateSlaState, mapPriorityToLevel, mapStatusLabel, readMetadataString } from "@dosc-syspro/tickets-domain";
import { formatDateShort, formatDateTime } from "@/lib/date";

function mapTicketMessage(message: NonNullable<TicketModuleRecord["messages"]>[number]): TicketArticleItem {
  return {
    id: message.id,
    from:
      message.authorUser?.email ||
      message.authorUser?.name ||
      message.authorContact?.name ||
      "Sistema",
    body: message.body || "",
    createdAt: formatDateTime(message.createdAt),
    sender: message.direction === "INBOUND" ? "Customer" : "Agent",
    isInternal: message.direction === "INTERNAL",
    messageType: message.type,
    attachments: (message.attachments ?? []).map((attachment) => ({
      id: attachment.id,
      type: attachment.type,
      filename: attachment.filename,
      url: attachment.url ?? null,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      checksum: attachment.checksum ?? null,
      storageBackend: attachment.storageBackend,
    })),
  };
}

function mapMessagePagination(
  pagination: PaginationMeta | undefined,
  loadedCount: number,
): TicketMessagePagination {
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? loadedCount;
  const total = pagination?.total ?? loadedCount;
  return {
    page,
    pageSize,
    total,
    hasNextPage: pagination?.hasNextPage ?? false,
    hasPreviousPage: pagination?.hasPreviousPage ?? false,
    loadedCount: Math.min(total, ((page - 1) * pageSize) + loadedCount),
  };
}

export function mapTicketModuleDetailsResponse(response: TicketModuleDetailsResponse): TicketDetailsResponse {
  if (!response.success || !response.data) {
    return { success: false, error: response.error || "Chamado nao encontrado." };
  }

  const ticket = response.data;
  const sla = calculateSlaState(ticket);
  const articles = (ticket.messages || []).map(mapTicketMessage);

  return {
    success: true,
    ticket: {
      id: ticket.id,
      title: ticket.subject || "Sem assunto",
      status: mapStatusLabel(ticket.status),
      number: ticket.ticketNumber || ticket.id.slice(0, 8).toUpperCase(),
      priority: mapPriorityToLevel(ticket.priority),
      companyId: ticket.companyId,
      companyName: ticket.company?.nomeFantasia || ticket.company?.razaoSocial || null,
      ownerId: ticket.assignedUserId,
      ownerName: ticket.assignedUser?.name || ticket.assignedUser?.email || readMetadataString(ticket.metadata, "currentOwnerName"),
      updatedAt: ticket.updatedAt,
      firstResponseAt: ticket.slaResponseHitAt ?? null,
      resolvedAt: ticket.closedAt,
      slaResponseDueAt: ticket.slaResponseDueAt ?? null,
      slaResolutionDueAt: ticket.slaResolutionDueAt ?? null,
      slaResponseHitAt: ticket.slaResponseHitAt ?? null,
      slaResolutionHitAt: ticket.slaResolutionHitAt ?? null,
      resolvedByName: ticket.resolvedByUser?.name || ticket.resolvedByUser?.email || readMetadataString(ticket.metadata, "resolvedByName"),
      resolutionSummary: ticket.resolutionSummary || null,
      resolutionVideoUrl: ticket.resolutionVideoUrl || null,
      releaseType: ticket.releaseType || null,
      releaseTitle: ticket.releaseTitle || readMetadataString(ticket.metadata, "releaseTitle"),
      releaseModule: ticket.releaseModule || null,
      publishToReleases: Boolean(ticket.publishToReleases),
      ...sla,
      origin: {
        source: readMetadataString(ticket.metadata, "source"),
        externalThreadId: ticket.externalThreadId || null,
        contactName: ticket.contactNameSnapshot || null,
        contactPhone: ticket.contactPhoneSnapshot || null,
        contactWhatsapp: ticket.contactWhatsappSnapshot || null,
        chatwootConversationId: readMetadataString(ticket.metadata, "chatwootConversationId"),
        chatwootContactId: readMetadataString(ticket.metadata, "chatwootContactId"),
        chatwootAccountId: readMetadataString(ticket.metadata, "chatwootAccountId"),
        chatwootConversationUrl: readMetadataString(ticket.metadata, "chatwootConversationUrl"),
      },
      operations: {
        openedByName: readMetadataString(ticket.metadata, "openedByName"),
        openedByEmail: readMetadataString(ticket.metadata, "openedByEmail"),
        openedByRole: readMetadataString(ticket.metadata, "openedByRole"),
        currentTeam: readMetadataString(ticket.metadata, "currentTeam"),
        category: readMetadataString(ticket.metadata, "category"),
        module: readMetadataString(ticket.metadata, "module"),
        databaseUrl: readMetadataString(ticket.metadata, "databaseUrl"),
        developmentVideoUrl: readMetadataString(ticket.metadata, "developmentVideoUrl"),
        supportOwnerUserId: readMetadataString(ticket.metadata, "supportOwnerUserId"),
        supportOwnerName: readMetadataString(ticket.metadata, "supportOwnerName"),
        developmentOwnerUserId: readMetadataString(ticket.metadata, "developmentOwnerUserId"),
        developmentOwnerName: readMetadataString(ticket.metadata, "developmentOwnerName"),
      },
      createdAt: formatDateShort(ticket.createdAt),
    },
    articles,
    messagePagination: mapMessagePagination(response.messagePagination, articles.length),
  };
}
