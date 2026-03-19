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

// --- Helper de Fetch Centralizado (DRY) ---
async function fetchZammad(endpoint: string, options: RequestInit = {}) {
    if (!ZAMMAD_URL || !ZAMMAD_TOKEN) {
        throw new Error("Zammad URL ou Token não configurados.");
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

// --- O Gateway Unificado ---

export const ZammadGateway = {

    /**
     * Busca tickets de um usuário específico para o Dashboard.
     * Retorna Entidades de Domínio (Ticket).
     */
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

            return rawTickets.map((raw) => {
                const result = zammadTicketAPISchema.safeParse(raw);
                if (!result.success) return null; // Pula tickets inválidos

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
                        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                    }),
                    lastUpdate: new Date(parsed.updated_at).toISOString()
                };
            }).filter(t => t !== null) as Ticket[];

        } catch (err) {
            console.error("ZammadGateway.getUserTickets:", err);
            return [];
        }
    },

    /**
     * Retorna a contagem de tickets baseado em uma query.
     */
    async getTicketCount(query: string): Promise<number> {
        try {
            // Nota: O endpoint search retorna headers, precisamos fazer o fetch manual aqui para pegar o header X-Total-Count
            // ou adaptar o helper se o header for vital. 
            // Para simplicidade, farei o fetch direto aqui pois precisamos do HEADER, não do JSON body apenas.
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

    /**
     * Busca genérica para Releases e Changelogs.
     * Retorna o Schema da API (Dados brutos validados), pois o uso pode variar.
     */
    async searchTickets(query: string, limit = 100): Promise<ZammadTicketAPI[]> {
        try {
            const endpoint = `tickets/search?query=${encodeURIComponent(query)}&limit=${limit}&sort_by=updated_at&order_by=desc&expand=true`;

            const data = await fetchZammad(endpoint, {
                next: { revalidate: 3600, tags: ["releases"] }
            });

            let rawTickets: unknown[] = [];
            if (data.assets?.Ticket) {
                rawTickets = Object.values(data.assets.Ticket);
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
            const activeStates = [
                'state:"1. Novo"',
                'state:"2. Em Analise"',
                'state:"3. Em Desenvolvimento"',
                'state:"4. Em Testes"',
                'state:"5. Aguardando Validação Cliente"',
            ].join(" OR ");

            const query = `(${activeStates})`;
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
        options?: { stateIds?: number[]; limit?: number }
    ): Promise<ZammadOperationalTicket[]> {
        try {
            const usersResponse = await fetchZammad(`users/search?query=${encodeURIComponent(`email:${email}`)}&limit=1`, {
                cache: "no-store",
            });

            if (!Array.isArray(usersResponse) || usersResponse.length === 0) return [];

            const userParsed = zammadUserSearchSchema.safeParse(usersResponse[0]);
            if (!userParsed.success) return [];

            const user: ZammadUserSearch = userParsed.data;
            const scopeQuery = user.organization_id
                ? `organization_id:${user.organization_id}`
                : `customer.email:${email}`;

            const stateQuery = options?.stateIds?.length
                ? `(${options.stateIds.map((id) => `state_id:${id}`).join(" OR ")})`
                : "";
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
        if (!parsed.success) throw new Error("Formato de ticket inválido retornado pelo Zammad.");
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
