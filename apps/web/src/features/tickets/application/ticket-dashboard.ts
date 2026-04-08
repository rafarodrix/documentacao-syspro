import { getTicketStatusGroup } from "@dosc-syspro/core";
import type {
  TicketDashboardPriority,
  TicketDashboardStatus,
  TicketKpis,
  TicketListItem,
  TicketSummaryItem,
} from "@/features/tickets/domain/ticket-model";

function normalizeDashboardPriority(priority: string): TicketDashboardPriority {
  const normalized = String(priority || "").toUpperCase();
  if (normalized === "3" || normalized === "HIGH" || normalized === "CRITICAL" || normalized === "ALTA") return "Alta";
  if (normalized === "1" || normalized === "LOW" || normalized === "BAIXA") return "Baixa";
  return "Média";
}

export function mapDashboardStatus(rawStatus: string, statusLabel?: string): TicketDashboardStatus {
  const group = getTicketStatusGroup(rawStatus || statusLabel || "");
  if (group === "open") return "Aberto";
  if (group === "closed") return "Resolvido";
  return "Em Análise";
}

export function toTicketSummaryItem(ticket: TicketListItem): TicketSummaryItem {
  return {
    id: String(ticket.id),
    number: ticket.number,
    subject: ticket.title,
    status: mapDashboardStatus(ticket.status, ticket.statusLabel),
    priority: normalizeDashboardPriority(String(ticket.priority)),
    lastUpdate: ticket.updatedAt,
  };
}

export function toTicketSummaryItems(tickets: TicketListItem[]): TicketSummaryItem[] {
  return tickets.map(toTicketSummaryItem);
}

export function buildTicketKpis(tickets: TicketSummaryItem[]): TicketKpis {
  return {
    open: tickets.filter((ticket) => ticket.status === "Aberto").length,
    pending: tickets.filter((ticket) => ticket.status === "Pendente" || ticket.status === "Em Análise").length,
    resolved: tickets.filter((ticket) => ticket.status === "Resolvido").length,
  };
}
