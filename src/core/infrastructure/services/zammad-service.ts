import { Ticket, TicketStatus, TicketPriority } from "@/core/domain/entities";

const ZAMMAD_URL = process.env.ZAMMAD_URL;
const ZAMMAD_TOKEN = process.env.ZAMMAD_TOKEN;

// --- CONSTANTES DE ESTADO ---
const STATE_NAMES = {
    NOVO: "1. Novo",
    EM_ANALISE: "2. Em Analise",
    EM_DESENVOLVIMENTO: "3. Em Desenvolvimento",
    EM_TESTES: "4. Em Testes",
    AGUARDANDO_CLIENTE: "5. Aguardando Validação Cliente",
    FECHADO: "closed",
    MERGED: "merged"
};

// --- HELPERS DE MAPEAMENTO ---

/**
 * Mapeia o nome técnico do estado no Zammad para um status amigável (TicketStatus).
 */
function mapStatus(zammadState: string): TicketStatus {
    const state = zammadState.trim();

    switch (state) {
        case STATE_NAMES.NOVO:
            return 'Aberto';

        case STATE_NAMES.EM_ANALISE:
        case STATE_NAMES.EM_DESENVOLVIMENTO:
            return 'Em Análise';

        case STATE_NAMES.EM_TESTES:
        case STATE_NAMES.AGUARDANDO_CLIENTE:
            return 'Pendente';

        case 'closed':
        case 'merged':
        case '4':
            return 'Resolvido';

        default:
            return 'Em Análise';
    }
}

/**
 * Mapeia a prioridade.
 */
function mapPriority(priorityId: number, priorityName: string): TicketPriority {
    if (priorityId === 3) return 'Alta';

    const name = priorityName.toLowerCase();
    if (name.includes('high') || name.includes('alta')) return 'Alta';
    if (name.includes('low') || name.includes('baixa')) return 'Baixa';

    return 'Média';
}

export const zammadService = {
    /**
     * Busca tickets de um cliente específico pelo E-MAIL.
     */
    async getUserTickets(userEmail: string): Promise<Ticket[]> {
        if (!ZAMMAD_URL || !ZAMMAD_TOKEN) {
            console.error("Zammad credentials not found.");
            return [];
        }

        try {
            const query = `query=customer.email:${userEmail}&limit=10&sort_by=updated_at&order_by=desc`;

            const response = await fetch(`${ZAMMAD_URL}/api/v1/tickets/search?${query}`, {
                headers: {
                    "Authorization": `Bearer ${ZAMMAD_TOKEN}`,
                    "Content-Type": "application/json",
                },
                next: { revalidate: 30 }
            });

            if (!response.ok) {
                throw new Error(`Zammad API Error: ${response.statusText}`);
            }

            const data = await response.json();

            const tickets = data.assets?.Ticket ? Object.values(data.assets.Ticket) : [];
            const stateMap = data.assets?.TicketState || {};
            const priorityMap = data.assets?.TicketPriority || {};

            // Mapeamento para a entidade Ticket
            const formattedTickets: Ticket[] = (tickets as any[]).map((t) => {
                const stateName = stateMap[t.state_id]?.name || t.state || '';
                const priorityName = priorityMap[t.priority_id]?.name || '';

                return {
                    id: String(t.number), // Garante que ID seja string
                    number: String(t.number), // Adicionado campo 'number' para compatibilidade
                    subject: t.title,
                    status: mapStatus(stateName),
                    priority: mapPriority(t.priority_id, priorityName),
                    date: new Date(t.updated_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                    }),
                    lastUpdate: new Date(t.updated_at).toISOString() // Adicionado campo lastUpdate
                };
            });

            return formattedTickets;

        } catch (error) {
            console.error("Erro ao buscar tickets no Zammad:", error);
            return [];
        }
    },

    async getTicketCount(query: string): Promise<number> {
        if (!ZAMMAD_URL || !ZAMMAD_TOKEN) return 0;

        try {
            const response = await fetch(`${ZAMMAD_URL}/api/v1/tickets/search?query=${encodeURIComponent(query)}&limit=1`, {
                headers: { "Authorization": `Bearer ${ZAMMAD_TOKEN}` },
                next: { revalidate: 60 }
            });
            const data = await response.json();
            return data.tickets_count || 0;
        } catch (e) {
            return 0;
        }
    }
};