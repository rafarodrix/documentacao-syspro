import {
  operationalTicketSchema,
  ticketApiSchema,
  ticketArticleSchema,
  ticketDetailsSchema,
  ticketUserSchema,
  type OperationalTicket,
  type TicketApi,
  type TicketArticle,
  type TicketDetails,
  type TicketUser,
} from "@dosc-syspro/contracts/ticket-api";
import {
  type TicketCatalogGroup,
  type TicketCatalogState,
  type TicketCatalogPriority,
  type TicketCatalogOwner,
  type TicketGlobalCatalog,
} from "@dosc-syspro/contracts/ticket-global-settings";
import { OPERATIONAL_STATE_IDS } from "@dosc-syspro/core";
import type {
  TicketGatewayRepository,
  TicketRequestOptions,
} from "@/features/tickets/domain/repositories/ticket-gateway.repository";
import {
  buildAuthorizationHeader,
  fetchWithRetry,
  fetchTicketApi,
  getDefaultTicketRouteKey,
  getTicketBaseUrl,
  getTicketToken,
} from "./ticket-http-client";

const TICKET_USER_ID_CACHE_TTL_MS = Number(process.env.TICKET_USER_ID_CACHE_TTL_MS ?? 300000);
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
    expiresAt: Date.now() + TICKET_USER_ID_CACHE_TTL_MS,
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

