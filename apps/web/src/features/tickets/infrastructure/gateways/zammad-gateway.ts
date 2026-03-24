import {
  zammadOperationalTicketSchema,
  zammadTicketAPISchema,
  zammadTicketArticleSchema,
  zammadTicketDetailsSchema,
  type ZammadOperationalTicket,
  type ZammadTicketAPI,
  type ZammadTicketArticle,
  type ZammadTicketDetails,
} from "@dosc-syspro/contracts";
import { OPERATIONAL_STATE_IDS } from "@dosc-syspro/core";
import type { ZammadGatewayRepository, ZammadCacheOptions } from "@/features/tickets/domain/repositories/zammad-gateway.repository";
import {
  buildAuthorizationHeader,
  fetchWithRetry,
  fetchZammad,
  getDefaultZammadRouteKey,
  getZammadBaseUrl,
  getZammadToken,
} from "./zammad-http-client";

const ZAMMAD_USER_ID_CACHE_TTL_MS = Number(process.env.ZAMMAD_USER_ID_CACHE_TTL_MS ?? 300000);
const userIdCache = new Map<string, { value: number | null; expiresAt: number }>();

function getUserIdCacheKey(email: string): string {
  return email.trim().toLowerCase();
}

function getCachedUserId(email: string): number | null | undefined {
  const key = getUserIdCacheKey(email);
  const cached = userIdCache.get(key);
  if (!cached) return undefined;
  if (Date.now() > cached.expiresAt) {
    userIdCache.delete(key);
    return undefined;
  }
  return cached.value;
}

function cacheUserId(email: string, value: number | null) {
  const key = getUserIdCacheKey(email);
  userIdCache.set(key, {
    value,
    expiresAt: Date.now() + ZAMMAD_USER_ID_CACHE_TTL_MS,
  });
}

function normalizeSearchResponse(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (typeof data === "object" && data !== null && "assets" in data) {
    const assets = (data as { assets?: { Ticket?: Record<string, unknown> } }).assets;
    if (assets?.Ticket) return Object.values(assets.Ticket);
  }
  if (typeof data === "object" && data !== null && "tickets" in data) {
    const tickets = (data as { tickets?: unknown[] }).tickets;
    if (Array.isArray(tickets)) return tickets;
  }
  return [];
}

