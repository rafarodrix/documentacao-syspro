import { Ticket } from "@dosc-syspro/core";
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
} from "@dosc-syspro/contracts";
import { mapTicketPriority, mapTicketStatusFromStateName } from "@/core/infrastructure/mappers/zammad-ticket.mapper";
import { OPERATIONAL_STATE_IDS } from "@dosc-syspro/core";
import {
    markZammadRouteFresh,
    markZammadRouteStale,
    recordZammadMetric,
} from "@/core/infrastructure/observability/zammad-observability";
import type { IZammadGateway, ZammadCacheOptions } from "@/core/domain/interfaces/zammad-gateway.interface";

const ZAMMAD_URL = process.env.ZAMMAD_URL;
const ZAMMAD_TOKEN = process.env.ZAMMAD_TOKEN;
const ZAMMAD_AUTH_SCHEME = process.env.ZAMMAD_AUTH_SCHEME?.toLowerCase();
const ZAMMAD_TIMEOUT_MS = Number(process.env.ZAMMAD_TIMEOUT_MS ?? 10000);
const ZAMMAD_RETRY_MAX_ATTEMPTS = Number(process.env.ZAMMAD_RETRY_MAX_ATTEMPTS ?? 3);
const ZAMMAD_RETRY_BASE_DELAY_MS = Number(process.env.ZAMMAD_RETRY_BASE_DELAY_MS ?? 400);
const ZAMMAD_FALLBACK_MAX_STALE_MINUTES = Number(process.env.ZAMMAD_FALLBACK_MAX_STALE_MINUTES ?? 15);
const ZAMMAD_CIRCUIT_COOLDOWN_MS = Number(process.env.ZAMMAD_CIRCUIT_COOLDOWN_MS ?? 20_000);
const ZAMMAD_ENABLE_IN_MEMORY_CIRCUIT_BREAKER = process.env.ZAMMAD_ENABLE_IN_MEMORY_CIRCUIT_BREAKER === "true";
const ZAMMAD_USER_ID_CACHE_TTL_MS = Number(process.env.ZAMMAD_USER_ID_CACHE_TTL_MS ?? 300_000);
const DEFAULT_ROUTE_KEY = "unknown";

type ResponseCacheEntry = {
    ts: number;
    data: unknown;
};

const responseCache = new Map<string, ResponseCacheEntry>();
const circuitOpenUntilByRoute = new Map<string, number>();
const userIdCache = new Map<string, { value: number | null; expiresAt: number }>();

type NextFetchOptions = RequestInit & {
    next?: {
        revalidate?: number;
        tags?: string[];
    };
};

type FetchMeta = {
    routeKey: string;
    endpoint: string;
};

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