function dedupeOperationalTickets(tickets: OperationalTicket[]): OperationalTicket[] {
  const byId = new Map<number, OperationalTicket>();
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

function normalizeCatalogGroups(data: unknown): TicketCatalogGroup[] {
  if (!Array.isArray(data)) return [];
  const groups = data
    .map((item) => {
      const row = item as Record<string, unknown>;
      const id = typeof row.id === "number" ? row.id : Number(row.id);
      const name = typeof row.name === "string" ? row.name.trim() : "";
      if (!Number.isFinite(id) || id < 1 || !name) return null;
      return { id, name };
    })
    .filter((row): row is TicketCatalogGroup => Boolean(row));
  return groups.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function normalizeCatalogStates(data: unknown): TicketCatalogState[] {
  if (!Array.isArray(data)) return [];
  const states = data
    .map((item) => {
      const row = item as Record<string, unknown>;
      const id = typeof row.id === "number" ? row.id : Number(row.id);
      const name = typeof row.name === "string" ? row.name.trim() : "";
      if (!Number.isFinite(id) || id < 1 || !name) return null;
      return { id, name };
    })
    .filter((row): row is TicketCatalogState => Boolean(row));
  return states.sort((a, b) => a.id - b.id);
}

function normalizeCatalogPriorities(data: unknown): TicketCatalogPriority[] {
  if (!Array.isArray(data)) return [];
  const priorities = data
    .map((item) => {
      const row = item as Record<string, unknown>;
      const id = typeof row.id === "number" ? row.id : Number(row.id);
      const name = typeof row.name === "string" ? row.name.trim() : "";
      if (!Number.isFinite(id) || id < 1 || !name) return null;
      return { id, name };
    })
    .filter((row): row is TicketCatalogPriority => Boolean(row));
  return priorities.sort((a, b) => a.id - b.id);
}

function normalizeCatalogOwners(data: unknown): TicketCatalogOwner[] {
  if (!Array.isArray(data)) return [];

  const owners = data
    .map((item) => {
      const row = item as Record<string, unknown>;
      const id = typeof row.id === "number" ? row.id : Number(row.id);
      const firstname = typeof row.firstname === "string" ? row.firstname.trim() : "";
      const lastname = typeof row.lastname === "string" ? row.lastname.trim() : "";
      const fullname = typeof row.fullname === "string" ? row.fullname.trim() : "";
      const name = fullname || `${firstname} ${lastname}`.trim();
      const email = typeof row.email === "string" && row.email.trim() ? row.email.trim().toLowerCase() : null;
      const active = row.active === undefined ? true : Boolean(row.active);
      if (!active || !Number.isFinite(id) || id < 1 || !name) return null;
      return { id, name, email };
    })
    .filter(
      (row): row is { id: number; name: string; email: string | null } =>
        row !== null
    );

  const deduped = new Map<number, TicketCatalogOwner>();
  for (const owner of owners) {
    deduped.set(owner.id, owner);
  }
  return Array.from(deduped.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
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

export const TicketGateway: TicketGatewayRepository = {
  async getGlobalCatalog(routeKey = "app-configuracoes-tickets"): Promise<TicketGlobalCatalog> {
    const [groupsRaw, statesRaw, prioritiesRaw, ownersRaw] = await Promise.all([
      fetchTicketApi("groups?per_page=200", { cache: "no-store" }, { routeKey }),
      fetchTicketApi("ticket_states?per_page=200", { cache: "no-store" }, { routeKey }),
      fetchTicketApi("ticket_priorities?per_page=50", { cache: "no-store" }, { routeKey }),
      fetchTicketApi("users?per_page=200", { cache: "no-store" }, { routeKey }),
    ]);

    return {
      fetchedAt: new Date().toISOString(),
      groups: normalizeCatalogGroups(groupsRaw),
      states: normalizeCatalogStates(statesRaw),
      priorities: normalizeCatalogPriorities(prioritiesRaw),
      owners: normalizeCatalogOwners(ownersRaw),
      articleTypes: ["note", "phone", "email"],
    };
  },

  async searchOperationalTicketsPage(
    query: string,
    options?: {
      limit?: number;
      page?: number;
      cacheTtlSeconds?: number;
      tags?: string[];
      routeKey?: string;
    }
  ): Promise<{ tickets: OperationalTicket[]; total: number | null }> {
    const limit = options?.limit ?? 50;
    const page = Math.max(1, options?.page ?? 1);
    const endpoint = `tickets/search?query=${encodeURIComponent(query)}&expand=true&sort_by=updated_at&order_by=desc&limit=${limit}&page=${page}`;
    const response = await fetchTicketApi(endpoint, {}, {
      cacheTtlSeconds: options?.cacheTtlSeconds,
      tags: options?.tags,
      routeKey: options?.routeKey,
      includeResponseMeta: true,
    });

    return {
      tickets: normalizeSearchResponse(response.data)
        .map((raw) => operationalTicketSchema.safeParse(raw))
        .filter((parsed) => parsed.success)
        .map((parsed) => parsed.data),
      total: parseSearchTotal(response.headers),
    };
  },

  async getTicketCount(query: string, routeKey = getDefaultTicketRouteKey()): Promise<number> {
    const baseUrl = getTicketBaseUrl();
    const token = getTicketToken();
    if (!baseUrl || !token) return 0;

    const res = await fetchWithRetry(
      `${baseUrl}/api/v1/tickets/search?query=${encodeURIComponent(query)}&limit=1`,
      { headers: { Authorization: buildAuthorizationHeader(token) } },
      { routeKey, endpoint: `tickets/search?query=${query}&limit=1` }
    );
    const total = res.headers.get("X-Total-Count");
    return total ? parseInt(total, 10) : 0;
  },

  async getUserIdByEmail(email: string, routeKey = getDefaultTicketRouteKey()): Promise<number | null> {
    const cached = getCachedUserId(email);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const data = await fetchTicketApi(
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
      console.error("TicketGateway.getUserIdByEmail:", err);
      return null;
    }
  },

  async getUserByEmail(email: string, routeKey = getDefaultTicketRouteKey()): Promise<TicketUser | null> {
    try {
      const data = await fetchTicketApi(
        `users/search?query=${encodeURIComponent(`email:${email}`)}&limit=1`,
        { cache: "no-store" },
        { routeKey }
      );

      if (!Array.isArray(data) || !data.length) {
        return null;
      }
      
      const parsed = ticketUserSchema.safeParse(data[0]);
      return parsed.success ? parsed.data : null;
    } catch (err) {
      console.error("TicketGateway.getUserByEmail:", err);
      return null;
    }
  },

  async searchTickets(query: string, limit = 100, routeKey = "releases"): Promise<TicketApi[]> {
    try {
      const endpoint = `tickets/search?query=${encodeURIComponent(query)}&limit=${limit}&sort_by=updated_at&order_by=desc&expand=true`;
      const data = await fetchTicketApi(endpoint, { next: { revalidate: 3600, tags: ["releases"] } }, { routeKey });

      let rawTickets: unknown[] = [];
      if ((data as { assets?: { Ticket?: Record<string, unknown> } }).assets?.Ticket) {
        rawTickets = Object.values((data as { assets: { Ticket: Record<string, unknown> } }).assets.Ticket);
      } else if (Array.isArray(data)) {
        rawTickets = data;
      }

      return rawTickets
        .map((ticket) => ticketApiSchema.safeParse(ticket))
        .filter((result) => result.success)
        .map((result) => result.data as TicketApi);
    } catch (err) {
      console.error("TicketGateway.searchTickets:", err);
      return [];
    }
  },

  async getAllTickets(
    limit = 50,
    requestOptions?: TicketRequestOptions & { page?: number; stateIds?: number[] }
  ): Promise<OperationalTicket[]> {
    try {
      const query = buildStateQuery(requestOptions?.stateIds ?? [...OPERATIONAL_STATE_IDS]) || "state_id:1";
      const result = await this.searchOperationalTicketsPage(query, {
        limit,
        page: Math.max(1, requestOptions?.page ?? 1),
        cacheTtlSeconds: requestOptions?.cacheTtlSeconds,
        tags: requestOptions?.tags,
        routeKey: requestOptions?.routeKey,
      });
      return result.tickets;
    } catch (err) {
      console.error("TicketGateway.getAllTickets:", err);
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
  ): Promise<OperationalTicket[]> {
    const normalizedEmails = Array.from(new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)));
    if (!normalizedEmails.length) return [];

    try {
      const stateQuery = buildStateQuery(options?.stateIds);
      const limit = options?.limit ?? 50;
      const page = Math.max(1, options?.page ?? 1);
      
      const chunkSize = 15;
      const emailChunks: string[][] = [];
      for (let i = 0; i < normalizedEmails.length; i += chunkSize) {
        emailChunks.push(normalizedEmails.slice(i, i + chunkSize));
      }

      let allPrimary: OperationalTicket[] = [];

      for (const chunk of emailChunks) {
        const emailQuery = buildCustomerEmailsQuery(chunk);
        const query = stateQuery ? `${emailQuery} AND ${stateQuery}` : emailQuery;
        const endpoint = `tickets/search?query=${encodeURIComponent(query)}&expand=true&sort_by=updated_at&order_by=desc&limit=${limit}&page=${page}`;
        const data = await fetchTicketApi(endpoint, {}, {
          cacheTtlSeconds: options?.cacheTtlSeconds,
          tags: options?.tags,
          routeKey: options?.routeKey,
        });

        const primary = normalizeSearchResponse(data)
          .map((raw) => operationalTicketSchema.safeParse(raw))
          .filter((parsed) => parsed.success)
          .map((parsed) => parsed.data);
          
        allPrimary = allPrimary.concat(primary);
      }

      if (allPrimary.length > 0) {
        const sorted = dedupeOperationalTickets(allPrimary);
        return sorted.slice(0, limit);
      }

      let allFallback: OperationalTicket[] = [];
      
      for (const chunk of emailChunks) {
        const fallbackEmailQuery = buildCustomerEmailsFallbackQuery(chunk);
        const fallbackQuery = stateQuery ? `${fallbackEmailQuery} AND ${stateQuery}` : fallbackEmailQuery;
        const fallbackEndpoint = `tickets/search?query=${encodeURIComponent(fallbackQuery)}&expand=true&sort_by=updated_at&order_by=desc&limit=${limit}&page=${page}`;
        const fallbackData = await fetchTicketApi(fallbackEndpoint, {}, {
          cacheTtlSeconds: options?.cacheTtlSeconds,
          tags: options?.tags,
          routeKey: options?.routeKey,
        });

        const fallbacks = normalizeSearchResponse(fallbackData)
            .map((raw) => operationalTicketSchema.safeParse(raw))
            .filter((parsed) => parsed.success)
            .map((parsed) => parsed.data);
            
        allFallback = allFallback.concat(fallbacks);
      }

      const sortedFallback = dedupeOperationalTickets(allFallback);
      return sortedFallback.slice(0, limit);
    } catch (err) {
      console.error("TicketGateway.getTicketsForCustomerEmailsPaged:", err);
      return [];
    }
  },

  async canAccessTicketForCustomerEmails(ticketId: string | number, emails: string[]): Promise<boolean> {
    const normalizedEmails = Array.from(new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)));
    if (!normalizedEmails.length) return false;

    try {
      for (const email of normalizedEmails) {
        const query = `(id:${ticketId}) AND (customer.email:${email} OR customer:${email} OR "${email}")`;
        const endpoint = `tickets/search?query=${encodeURIComponent(query)}&limit=1&expand=true`;
        const data = await fetchTicketApi(endpoint, { cache: "no-store" });
        const found = normalizeSearchResponse(data)
          .map((raw) => operationalTicketSchema.safeParse(raw))
          .some((parsed) => parsed.success && String(parsed.data.id) === String(ticketId));

        if (found) return true;
      }

      return false;
    } catch (err) {
      console.error("TicketGateway.canAccessTicketForCustomerEmails:", err);
      return false;
    }
  },

  async createTicket(payload) {
    return fetchTicketApi("tickets", {
      method: "POST",
      body: JSON.stringify(payload),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
  },

  async getTicketById(ticketId: string | number): Promise<TicketDetails> {
    const data = await fetchTicketApi(`tickets/${ticketId}`, { cache: "no-store" });
    const parsed = ticketDetailsSchema.safeParse(data);
    if (!parsed.success) throw new Error("Formato de ticket invalido retornado pelo backend.");
    return parsed.data;
  },

  async getTicketArticles(ticketId: string | number): Promise<TicketArticle[]> {
    const data = await fetchTicketApi(`ticket_articles/by_ticket/${ticketId}`, { cache: "no-store" });
    if (!Array.isArray(data)) return [];

    return data
      .map((article) => ticketArticleSchema.safeParse(article))
      .filter((parsed) => parsed.success)
      .map((parsed) => parsed.data);
  },

  async addTicketReply(
    ticketId: string | number,
    body: string,
    attachments?: { filename: string; data: string; "mime-type": string }[]
  ): Promise<unknown> {
    const payload: Record<string, any> = {
      ticket_id: ticketId,
      body,
      type: "note",
      content_type: "text/html",
      internal: false,
    };
    if (attachments && attachments.length > 0) {
      payload.attachments = attachments;
    }
    return fetchTicketApi("ticket_articles", {
      method: "POST",
      body: JSON.stringify(payload),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
  },

  async addInternalTicketNote(ticketId: string | number, body: string): Promise<unknown> {
    return fetchTicketApi("ticket_articles", {
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
    return fetchTicketApi(`tickets/${ticketId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
  },
};






