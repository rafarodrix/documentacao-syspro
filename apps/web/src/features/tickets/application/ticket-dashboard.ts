import type {
  TicketKpis,
  TicketListItem,
  TicketSummaryItem,
} from "@/features/tickets/domain/ticket-model";

export function toTicketSummaryItem(ticket: TicketListItem): TicketSummaryItem {
  return {
    id: String(ticket.id),
    number: ticket.number,
    subject: ticket.title,
    status: ticket.status,
    priority: ticket.priority,
    lastUpdate: ticket.updatedAt,
  };
}

export function toTicketSummaryItems(tickets: TicketListItem[]): TicketSummaryItem[] {
  return tickets.map(toTicketSummaryItem);
}

export function buildTicketKpis(tickets: TicketSummaryItem[]): TicketKpis {
  const resolved = tickets.filter(
    (ticket) => ticket.status === 'RESOLVED' || ticket.status === 'ARCHIVED',
  ).length;
  const pending = tickets.filter(
    (ticket) =>
      ticket.status === 'IN_PROGRESS' ||
      ticket.status === 'TESTING' ||
      ticket.status === 'WAITING_CUSTOMER' ||
      ticket.status === 'WAITING_INTERNAL',
  ).length;
  const open = tickets.filter(
    (ticket) =>
      ticket.status === 'NEW' ||
      ticket.status === 'UNASSIGNED' ||
      ticket.status === 'TRIAGE',
  ).length;

  return { open, pending, resolved };
}
