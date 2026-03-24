import type { QueueKey, TicketStatusGroup } from "@dosc-syspro/core";
import type { ActivityPoint } from "@/components/platform/app/dashboard/ActivityChart";

export type TicketPriorityLevel = number;

export interface TicketListItem {
    id: number;
    number: string;
    title: string;
    group: string;
    status: string;
    statusLabel: string;
    priority: TicketPriorityLevel;
    customer: string;
    ownerId?: number | null;
    firstResponseAt?: string | null;
    resolvedAt?: string | null;
    slaBreached?: boolean;
    slaWarning?: boolean;
    minutesToBreach?: number;
    createdAt: string;
    updatedAt: string;
}

export interface TicketsPagination {
    page: number;
    pageSize: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    total: number | null;
}

export interface TicketStatusCounts {
    open: number;
    pending: number;
    closed: number;
}

export interface TicketQueryParams {
    page?: number;
    pageSize?: number;
    queue?: QueueKey;
    search?: string;
    statusGroup?: TicketStatusGroup | "all";
}

export type TicketActionFailure = {
    success: false;
    error: string;
};

export type TicketsDataSuccess = {
    success: true;
    data: TicketListItem[];
    pagination: TicketsPagination;
    staleWarning?: string;
    queueCounts: Record<QueueKey, number>;
    statusCounts: TicketStatusCounts;
};

export type TicketsDataFailure = TicketActionFailure & {
    data: TicketListItem[];
    pagination: TicketsPagination;
    queueCounts: Record<QueueKey, number>;
    statusCounts: TicketStatusCounts;
    staleWarning?: string;
};

export type TicketsDataResponse = TicketsDataSuccess | TicketsDataFailure;

export interface TicketDetailsItem {
    id: number;
    title: string;
    status: string;
    number: string;
    priority: number;
    ownerId?: number | null;
    updatedAt?: string | null;
    firstResponseAt?: string | null;
    resolvedAt?: string | null;
    slaBreached?: boolean;
    slaWarning?: boolean;
    minutesToBreach?: number;
    createdAt: string;
}

export interface TicketArticleItem {
    id: number;
    from: string;
    body: string;
    createdAt: string;
    sender: string;
    isInternal: boolean;
}

export type TicketDetailsResponse =
    | {
        success: true;
        ticket: TicketDetailsItem;
        articles: TicketArticleItem[];
      }
    | TicketActionFailure;

export type TicketMutationSuccess<T = void> = T extends void
    ? { success: true; message?: string }
    : { success: true; message?: string; data: T };

export type TicketMutationResponse<T = void> = TicketMutationSuccess<T> | TicketActionFailure;

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

export interface TicketDashboardCompanySummary {
    id: string;
    razaoSocial: string;
    nomeFantasia: string | null;
    cnpj: string;
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING_DOCS";
    createdAt: Date;
    _count: { memberships: number };
    cidade: string | null;
    estado: string | null;
}

export interface AdminDashboardViewData {
    mode: "admin";
    zammadWarning?: string;
    companiesCount: number;
    companiesGrowth: number;
    usersCount: number;
    activeUsersCount: number;
    companies: TicketDashboardCompanySummary[];
    sefazNfe: { uf: string; service: "NFE"; status: "ONLINE" | "UNSTABLE" | "OFFLINE"; latency: number };
    sefazNfce: { uf: string; service: "NFCE"; status: "ONLINE" | "UNSTABLE" | "OFFLINE"; latency: number };
    tickets: TicketSummaryItem[];
    totalOpen: number;
    activity: ActivityPoint[];
}

export interface ClientDashboardViewData {
    mode: "client";
    zammadWarning?: string;
    companyName: string;
    companyUsers: number;
    companyCount: number;
    companyNames: string[];
    tickets: TicketSummaryItem[];
    totalOpen: number;
    kpis: TicketKpis;
    activity: ActivityPoint[];
}
