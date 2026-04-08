import type {
  OperationalTicket,
  TicketApi,
  TicketArticle,
  TicketDetails,
  TicketGlobalCatalog,
  TicketUser,
} from "@dosc-syspro/contracts";

export type TicketRequestOptions = {
  cacheTtlSeconds?: number;
  tags?: string[];
  routeKey?: string;
};

export interface TicketGatewayRepository {
  getGlobalCatalog(routeKey?: string): Promise<TicketGlobalCatalog>;
  searchOperationalTicketsPage(
    query: string,
    options?: {
      limit?: number;
      page?: number;
      cacheTtlSeconds?: number;
      tags?: string[];
      routeKey?: string;
    }
  ): Promise<{ tickets: OperationalTicket[]; total: number | null }>;
  getTicketCount(query: string, routeKey?: string): Promise<number>;
  getUserIdByEmail(email: string, routeKey?: string): Promise<number | null>;
  getUserByEmail(email: string, routeKey?: string): Promise<TicketUser | null>;
  searchTickets(query: string, limit?: number, routeKey?: string): Promise<TicketApi[]>;
  getAllTickets(
    limit?: number,
    requestOptions?: TicketRequestOptions & { page?: number; stateIds?: number[] }
  ): Promise<OperationalTicket[]>;
  getTicketsForCustomerEmailsPaged(
    emails: string[],
    options?: {
      stateIds?: number[];
      limit?: number;
      page?: number;
      cacheTtlSeconds?: number;
      tags?: string[];
      routeKey?: string;
    }
  ): Promise<OperationalTicket[]>;
  getTicketById(ticketId: string | number): Promise<TicketDetails>;
  getTicketArticles(ticketId: string | number): Promise<TicketArticle[]>;
  canAccessTicketForCustomerEmails(ticketId: string | number, emails: string[]): Promise<boolean>;
  createTicket(payload: {
    title: string;
    group: string;
    customer: string;
    priority_id: number;
    state_id?: number;
    owner_id?: number | null;
    article: {
      subject: string;
      body: string;
      type: string;
      internal: boolean;
    };
  }): Promise<unknown>;
  addTicketReply(
    ticketId: string | number,
    body: string,
    attachments?: { filename: string; data: string; "mime-type": string }[]
  ): Promise<unknown>;
  addInternalTicketNote(ticketId: string | number, body: string): Promise<unknown>;
  updateTicket(
    ticketId: string | number,
    payload: {
      owner_id?: number | null;
      priority_id?: number;
      state_id?: number;
    }
  ): Promise<unknown>;
}
