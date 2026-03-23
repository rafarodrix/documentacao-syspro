import type {
  ZammadOperationalTicket,
  ZammadTicketAPI,
  ZammadTicketArticle,
  ZammadTicketDetails,
} from "@dosc-syspro/contracts";
import type { Ticket } from "@dosc-syspro/core";

export type ZammadCacheOptions = {
  cacheTtlSeconds?: number;
  tags?: string[];
  routeKey?: string;
};

export interface ZammadGatewayRepository {
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
  getUserTickets(userEmail: string): Promise<Ticket[]>;
  getTicketsForUser(
    email: string,
    options?: {
      stateIds?: number[];
      limit?: number;
      page?: number;
      scope?: "organization-or-email" | "email-only";
      cacheTtlSeconds?: number;
      tags?: string[];
      routeKey?: string;
    }
  ): Promise<ZammadOperationalTicket[]>;
  getTicketsForCustomerEmails(
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
    article: {
      subject: string;
      body: string;
      type: string;
      internal: boolean;
    };
  }): Promise<unknown>;
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
