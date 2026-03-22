import { mapTicketPriority } from "@/core/infrastructure/mappers/zammad-ticket.mapper";
import { getTicketStatusGroup } from "@/core/config/tickets-workflow";
import type { TicketListItem } from "@/components/platform/tickets/types";
import type {
    TicketDashboardPriority,
    TicketDashboardStatus,
    TicketKpis,
    TicketSummaryItem,
} from "@/features/tickets/domain/model";

function normalizeDashboardPriority(priority: string): TicketDashboardPriority {
    if (priority === "Alta") return "Alta";
    if (priority === "Baixa") return "Baixa";
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
        priority: normalizeDashboardPriority(mapTicketPriority(ticket.priority)),
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
