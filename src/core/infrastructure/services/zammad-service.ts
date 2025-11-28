import { Ticket, TicketPriority, TicketStatus } from "@/core/domain/entities/ticket";
import { ZammadTicketAPISchema } from "@/core/schema/zammad-schema";

const ZAMMAD_URL = process.env.ZAMMAD_URL;
const ZAMMAD_TOKEN = process.env.ZAMMAD_TOKEN;

// ---------------------------
// Estado Zammad → domínio
// ---------------------------
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
    switch (stateName.trim()) {
        case STATE_NAMES.NOVO:
            return "Aberto";
        case STATE_NAMES.EM_ANALISE:
        case STATE_NAMES.EM_DESENVOLVIMENTO:
            return "Em Análise";
        case STATE_NAMES.EM_TESTES:
        case STATE_NAMES.AGUARDANDO_CLIENTE:
            return "Pendente";
        case STATE_NAMES.FECHADO:
        case STATE_NAMES.MERGED:
        case "4":
            return "Resolvido";
        default:
            return "Em Análise";
    }
}

function mapPriority(priorityId: number, name: string): TicketPriority {
    const lower = name.toLowerCase();

    if (priorityId === 3) return "Alta";
    if (lower.includes("high") || lower.includes("alta")) return "Alta";
    if (lower.includes("low") || lower.includes("baixa")) return "Baixa";

    return "Média";
}

export const zammadService = {
    // ---------------------------------------------------------------------
    // Buscar tickets do usuário por EMAIL
    // ---------------------------------------------------------------------
    async getUserTickets(userEmail: string): Promise<Ticket[]> {
        if (!ZAMMAD_URL || !ZAMMAD_TOKEN) return [];

        try {
            const query = `query=customer.email:${userEmail}&limit=10&sort_by=updated_at&order_by=desc&expand=true`;

            const res = await fetch(`${ZAMMAD_URL}/api/v1/tickets/search?${query}`, {
                headers: { Authorization: `Bearer ${ZAMMAD_TOKEN}` },
                next: { revalidate: 30 }
            });

            if (!res.ok) throw new Error(`Zammad error: ${res.statusText}`);

            const data = await res.json();

            const rawTickets = data.assets?.Ticket ? Object.values(data.assets.Ticket) : [];
            const stateMap = data.assets?.TicketState || {};
            const priorityMap = data.assets?.TicketPriority || {};

            return (rawTickets as any[]).map((raw) => {
                const parsed = ZammadTicketAPISchema.parse(raw);

                const stateName = stateMap[parsed.state_id]?.name || "";
                const priorityName = priorityMap[parsed.priority_id]?.name || "";

                return {
                    id: String(parsed.number),
                    number: String(parsed.number),
                    subject: parsed.title,
                    status: mapStatus(stateName),
                    priority: mapPriority(parsed.priority_id, priorityName),
                    date: new Date(parsed.updated_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                    }),
                    lastUpdate: new Date(parsed.updated_at).toISOString()
                };
            });
        } catch (err) {
            console.error("Erro ao buscar tickets:", err);
            return [];
        }
    },

    // ---------------------------------------------------------------------
    // Contagem de tickets
    // ---------------------------------------------------------------------
    async getTicketCount(query: string): Promise<number> {
        if (!ZAMMAD_URL || !ZAMMAD_TOKEN) return 0;

        try {
            const res = await fetch(
                `${ZAMMAD_URL}/api/v1/tickets/search?query=${encodeURIComponent(query)}&limit=1`,
                { headers: { Authorization: `Bearer ${ZAMMAD_TOKEN}` } }
            );

            const total = res.headers.get("X-Total-Count");
            return total ? parseInt(total, 10) : 0;
        } catch {
            return 0;
        }
    }
};
