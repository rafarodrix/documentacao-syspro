import type {
  TicketModuleDetailsResponse,
  TicketModulePriority,
  TicketModuleRecord,
} from "@dosc-syspro/contracts/ticket";
import type { PaginationMeta } from "@dosc-syspro/contracts";
import type { TicketArticleItem, TicketDetailsResponse, TicketMessagePagination } from "@/features/tickets/domain/ticket-model";
import { formatDateShort, formatDateTime } from "@/lib/date";

function mapPriorityToLevel(priority: TicketModulePriority | string | null | undefined): number {
  if (priority === "LOW") return 1;
  if (priority === "HIGH" || priority === "CRITICAL") return 3;
  return 2;
}

function mapStatusLabel(status: TicketModuleRecord["status"] | string): string {
  switch (status) {
    case "NEW":
      return "Novo";
    case "UNASSIGNED":
      return "Sem dono";
    case "TRIAGE":
      return "Em analise";
    case "IN_PROGRESS":
      return "Em desenvolvimento";
    case "WAITING_CUSTOMER":
      return "Em analise";
    case "WAITING_INTERNAL":
      return "Em analise";
    case "TESTING":
      return "Em testes";
    case "RESOLVED":
      return "Resolvido";
    case "ARCHIVED":
      return "Arquivado";
    default:
      return status;
  }
}

function calculateSlaState(ticket: Pick<TicketModuleRecord, "slaResponseDueAt" | "slaResolutionDueAt" | "slaResponseHitAt" | "slaResolutionHitAt" | "closedAt" | "status">) {
  const now = Date.now();
  const slaPaused = ["WAITING_CUSTOMER", "RESOLVED", "ARCHIVED"].includes(ticket.status);
  if (slaPaused) {
    return { slaBreached: false, slaWarning: false, minutesToBreach: undefined, slaPaused: true };
  }

  const responseDue = ticket.slaResponseDueAt ? Date.parse(ticket.slaResponseDueAt) : Number.NaN;
  const resolutionDue = ticket.slaResolutionDueAt ? Date.parse(ticket.slaResolutionDueAt) : Number.NaN;
  const activeDueDates = [
    !ticket.slaResponseHitAt && Number.isFinite(responseDue) ? responseDue : null,
    !ticket.slaResolutionHitAt && !ticket.closedAt && Number.isFinite(resolutionDue) ? resolutionDue : null,
  ].filter((value): value is number => typeof value === "number");

  if (activeDueDates.length === 0) {
    return { slaBreached: false, slaWarning: false, minutesToBreach: undefined, slaPaused: false };
  }

  const nextDue = Math.min(...activeDueDates);
  const minutesToBreach = Math.ceil((nextDue - now) / 60_000);

  return {
    slaBreached: minutesToBreach <= 0,
    slaWarning: minutesToBreach > 0 && minutesToBreach <= 60,
    minutesToBreach,
    slaPaused: false,
  };
}

function readStringMetadata(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNullableMetadata(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = metadata?.[key];
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

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
      ownerName: ticket.assignedUser?.name || ticket.assignedUser?.email || readStringMetadata(ticket.metadata, "currentOwnerName"),
      updatedAt: ticket.updatedAt,
      firstResponseAt: ticket.slaResponseHitAt ?? null,
      resolvedAt: ticket.closedAt,
      slaResponseDueAt: ticket.slaResponseDueAt ?? null,
      slaResolutionDueAt: ticket.slaResolutionDueAt ?? null,
      slaResponseHitAt: ticket.slaResponseHitAt ?? null,
      slaResolutionHitAt: ticket.slaResolutionHitAt ?? null,
      resolvedByName: ticket.resolvedByUser?.name || ticket.resolvedByUser?.email || readStringMetadata(ticket.metadata, "resolvedByName"),
      resolutionSummary: ticket.resolutionSummary || null,
      resolutionVideoUrl: ticket.resolutionVideoUrl || null,
      releaseType: ticket.releaseType || null,
      releaseTitle: ticket.releaseTitle || readStringMetadata(ticket.metadata, "releaseTitle"),
      releaseModule: ticket.releaseModule || null,
      publishToReleases: Boolean(ticket.publishToReleases),
      ...sla,
      origin: {
        source: readStringMetadata(ticket.metadata, "source"),
        externalThreadId: ticket.externalThreadId || null,
        contactName: ticket.contactNameSnapshot || null,
        contactPhone: ticket.contactPhoneSnapshot || null,
        contactWhatsapp: ticket.contactWhatsappSnapshot || null,
        chatwootConversationId: readStringMetadata(ticket.metadata, "chatwootConversationId"),
        chatwootContactId: readStringMetadata(ticket.metadata, "chatwootContactId"),
        chatwootAccountId: readStringMetadata(ticket.metadata, "chatwootAccountId"),
        chatwootConversationUrl: readStringMetadata(ticket.metadata, "chatwootConversationUrl"),
      },
      operations: {
        openedByName: readNullableMetadata(ticket.metadata, "openedByName"),
        openedByEmail: readNullableMetadata(ticket.metadata, "openedByEmail"),
        openedByRole: readNullableMetadata(ticket.metadata, "openedByRole"),
        currentTeam: readNullableMetadata(ticket.metadata, "currentTeam"),
        category: readNullableMetadata(ticket.metadata, "category"),
        module: readNullableMetadata(ticket.metadata, "module"),
        databaseUrl: readNullableMetadata(ticket.metadata, "databaseUrl"),
        developmentVideoUrl: readNullableMetadata(ticket.metadata, "developmentVideoUrl"),
        supportOwnerUserId: readNullableMetadata(ticket.metadata, "supportOwnerUserId"),
        supportOwnerName: readNullableMetadata(ticket.metadata, "supportOwnerName"),
        developmentOwnerUserId: readNullableMetadata(ticket.metadata, "developmentOwnerUserId"),
        developmentOwnerName: readNullableMetadata(ticket.metadata, "developmentOwnerName"),
      },
      createdAt: formatDateShort(ticket.createdAt),
    },
    articles,
    messagePagination: mapMessagePagination(response.messagePagination, articles.length),
  };
}
