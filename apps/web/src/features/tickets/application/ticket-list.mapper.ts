import type { TicketModulePriority, TicketModuleRecord } from "@dosc-syspro/contracts/ticket";
import type { TicketListItem } from "@/features/tickets/domain/ticket-model";

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
      return "Triagem";
    case "IN_PROGRESS":
      return "Em andamento";
    case "WAITING_CUSTOMER":
      return "Pendente cliente";
    case "WAITING_INTERNAL":
      return "Aguardando interno";
    case "TESTING":
      return "Em teste";
    case "RESOLVED":
      return "Resolvido";
    case "ARCHIVED":
      return "Arquivado";
    default:
      return status;
  }
}

function calculateSlaState(
  ticket: Pick<
    TicketModuleRecord,
    "slaResponseDueAt" | "slaResolutionDueAt" | "slaResponseHitAt" | "slaResolutionHitAt" | "closedAt" | "status"
  >,
) {
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

function readNullableMetadata(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = metadata?.[key];
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

export function toTicketListItem(ticket: TicketModuleRecord): TicketListItem {
  const companyName = ticket.company?.nomeFantasia || ticket.company?.razaoSocial || null;
  const moduleName = readNullableMetadata(ticket.metadata, "module");
  const categoryName = readNullableMetadata(ticket.metadata, "category");
  const team = readNullableMetadata(ticket.metadata, "currentTeam");
  const customerName = ticket.companyContact?.name || ticket.companyContact?.email || companyName || "Cliente";

  const sla = calculateSlaState(ticket);

  return {
    id: ticket.id,
    number: ticket.ticketNumber || ticket.id.slice(0, 8).toUpperCase(),
    title: ticket.subject || "Sem assunto",
    group: moduleName || categoryName || ticket.channel,
    status: ticket.status,
    statusLabel: mapStatusLabel(ticket.status),
    priority: mapPriorityToLevel(ticket.priority),
    customer: customerName,
    team: team === "SUPORTE" || team === "DESENVOLVIMENTO" ? team : null,
    module: moduleName,
    category: categoryName,
    resolvedByName: readNullableMetadata(ticket.metadata, "resolvedByName"),
    ownerId: ticket.assignedUserId,
    firstResponseAt: ticket.slaResponseHitAt ?? null,
    resolvedAt: ticket.closedAt,
    slaResponseDueAt: ticket.slaResponseDueAt ?? null,
    slaResolutionDueAt: ticket.slaResolutionDueAt ?? null,
    slaResponseHitAt: ticket.slaResponseHitAt ?? null,
    slaResolutionHitAt: ticket.slaResolutionHitAt ?? null,
    ...sla,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

export function toTicketListItems(tickets: TicketModuleRecord[]): TicketListItem[] {
  return tickets.map(toTicketListItem);
}
