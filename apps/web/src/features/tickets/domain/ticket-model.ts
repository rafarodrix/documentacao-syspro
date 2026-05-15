import type { QueueKey, TicketStatusGroup } from "@dosc-syspro/core";

export interface ActivityPoint {
    label: string;
    value: number;
}

export type TicketPriorityLevel = number;

export interface TicketListItem {
    id: string | number;
    number: string;
    title: string;
    group: string;
    status: string;
    statusLabel: string;
    priority: TicketPriorityLevel;
    customer: string;
    companyName: string | null;
    contactName: string | null;
    team?: "SUPORTE" | "DESENVOLVIMENTO" | null;
    module?: string | null;
    category?: string | null;
    resolvedByName?: string | null;
    ownerId?: string | number | null;
    firstResponseAt?: string | null;
    resolvedAt?: string | null;
    slaResponseDueAt?: string | null;
    slaResolutionDueAt?: string | null;
    slaResponseHitAt?: string | null;
    slaResolutionHitAt?: string | null;
    slaBreached?: boolean;
    slaWarning?: boolean;
    slaPaused?: boolean;
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

export type ClosedTicketsWindow = "30d" | "60d" | "90d" | "180d" | "365d" | "all";
export type TicketTeamFilter = "all" | "SUPORTE" | "DESENVOLVIMENTO";
export type TicketSortBy = "updatedAt" | "subject" | "customer";
export type TicketSortOrder = "asc" | "desc";

export interface TicketStatusCounts {
    open: number;
    development: number;
    testing: number;
    closed: number;
}

export interface TicketQueryParams {
    page?: number;
    pageSize?: number;
    queue?: QueueKey;
    search?: string;
    statusGroup?: TicketStatusGroup | "all";
    team?: Exclude<TicketTeamFilter, "all">;
    closedWindow?: ClosedTicketsWindow;
    category?: string;
    module?: string;
    sortBy?: TicketSortBy;
    sortOrder?: TicketSortOrder;
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
    id: string | number;
    title: string;
    status: string;
    number: string;
    priority: number;
    companyId?: string | null;
    companyName?: string | null;
    ownerId?: string | number | null;
    ownerName?: string | null;
    updatedAt?: string | null;
    firstResponseAt?: string | null;
    resolvedAt?: string | null;
    slaResponseDueAt?: string | null;
    slaResolutionDueAt?: string | null;
    slaResponseHitAt?: string | null;
    slaResolutionHitAt?: string | null;
    resolvedByName?: string | null;
    resolutionSummary?: string | null;
    resolutionVideoUrl?: string | null;
    releaseType?: string | null;
    releaseTitle?: string | null;
    releaseModule?: string | null;
    publishToReleases?: boolean;
    slaBreached?: boolean;
    slaWarning?: boolean;
    slaPaused?: boolean;
    minutesToBreach?: number;
    origin?: {
        source?: string | null;
        externalThreadId?: string | null;
        contactName?: string | null;
        contactPhone?: string | null;
        contactWhatsapp?: string | null;
        chatwootConversationId?: string | null;
        chatwootContactId?: string | null;
        chatwootAccountId?: string | null;
        chatwootConversationUrl?: string | null;
    } | null;
    operations?: {
        openedByName?: string | null;
        openedByEmail?: string | null;
        openedByRole?: string | null;
        currentTeam?: string | null;
        category?: string | null;
        module?: string | null;
        databaseUrl?: string | null;
        developmentVideoUrl?: string | null;
        supportOwnerUserId?: string | null;
        supportOwnerName?: string | null;
        developmentOwnerUserId?: string | null;
        developmentOwnerName?: string | null;
    } | null;
    createdAt: string;
}

export interface TicketArticleItem {
    id: string | number;
    from: string;
    body: string;
    createdAt: string;
    sender: string;
    isInternal: boolean;
    messageType?: string | null;
    attachments?: TicketArticleAttachment[];
}

export interface TicketArticleAttachment {
    id: string;
    type: string;
    filename: string;
    url?: string | null;
    mimeType: string;
    fileSize: number;
    checksum?: string | null;
    storageBackend: "DATABASE" | "R2";
}

export interface TicketMessagePagination {
    page: number;
    pageSize: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    total: number;
    loadedCount: number;
}

export type TicketDetailsResponse =
    | {
        success: true;
        ticket: TicketDetailsItem;
        articles: TicketArticleItem[];
        messagePagination: TicketMessagePagination;
      }
    | TicketActionFailure;

export type TicketMutationSuccess<T = void> = T extends void
    ? { success: true; message?: string; status?: string }
    : { success: true; message?: string; status?: string; data: T };

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
    ticketWarning?: string;
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
    ticketWarning?: string;
    companyName: string;
    companyUsers: number;
    companyCount: number;
    companyNames: string[];
    tickets: TicketSummaryItem[];
    totalOpen: number;
    kpis: TicketKpis;
    activity: ActivityPoint[];
}