function dedupeOperationalTickets(tickets: ZammadOperationalTicket[]): ZammadOperationalTicket[] {
  const byId = new Map<number, ZammadOperationalTicket>();
  for (const ticket of tickets) {
    byId.set(ticket.id, ticket);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

function parseSearchTotal(headers: Headers): number | null {
  const total = headers.get("X-Total-Count");
  if (!total) return null;

  const parsed = Number.parseInt(total, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildStateQuery(stateIds?: number[]): string {
  if (!stateIds?.length) return "";
  return `(${stateIds.map((id) => `state_id:${id}`).join(" OR ")})`;
}

function buildCustomerEmailsQuery(emails: string[]): string {
  return `(${emails.map((email) => `customer.email:${email}`).join(" OR ")})`;
}

function buildCustomerEmailsFallbackQuery(emails: string[]): string {
  return `(${emails
    .map((email) => `(customer.email:${email} OR customer:${email} OR "${email}")`)
    .join(" OR ")})`;
}

export const ZammadGateway: ZammadGatewayRepository = {
  async searchOperationalTicketsPage(
    query: string,
    options?: {
      limit?: number;
      page?: number;
      cacheTtlSeconds?: number;
      tags?: string[];
      routeKey?: string;
    }
  ): Promise<{ tickets: ZammadOperationalTicket[]; total: number | null }> {
    const limit = options?.limit ?? 50;
    const page = Math.max(1, options?.page ?? 1);
    const endpoint = `tickets/search?query=${encodeURIComponent(query)}&expand=true&sort_by=updated_at&order_by=desc&limit=${limit}&page=${page}`;
    const response = await fetchZammad(endpoint, {}, {
      cacheTtlSeconds: options?.cacheTtlSeconds,
      tags: options?.tags,
      routeKey: options?.routeKey,
      includeResponseMeta: true,
    });

    return {
      tickets: normalizeSearchResponse(response.data)
        .map((raw) => zammadOperationalTicketSchema.safeParse(raw))
        .filter((parsed) => parsed.success)
        .map((parsed) => parsed.data),
      total: parseSearchTotal(response.headers),
    };
  },

  async getTicketCount(query: string, routeKey = getDefaultZammadRouteKey()): Promise<number> {
    const baseUrl = getZammadBaseUrl();
    const token = getZammadToken();
    if (!baseUrl || !token) return 0;

    const res = await fetchWithRetry(
      `${baseUrl}/api/v1/tickets/search?query=${encodeURIComponent(query)}&limit=1`,
      { headers: { Authorization: buildAuthorizationHeader(token) } },
      { routeKey, endpoint: `tickets/search?query=${query}&limit=1` }
    );
    const total = res.headers.get("X-Total-Count");
    return total ? parseInt(total, 10) : 0;
  },

  async getUserIdByEmail(email: string, routeKey = getDefaultZammadRouteKey()): Promise<number | null> {
    const cached = getCachedUserId(email);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const data = await fetchZammad(
        `users/search?query=${encodeURIComponent(`email:${email}`)}&limit=1`,
        { cache: "no-store" },
        { routeKey }
      );

      if (!Array.isArray(data) || !data.length) {
        cacheUserId(email, null);
        return null;
      }
      const user = data[0] as { id?: number };
      const userId = typeof user.id === "number" ? user.id : null;
      cacheUserId(email, userId);
      return userId;
    } catch (err) {
      console.error("ZammadGateway.getUserIdByEmail:", err);
      return null;
    }
  },

  async searchTickets(query: string, limit = 100, routeKey = "releases"): Promise<ZammadTicketAPI[]> {
    try {
      const endpoint = `tickets/search?query=${encodeURIComponent(query)}&limit=${limit}&sort_by=updated_at&order_by=desc&expand=true`;
      const data = await fetchZammad(endpoint, { next: { revalidate: 3600, tags: ["releases"] } }, { routeKey });

      let rawTickets: unknown[] = [];
      if ((data as { assets?: { Ticket?: Record<string, unknown> } }).assets?.Ticket) {
        rawTickets = Object.values((data as { assets: { Ticket: Record<string, unknown> } }).assets.Ticket);
      } else if (Array.isArray(data)) {
        rawTickets = data;
      }

      return rawTickets
        .map((ticket) => zammadTicketAPISchema.safeParse(ticket))
        .filter((result) => result.success)
        .map((result) => result.data as ZammadTicketAPI);
    } catch (err) {
      console.error("ZammadGateway.searchTickets:", err);
      return [];
    }
  },

  async getAllTickets(
    limit = 50,
    cacheOptions?: ZammadCacheOptions & { page?: number; stateIds?: number[] }
  ): Promise<ZammadOperationalTicket[]> {
    try {
      const query = buildStateQuery(cacheOptions?.stateIds ?? [...OPERATIONAL_STATE_IDS]) || "state_id:1";
      const result = await this.searchOperationalTicketsPage(query, {
        limit,
        page: Math.max(1, cacheOptions?.page ?? 1),
        cacheTtlSeconds: cacheOptions?.cacheTtlSeconds,
        tags: cacheOptions?.tags,
        routeKey: cacheOptions?.routeKey,
      });
      return result.tickets;
    } catch (err) {
      console.error("ZammadGateway.getAllTickets:", err);
      return [];
    }
  },

  async getTicketsForCustomerEmailsPaged(
    emails: string[],
    options?: {
      stateIds?: number[];
      limit?: number;
      page?: number;
      cacheTtlSeconds?: number;
      tags?: string[];
      routeKey?: string;
    }
  ): Promise<ZammadOperationalTicket[]> {
    const normalizedEmails = Array.from(new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)));
    if (!normalizedEmails.length) return [];

    try {
      const emailQuery = buildCustomerEmailsQuery(normalizedEmails);
      const stateQuery = buildStateQuery(options?.stateIds);
      const query = stateQuery ? `${emailQuery} AND ${stateQuery}` : emailQuery;
      const limit = options?.limit ?? 50;
      const page = Math.max(1, options?.page ?? 1);
      const endpoint = `tickets/search?query=${encodeURIComponent(query)}&expand=true&sort_by=updated_at&order_by=desc&limit=${limit}&page=${page}`;
      const data = await fetchZammad(endpoint, {}, {
        cacheTtlSeconds: options?.cacheTtlSeconds,
        tags: options?.tags,
        routeKey: options?.routeKey,
      });

      const primary = normalizeSearchResponse(data)
        .map((raw) => zammadOperationalTicketSchema.safeParse(raw))
        .filter((parsed) => parsed.success)
        .map((parsed) => parsed.data);

      if (primary.length > 0) {
        return dedupeOperationalTickets(primary);
      }

      const fallbackEmailQuery = buildCustomerEmailsFallbackQuery(normalizedEmails);
      const fallbackQuery = stateQuery ? `${fallbackEmailQuery} AND ${stateQuery}` : fallbackEmailQuery;
      const fallbackEndpoint = `tickets/search?query=${encodeURIComponent(fallbackQuery)}&expand=true&sort_by=updated_at&order_by=desc&limit=${limit}&page=${page}`;
      const fallbackData = await fetchZammad(fallbackEndpoint, {}, {
        cacheTtlSeconds: options?.cacheTtlSeconds,
        tags: options?.tags,
        routeKey: options?.routeKey,
      });

      return dedupeOperationalTickets(
        normalizeSearchResponse(fallbackData)
          .map((raw) => zammadOperationalTicketSchema.safeParse(raw))
          .filter((parsed) => parsed.success)
          .map((parsed) => parsed.data)
      );
    } catch (err) {
      console.error("ZammadGateway.getTicketsForCustomerEmailsPaged:", err);
      return [];
    }
  },

  async canAccessTicketForCustomerEmails(ticketId: string | number, emails: string[]): Promise<boolean> {
    const normalizedEmails = Array.from(new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)));
    if (!normalizedEmails.length) return false;

    try {
      for (const email of normalizedEmails) {
        const query = `(id:${ticketId}) AND customer.email:${email}`;
        const endpoint = `tickets/search?query=${encodeURIComponent(query)}&limit=1&expand=true`;
        const data = await fetchZammad(endpoint, { cache: "no-store" });
        const found = normalizeSearchResponse(data)
          .map((raw) => zammadOperationalTicketSchema.safeParse(raw))
          .some((parsed) => parsed.success && String(parsed.data.id) === String(ticketId));

        if (found) return true;
      }

      return false;
    } catch (err) {
      console.error("ZammadGateway.canAccessTicketForCustomerEmails:", err);
      return false;
    }
  },

  async createTicket(payload) {
    return fetchZammad("tickets", {
      method: "POST",
      body: JSON.stringify(payload),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
  },

  async getTicketById(ticketId: string | number): Promise<ZammadTicketDetails> {
    const data = await fetchZammad(`tickets/${ticketId}`, { cache: "no-store" });
    const parsed = zammadTicketDetailsSchema.safeParse(data);
    if (!parsed.success) throw new Error("Formato de ticket invalido retornado pelo Zammad.");
    return parsed.data;
  },

  async getTicketArticles(ticketId: string | number): Promise<ZammadTicketArticle[]> {
    const data = await fetchZammad(`ticket_articles/by_ticket/${ticketId}`, { cache: "no-store" });
    if (!Array.isArray(data)) return [];

    return data
      .map((article) => zammadTicketArticleSchema.safeParse(article))
      .filter((parsed) => parsed.success)
      .map((parsed) => parsed.data);
  },

  async addTicketReply(ticketId: string | number, body: string): Promise<unknown> {
    return fetchZammad("ticket_articles", {
      method: "POST",
      body: JSON.stringify({
        ticket_id: ticketId,
        body,
        type: "note",
        content_type: "text/html",
        internal: false,
      }),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
  },

  async addInternalTicketNote(ticketId: string | number, body: string): Promise<unknown> {
    return fetchZammad("ticket_articles", {
      method: "POST",
      body: JSON.stringify({
        ticket_id: ticketId,
        body,
        type: "note",
        content_type: "text/html",
        internal: true,
      }),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
  },

  async updateTicket(ticketId: string | number, payload: { owner_id?: number | null; priority_id?: number; state_id?: number; }): Promise<unknown> {
    return fetchZammad(`tickets/${ticketId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
  },
};