async function fetchZammad(endpoint: string, options: NextFetchOptions = {}, cacheOptions?: ZammadCacheOptions) {
    if (!ZAMMAD_URL || !ZAMMAD_TOKEN) {
        throw new Error("Zammad URL ou Token nao configurados.");
    }

    const cachePolicy = cacheOptions?.cacheTtlSeconds && cacheOptions.cacheTtlSeconds > 0
        ? {
            cache: "force-cache" as RequestCache,
            next: {
                revalidate: cacheOptions.cacheTtlSeconds,
                tags: cacheOptions.tags,
            },
        }
        : { cache: "no-store" as RequestCache };

    const routeKey = cacheOptions?.routeKey ?? DEFAULT_ROUTE_KEY;
    const url = `${ZAMMAD_URL}/api/v1/${endpoint}`;
    const requestOptions: NextFetchOptions = {
        ...options,
        ...cachePolicy,
        headers: {
            Authorization: buildAuthorizationHeader(ZAMMAD_TOKEN),
            ...options.headers,
        },
    };

    const method = String(requestOptions.method ?? "GET").toUpperCase();
    const cacheKey = `${method}:${url}`;

    try {
        const res = await fetchWithRetry(url, requestOptions, { routeKey, endpoint });
        if (!res.ok) {
            throw new Error(`Zammad API Error [${res.status}]: ${res.statusText}`);
        }

        const json = await res.json();
        if (method === "GET") {
            responseCache.set(cacheKey, { ts: Date.now(), data: json });
        }
        markZammadRouteFresh(routeKey);
        return json;
    } catch (error) {
        if (method === "GET") {
            const fallback = responseCache.get(cacheKey);
            if (fallback) {
                const staleMinutes = Math.floor((Date.now() - fallback.ts) / 60000);
                if (staleMinutes <= ZAMMAD_FALLBACK_MAX_STALE_MINUTES) {
                    markZammadRouteStale(routeKey, staleMinutes);
                    return fallback.data;
                }
            }
        }

        throw error;
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
    return status === 429 || status >= 500;
}

function parseRetryAfterMs(retryAfterHeader: string | null): number | null {
    if (!retryAfterHeader) return null;

    const asSeconds = Number.parseInt(retryAfterHeader, 10);
    if (Number.isFinite(asSeconds) && asSeconds >= 0) {
        return asSeconds * 1000;
    }

    const asDateMs = Date.parse(retryAfterHeader);
    if (Number.isNaN(asDateMs)) return null;
    return Math.max(0, asDateMs - Date.now());
}

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

async function fetchWithRetry(input: string, options: NextFetchOptions, meta: FetchMeta): Promise<Response> {
    let lastError: unknown;
    const start = Date.now();
    const routeKey = meta.routeKey || DEFAULT_ROUTE_KEY;

    const circuitOpenUntil = ZAMMAD_ENABLE_IN_MEMORY_CIRCUIT_BREAKER
        ? (circuitOpenUntilByRoute.get(routeKey) ?? 0)
        : 0;
    if (Date.now() < circuitOpenUntil) {
        const latencyMs = Date.now() - start;
        recordZammadMetric({
            ts: Date.now(),
            routeKey,
            endpoint: meta.endpoint,
            statusCode: null,
            ok: false,
            timeout: false,
            attempts: 0,
            latencyMs,
        });
        throw new Error("Circuit breaker ativo para rota Zammad.");
    }

    for (let attempt = 1; attempt <= ZAMMAD_RETRY_MAX_ATTEMPTS; attempt += 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ZAMMAD_TIMEOUT_MS);

        try {
            const response = await fetch(input, {
                ...options,
                cache: options.cache ?? "no-store",
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                recordZammadMetric({
                    ts: Date.now(),
                    routeKey,
                    endpoint: meta.endpoint,
                    statusCode: response.status,
                    ok: true,
                    timeout: false,
                    attempts: attempt,
                    latencyMs: Date.now() - start,
                });
                return response;
            }

            if (!isRetryableStatus(response.status) || attempt === ZAMMAD_RETRY_MAX_ATTEMPTS) {
                recordZammadMetric({
                    ts: Date.now(),
                    routeKey,
                    endpoint: meta.endpoint,
                    statusCode: response.status,
                    ok: false,
                    timeout: false,
                    attempts: attempt,
                    latencyMs: Date.now() - start,
                });
                if (isRetryableStatus(response.status) && ZAMMAD_ENABLE_IN_MEMORY_CIRCUIT_BREAKER) {
                    circuitOpenUntilByRoute.set(routeKey, Date.now() + ZAMMAD_CIRCUIT_COOLDOWN_MS);
                }
                return response;
            }

            const retryAfterMs = response.status === 429
                ? parseRetryAfterMs(response.headers.get("retry-after"))
                : null;
            const backoffDelayMs = ZAMMAD_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
            await sleep(retryAfterMs ?? backoffDelayMs);
            continue;
        } catch (error) {
            clearTimeout(timeoutId);
            lastError = error;

            if (attempt === ZAMMAD_RETRY_MAX_ATTEMPTS) {
                const isTimeoutError =
                    error instanceof Error &&
                    (error.name === "AbortError" || /aborted|timeout/i.test(error.message));

                recordZammadMetric({
                    ts: Date.now(),
                    routeKey,
                    endpoint: meta.endpoint,
                    statusCode: null,
                    ok: false,
                    timeout: isTimeoutError,
                    attempts: attempt,
                    latencyMs: Date.now() - start,
                });
                if (ZAMMAD_ENABLE_IN_MEMORY_CIRCUIT_BREAKER) {
                    circuitOpenUntilByRoute.set(routeKey, Date.now() + ZAMMAD_CIRCUIT_COOLDOWN_MS);
                }
                break;
            }

            const delayMs = ZAMMAD_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
            await sleep(delayMs);
            continue;
        }
    }

    throw lastError instanceof Error
        ? lastError
        : new Error("Falha ao consultar Zammad apos tentativas e timeout.");
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

function buildCustomerEmailsQuery(emails: string[]): string {
    return `(${emails.map((email) => `customer.email:${email}`).join(" OR ")})`;
}

function buildCustomerEmailsFallbackQuery(emails: string[]): string {
    return `(${emails
        .map((email) => `(customer.email:${email} OR customer:${email} OR "${email}")`)
        .join(" OR ")})`;
}

export const ZammadGateway: IZammadGateway = {
    async searchOperationalTickets(
        query: string,
        options?: {
            limit?: number;
            page?: number;
            cacheTtlSeconds?: number;
            tags?: string[];
            routeKey?: string;
        }
    ): Promise<ZammadOperationalTicket[]> {
        try {
            const limit = options?.limit ?? 50;
            const page = Math.max(1, options?.page ?? 1);
            const endpoint = `tickets/search?query=${encodeURIComponent(query)}&expand=true&sort_by=updated_at&order_by=desc&limit=${limit}&page=${page}`;
            const data = await fetchZammad(endpoint, {}, {
                cacheTtlSeconds: options?.cacheTtlSeconds,
                tags: options?.tags,
                routeKey: options?.routeKey,
            });

            return normalizeSearchResponse(data)
                .map((raw) => zammadOperationalTicketSchema.safeParse(raw))
                .filter((parsed) => parsed.success)
                .map((parsed) => parsed.data);
        } catch (err) {
            console.error("ZammadGateway.searchOperationalTickets:", err);
            return [];
        }
    },

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

    async getTicketCount(query: string, routeKey = DEFAULT_ROUTE_KEY): Promise<number> {
        try {
            if (!ZAMMAD_URL || !ZAMMAD_TOKEN) return 0;
            const res = await fetchWithRetry(
                `${ZAMMAD_URL}/api/v1/tickets/search?query=${encodeURIComponent(query)}&limit=1`,
                { headers: { Authorization: buildAuthorizationHeader(ZAMMAD_TOKEN) } },
                { routeKey, endpoint: `tickets/search?query=${query}&limit=1` }
            );
            const total = res.headers.get("X-Total-Count");
            return total ? parseInt(total, 10) : 0;
        } catch (err) {
            console.error("ZammadGateway.getTicketCount:", err);
            return 0;
        }
    },

    async getUserIdByEmail(email: string, routeKey = DEFAULT_ROUTE_KEY): Promise<number | null> {
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

    async searchTickets(query: string, limit = 100, routeKey = DEFAULT_ROUTE_KEY): Promise<ZammadTicketAPI[]> {
        try {
            const endpoint = `tickets/search?query=${encodeURIComponent(query)}&limit=${limit}&sort_by=updated_at&order_by=desc&expand=true`;

            const data = await fetchZammad(endpoint, {
                next: { revalidate: 3600, tags: ["releases"] },
            }, { routeKey });

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

    async getAllTickets(
        limit = 50,
        cacheOptions?: ZammadCacheOptions & { page?: number; stateIds?: number[] }
    ): Promise<ZammadOperationalTicket[]> {
        try {
            const query = buildStateQuery(cacheOptions?.stateIds ?? [...OPERATIONAL_STATE_IDS]) || "state_id:1";
            return this.searchOperationalTickets(query, {
                limit,
                page: Math.max(1, cacheOptions?.page ?? 1),
                cacheTtlSeconds: cacheOptions?.cacheTtlSeconds,
                tags: cacheOptions?.tags,
                routeKey: cacheOptions?.routeKey,
            });
        } catch (err) {
            console.error("ZammadGateway.getAllTickets:", err);
            return [];
        }
    },

    async getTicketsForUser(
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
    ): Promise<ZammadOperationalTicket[]> {
        try {
            let scopeQuery = `customer.email:${email}`;

            if ((options?.scope ?? "organization-or-email") === "organization-or-email") {
                const usersResponse = await fetchZammad(`users/search?query=${encodeURIComponent(`email:${email}`)}&limit=1`, {
                    cache: "no-store",
                }, { routeKey: options?.routeKey });

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
            const page = Math.max(1, options?.page ?? 1);
            const endpoint = `tickets/search?query=${encodeURIComponent(query)}&expand=true&sort_by=updated_at&order_by=desc&limit=${limit}&page=${page}`;
            const data = await fetchZammad(endpoint, {}, {
                cacheTtlSeconds: options?.cacheTtlSeconds,
                tags: options?.tags,
                routeKey: options?.routeKey,
            });

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
        options?: {
            stateIds?: number[];
            limit?: number;
            page?: number;
            cacheTtlSeconds?: number;
            tags?: string[];
            routeKey?: string;
        }
    ): Promise<ZammadOperationalTicket[]> {
        try {
            return this.getTicketsForCustomerEmailsPaged(emails, {
                stateIds: options?.stateIds,
                limit: options?.limit,
                page: options?.page,
                cacheTtlSeconds: options?.cacheTtlSeconds,
                tags: options?.tags,
                routeKey: options?.routeKey,
            });
        } catch (err) {
            console.error("ZammadGateway.getTicketsForCustomerEmails:", err);
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
        const normalizedEmails = Array.from(
            new Set(
                emails
                    .map((email) => email.trim().toLowerCase())
                    .filter(Boolean)
            )
        );

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

    async updateTicket(
        ticketId: string | number,
        payload: {
            owner_id?: number | null;
            priority_id?: number;
            state_id?: number;
        }
    ): Promise<unknown> {
        return fetchZammad(`tickets/${ticketId}`, {
            method: "PUT",
            body: JSON.stringify(payload),
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
            },
        });
    },
};
