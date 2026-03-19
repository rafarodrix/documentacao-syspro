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
    createdAt: string;
    updatedAt: string;
}

export interface TicketDetailsItem {
    id: number;
    title: string;
    status: string;
    number: string;
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
