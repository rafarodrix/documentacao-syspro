import type { TicketStatusGroup } from "@/core/config/tickets-workflow";
import type {
    TicketListItem,
    TicketDetailsItem,
    TicketArticleItem,
    TicketPriorityLevel,
    TicketQueryParams,
    TicketsDataResponse,
    TicketsPagination,
    TicketStatusCounts,
} from "@/components/platform/tickets/types";

export type TicketDashboardStatus = "Aberto" | "Em Análise" | "Pendente" | "Resolvido";
export type TicketDashboardPriority = "Alta" | "Média" | "Baixa";

export interface TicketSummaryItem {
    id: string;
    number: string;
    subject: string;
    status: TicketDashboardStatus;
    priority: TicketDashboardPriority;
    lastUpdate: string;
}

export interface TicketKpis {
    open: number;
    pending: number;
    resolved: number;
}

export type {
    TicketListItem,
    TicketDetailsItem,
    TicketArticleItem,
    TicketPriorityLevel,
    TicketQueryParams,
    TicketsDataResponse,
    TicketsPagination,
    TicketStatusCounts,
    TicketStatusGroup,
};
