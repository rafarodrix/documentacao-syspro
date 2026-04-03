import type {
  ZammadOperationalTicket,
  ZammadTicketAPI,
  ZammadTicketArticle,
  ZammadTicketDetails,
} from "@dosc-syspro/contracts";

export type ZammadCatalogGroup = { id: number; name: string };
export type ZammadCatalogState = { id: number; name: string };
export type ZammadCatalogPriority = { id: number; name: string };
export type ZammadCatalogOwner = { id: number; name: string; email: string | null };
export type ZammadGlobalCatalogPayload = {
  fetchedAt: string;
  groups: ZammadCatalogGroup[];
  states: ZammadCatalogState[];
  priorities: ZammadCatalogPriority[];
  owners: ZammadCatalogOwner[];
  articleTypes: Array<"note" | "phone" | "email">;
};

export type ZammadCacheOptions = {
  cacheTtlSeconds?: number;
  tags?: string[];
  routeKey?: string;
};

export interface ZammadGatewayRepository {
  getGlobalCatalog(routeKey?: string): Promise<ZammadGlobalCatalogPayload>;
  searchOperationalTicketsPage(
    query: string,
    options?: {
      limit?: number;
      page?: number;
      cacheTtlSeconds?: number;
      tags?: string[];
      routeKey?: string;
    }
  ): Promise<{ tickets: ZammadOperationalTicket[]; total: number | null }>;
  getTicketCount(query: string, routeKey?: string): Promise<number>;
  getUserIdByEmail(email: string, routeKey?: string): Promise<number | null>;
  searchTickets(query: string, limit?: number, routeKey?: string): Promise<ZammadTicketAPI[]>;
  getAllTickets(
    limit?: number,
    cacheOptions?: ZammadCacheOptions & { page?: number; stateIds?: number[] }
  ): Promise<ZammadOperationalTicket[]>;
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
  ): Promise<ZammadOperationalTicket[]>;
  getTicketById(ticketId: string | number): Promise<ZammadTicketDetails>;
  getTicketArticles(ticketId: string | number): Promise<ZammadTicketArticle[]>;
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
  addTicketReply(ticketId: string | number, body: string): Promise<unknown>;
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
