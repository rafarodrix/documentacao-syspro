import type { TicketModuleRecord } from "@dosc-syspro/contracts/ticket";
import { calculateSlaState, mapPriorityToLevel, mapStatusLabel, readMetadataString } from "@dosc-syspro/tickets-domain";
import type { TicketListItem } from "@/features/tickets/domain/ticket-model";

export function toTicketListItem(ticket: TicketModuleRecord): TicketListItem {
  const companyName = ticket.company?.nomeFantasia || ticket.company?.razaoSocial || null;
  const moduleName = readMetadataString(ticket.metadata, "module");
  const categoryName = readMetadataString(ticket.metadata, "category");
  const team = readMetadataString(ticket.metadata, "currentTeam");
  const contactName = ticket.companyContact?.name || ticket.companyContact?.email || null;
  const customerName = contactName || companyName || "Cliente";

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
    companyName,
    contactName,
    team: team === "SUPORTE" || team === "DESENVOLVIMENTO" ? team : null,
    module: moduleName,
    category: categoryName,
    resolvedByName: readMetadataString(ticket.metadata, "resolvedByName"),
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
