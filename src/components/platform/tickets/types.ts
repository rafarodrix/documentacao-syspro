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
