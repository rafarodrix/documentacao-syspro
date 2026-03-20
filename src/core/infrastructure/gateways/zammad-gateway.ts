import { Ticket } from "@/core/domain/entities/ticket.entity";
import {
    zammadOperationalTicketSchema,
    zammadTicketAPISchema,
    zammadTicketArticleSchema,
    zammadTicketDetailsSchema,
    zammadUserSearchSchema,
    ZammadOperationalTicket,
    ZammadTicketAPI,
    ZammadTicketArticle,
    ZammadTicketDetails,
    ZammadUserSearch,
} from "@/core/application/schema/zammad-api.schema";
import { mapTicketPriority, mapTicketStatusFromStateName } from "@/core/infrastructure/mappers/zammad-ticket.mapper";

const ZAMMAD_URL = process.env.ZAMMAD_URL;
const ZAMMAD_TOKEN = process.env.ZAMMAD_TOKEN;
const ZAMMAD_AUTH_SCHEME = process.env.ZAMMAD_AUTH_SCHEME?.toLowerCase();

function buildAuthorizationHeader(token: string): string {
    const normalized = token.trim();
    const lowered = normalized.toLowerCase();

    if (lowered.startsWith("bearer ") || lowered.startsWith("token ")) {
        return normalized;
    }

    if (ZAMMAD_AUTH_SCHEME === "bearer") {
        return `Bearer ${normalized}`;
    }

    return `Token token=${normalized}`;
}

