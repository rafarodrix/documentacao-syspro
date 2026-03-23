import type {
  ZammadOperationalTicket,
  ZammadTicketAPI,
  ZammadTicketArticle,
  ZammadTicketDetails,
} from "@/core/application/schema/zammad-api.schema";

export type ZammadCacheOptions = {
  cacheTtlSeconds?: number;
  tags?: string[];
  routeKey?: string;
};

export interface IZammadGateway {
  searchOperationalTickets(
    query: string,
    options?: {
      limit?: number;
      page?: number;
      cacheTtlSeconds?: number;
      tags?: string[];
      routeKey?: string;
    }
  ): Promise<ZammadOperationalTicket[]>;
  getTicketCount(query: string, routeKey?: string): Promise<number>;
  getUserIdByEmail(email: string, routeKey?: string): Promise<number | null>;
  searchTickets(query: string, limit?: number, routeKey?: string): Promise<ZammadTicketAPI[]>;
  getAllTickets(
    limit?: number,
    cacheOptions?: ZammadCacheOptions & { page?: number; stateIds?: number[] }
  ): Promise<ZammadOperationalTicket[]>;
  getTicketById(ticketId: string | number): Promise<ZammadTicketDetails>;
  getTicketArticles(ticketId: string | number): Promise<ZammadTicketArticle[]>;
  addTicketReply(ticketId: string | number, body: string): Promise<unknown>;
  updateTicket(
    ticketId: string | number,
    payload: {
      owner_id?: number | null;
      priority_id?: number;
      state_id?: number;
    }
  ): Promise<unknown>;
}
