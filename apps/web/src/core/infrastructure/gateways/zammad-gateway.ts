import { Ticket, TicketPriority, TicketStatus } from "@/core/domain/entities/ticket.entity";
import { zammadTicketAPISchema, ZammadTicketAPI } from "@/core/application/schema/zammad-api.schema";

const ZAMMAD_URL = process.env.ZAMMAD_URL;
const ZAMMAD_TOKEN = process.env.ZAMMAD_TOKEN;

// --- Mappers e Constantes Auxiliares (Privados ao Módulo) ---

const STATE_NAMES = {
    NOVO: "1. Novo",
    EM_ANALISE: "2. Em Analise",
    EM_DESENVOLVIMENTO: "3. Em Desenvolvimento",
    EM_TESTES: "4. Em Testes",
    AGUARDANDO_CLIENTE: "5. Aguardando Validação Cliente",
    FECHADO: "closed",
    MERGED: "merged"
};

function mapStatus(stateName: string): TicketStatus {
    switch (stateName?.trim()) {
        case STATE_NAMES.NOVO: return "Aberto";
        case STATE_NAMES.EM_ANALISE:
        case STATE_NAMES.EM_DESENVOLVIMENTO: return "Em Análise";
        case STATE_NAMES.EM_TESTES:
        case STATE_NAMES.AGUARDANDO_CLIENTE: return "Pendente";
        case STATE_NAMES.FECHADO:
        case STATE_NAMES.MERGED:
        case "4": return "Resolvido";
        default: return "Em Análise";
    }
}

function mapPriority(priorityId: number, name: string): TicketPriority {
    const lower = name?.toLowerCase() || "";
    if (priorityId === 3) return "Alta";
    if (lower.includes("high") || lower.includes("alta")) return "Alta";
    if (lower.includes("low") || lower.includes("baixa")) return "Baixa";
    return "Média";
}

// --- Helper de Fetch Centralizado (DRY) ---
async function fetchZammad(endpoint: string, options: RequestInit = {}) {
    if (!ZAMMAD_URL || !ZAMMAD_TOKEN) {
        throw new Error("Zammad URL ou Token não configurados.");
    }

    const res = await fetch(`${ZAMMAD_URL}/api/v1/${endpoint}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${ZAMMAD_TOKEN}`,
            ...options.headers,
        },
    });

    if (!res.ok) {
        throw new Error(`Zammad API Error [${res.status}]: ${res.statusText}`);
    }

    return res.json();
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

            const rawTickets = data.assets?.Ticket ? Object.values(data.assets.Ticket) : [];
            const stateMap = data.assets?.TicketState || {};
            const priorityMap = data.assets?.TicketPriority || {};

            return (rawTickets as any[]).map((raw) => {
                const result = zammadTicketAPISchema.safeParse(raw);
                if (!result.success) return null; // Pula tickets inválidos

                const parsed = result.data;
                const stateName = stateMap[parsed.state_id]?.name || "";
                const priorityName = priorityMap[parsed.priority_id]?.name || "";

                return {
                    id: String(parsed.number),
                    number: String(parsed.number),
                    subject: parsed.title,
                    status: mapStatus(stateName),
                    priority: mapPriority(parsed.priority_id, priorityName),
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
                { headers: { Authorization: `Bearer ${ZAMMAD_TOKEN}` } }
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

            let rawTickets: any[] = [];
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
    }
};