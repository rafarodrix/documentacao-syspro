import { computeTicketSla } from "@dosc-syspro/core";
import { mapTicketStateLabel } from "@/features/tickets/infrastructure/mappers/zammad-ticket.mapper";
import type { ZammadOperationalTicket } from "@dosc-syspro/contracts";
import type { TicketListItem, TicketsPagination } from "@/components/platform/tickets/types";
import type { listCachedTickets } from "@/features/tickets/infrastructure/cache/zammad-ticket-cache";

export function formatTickets(ticketsRaw: ZammadOperationalTicket[]): TicketListItem[] {
  const formattedTickets: TicketListItem[] = ticketsRaw.map((ticket) => ({
    ...(() => {
      const sla = computeTicketSla({
        createdAt: new Date(ticket.created_at),
        firstResponseAt: ticket.first_response_at ? new Date(ticket.first_response_at) : null,
        resolvedAt: ticket.close_at ? new Date(ticket.close_at) : null,
        priorityId: ticket.priority_id ?? null,
      });
      return {
        slaBreached: sla.breached,
        slaWarning: sla.warning,
        minutesToBreach: sla.minutesToBreach,
      };
    })(),
    id: ticket.id,
    number: ticket.number,
    title: ticket.title,
    group: ticket.group || "Sem grupo",
    status: ticket.state || "",
    statusLabel: mapTicketStateLabel(ticket.state || ""),
    priority: ticket.priority_id ?? 2,
    customer: String(ticket.customer || "Cliente"),
    ownerId: ticket.owner_id ?? null,
    firstResponseAt: ticket.first_response_at ?? null,
    resolvedAt: ticket.close_at ?? null,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
  }));

  formattedTickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return formattedTickets;
}

export function formatCachedTickets(rows: Awaited<ReturnType<typeof listCachedTickets>>["rows"]): TicketListItem[] {
  return rows.map((row) => ({
    ...(() => {
      const sla = computeTicketSla({
        createdAt: row.createdAtZammad,
        firstResponseAt: row.firstResponseAt,
        resolvedAt: row.resolvedAt,
        priorityId: row.priorityId,
      });
      return {
        slaBreached: sla.breached,
        slaWarning: sla.warning,
        minutesToBreach: sla.minutesToBreach,
      };
    })(),
    id: row.zammadTicketId,
    number: row.number,
    title: row.title,
    group: row.groupName || "Sem grupo",
    status: row.state || "",
    statusLabel: mapTicketStateLabel(row.state || ""),
    priority: row.priorityId ?? 2,
    customer: row.customer || "Cliente",
    ownerId: row.ownerId ?? null,
    firstResponseAt: row.firstResponseAt?.toISOString() ?? null,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    createdAt: row.createdAtZammad.toISOString(),
    updatedAt: row.updatedAtZammad.toISOString(),
  }));
}

export function buildPagination(page: number, pageSize: number, total: number | null, currentCount: number): TicketsPagination {
  const hasPreviousPage = page > 1;
  const hasNextPage = total !== null ? page * pageSize < total : currentCount >= pageSize;

  return {
    page,
    pageSize,
    hasPreviousPage,
    hasNextPage,
    total,
  };
}