async function fetchZammad(endpoint: string, options: RequestInit = {}) {
    if (!ZAMMAD_URL || !ZAMMAD_TOKEN) {
        throw new Error("Zammad URL ou Token nao configurados.");
    }

    const res = await fetch(`${ZAMMAD_URL}/api/v1/${endpoint}`, {
        ...options,
        headers: {
            Authorization: buildAuthorizationHeader(ZAMMAD_TOKEN),
            ...options.headers,
        },
    });

    if (!res.ok) {
        throw new Error(`Zammad API Error [${res.status}]: ${res.statusText}`);
    }

    return res.json();
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

function buildStateQuery(stateIds?: number[]): string {
    if (!stateIds?.length) return "";
    return `(${stateIds.map((id) => `state_id:${id}`).join(" OR ")})`;
}

export const ZammadGateway = {
    async getUserTickets(userEmail: string): Promise<Ticket[]> {
        try {
            const query = `query=customer.email:${userEmail}&limit=10&sort_by=updated_at&order_by=desc&expand=true`;
            const data = await fetchZammad(`tickets/search?${query}`, { next: { revalidate: 30 } });

            const rawTickets = normalizeSearchResponse(data);
            const dataObj = data as {
                assets?: {
                    TicketState?: Record<number, { name?: string }>;
                    TicketPriority?: Record<number, { name?: string }>;
                };
            };
            const stateMap = dataObj.assets?.TicketState || {};
            const priorityMap = dataObj.assets?.TicketPriority || {};

            return rawTickets
                .map((raw) => {
                    const result = zammadTicketAPISchema.safeParse(raw);
                    if (!result.success) return null;

                    const parsed = result.data;
                    const stateName = stateMap[parsed.state_id]?.name || "";
                    const priorityName = priorityMap[parsed.priority_id]?.name || "";

                    return {
                        id: String(parsed.number),
                        number: String(parsed.number),
                        subject: parsed.title,
                        status: mapTicketStatusFromStateName(stateName),
                        priority: mapTicketPriority(parsed.priority_id, priorityName),
                        date: new Date(parsed.updated_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                        }),
                        lastUpdate: new Date(parsed.updated_at).toISOString(),
                    };
                })
                .filter((t) => t !== null) as Ticket[];
        } catch (err) {
            console.error("ZammadGateway.getUserTickets:", err);
            return [];
        }
    },

    async getTicketCount(query: string): Promise<number> {
        try {
            if (!ZAMMAD_URL || !ZAMMAD_TOKEN) return 0;
            const res = await fetch(
                `${ZAMMAD_URL}/api/v1/tickets/search?query=${encodeURIComponent(query)}&limit=1`,
                { headers: { Authorization: buildAuthorizationHeader(ZAMMAD_TOKEN) } }
            );
            const total = res.headers.get("X-Total-Count");
            return total ? parseInt(total, 10) : 0;
        } catch (err) {
            console.error("ZammadGateway.getTicketCount:", err);
            return 0;
        }
    },

    async searchTickets(query: string, limit = 100): Promise<ZammadTicketAPI[]> {
        try {
            const endpoint = `tickets/search?query=${encodeURIComponent(query)}&limit=${limit}&sort_by=updated_at&order_by=desc&expand=true`;

            const data = await fetchZammad(endpoint, {
                next: { revalidate: 3600, tags: ["releases"] },
            });

            let rawTickets: unknown[] = [];
            if ((data as { assets?: { Ticket?: Record<string, unknown> } }).assets?.Ticket) {
                rawTickets = Object.values((data as { assets: { Ticket: Record<string, unknown> } }).assets.Ticket);
            } else if (Array.isArray(data)) {
                rawTickets = data;
            }

            return rawTickets
                .map((t) => zammadTicketAPISchema.safeParse(t))
                .filter((r) => r.success)
                .map((r) => r.data as ZammadTicketAPI);
        } catch (err) {
            console.error("ZammadGateway.searchTickets:", err);
            return [];
        }
    },

    async getAllTickets(limit = 50): Promise<ZammadOperationalTicket[]> {
        try {
            const query = buildStateQuery([1, 2, 3, 4, 5, 6, 7, 8, 9]) || "state_id:1";
            const endpoint = `tickets/search?query=${encodeURIComponent(query)}&limit=${limit}&expand=true&sort_by=updated_at&order_by=desc`;
            const data = await fetchZammad(endpoint, { cache: "no-store" });

            return normalizeSearchResponse(data)
                .map((raw) => zammadOperationalTicketSchema.safeParse(raw))
                .filter((parsed) => parsed.success)
                .map((parsed) => parsed.data);
        } catch (err) {
            console.error("ZammadGateway.getAllTickets:", err);
            return [];
        }
    },

    async getTicketsForUser(
        email: string,
        options?: { stateIds?: number[]; limit?: number; scope?: "organization-or-email" | "email-only" }
    ): Promise<ZammadOperationalTicket[]> {
        try {
            let scopeQuery = `customer.email:${email}`;

            if ((options?.scope ?? "organization-or-email") === "organization-or-email") {
                const usersResponse = await fetchZammad(`users/search?query=${encodeURIComponent(`email:${email}`)}&limit=1`, {
                    cache: "no-store",
                });

                if (Array.isArray(usersResponse) && usersResponse.length > 0) {
                    const userParsed = zammadUserSearchSchema.safeParse(usersResponse[0]);
                    if (userParsed.success) {
                        const user: ZammadUserSearch = userParsed.data;
                        if (user.organization_id) {
                            scopeQuery = `organization_id:${user.organization_id}`;
                        }
                    }
                }
            }

            const stateQuery = buildStateQuery(options?.stateIds);
            const query = stateQuery ? `(${scopeQuery}) AND ${stateQuery}` : scopeQuery;
            const limit = options?.limit ?? 50;
            const endpoint = `tickets/search?query=${encodeURIComponent(query)}&expand=true&sort_by=updated_at&order_by=desc&limit=${limit}`;
            const data = await fetchZammad(endpoint, { cache: "no-store" });

            return normalizeSearchResponse(data)
                .map((raw) => zammadOperationalTicketSchema.safeParse(raw))
                .filter((parsed) => parsed.success)
                .map((parsed) => parsed.data);
        } catch (err) {
            console.error("ZammadGateway.getTicketsForUser:", err);
            return [];
        }
    },

    async getTicketsForCustomerEmails(
        emails: string[],
        options?: { stateIds?: number[]; limit?: number; perEmailLimit?: number }
    ): Promise<ZammadOperationalTicket[]> {
        const normalizedEmails = Array.from(
            new Set(
                emails
                    .map((email) => email.trim().toLowerCase())
                    .filter(Boolean)
            )
        );

        if (!normalizedEmails.length) return [];

        try {
            const perEmailLimit = options?.perEmailLimit ?? options?.limit ?? 50;
            const ticketsPerEmail = await Promise.all(
                normalizedEmails.map((email) =>
                    this.getTicketsForUser(email, {
                        stateIds: options?.stateIds,
                        limit: perEmailLimit,
                        scope: "email-only",
                    })
                )
            );

            const merged = dedupeOperationalTickets(ticketsPerEmail.flat());
            return options?.limit ? merged.slice(0, options.limit) : merged;
        } catch (err) {
            console.error("ZammadGateway.getTicketsForCustomerEmails:", err);
            return [];
        }
    },

    async canAccessTicketForCustomerEmails(ticketId: string | number, emails: string[]): Promise<boolean> {
        const normalizedEmails = Array.from(
            new Set(
                emails
                    .map((email) => email.trim().toLowerCase())
                    .filter(Boolean)
            )
        );

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

    async createTicket(payload: {
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
    }): Promise<unknown> {
        return fetchZammad("tickets", {
            method: "POST",
            body: JSON.stringify(payload),
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
            },
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
            headers: {
                "Content-Type": "application/json",
            },
        });
    },
};
