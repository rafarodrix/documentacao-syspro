import { ZammadTicket, TicketDTO } from "@/types/ticket";

const ZAMMAD_URL = process.env.ZAMMAD_URL;
const ZAMMAD_TOKEN = process.env.ZAMMAD_TOKEN;

// --- CONSTANTES DE ESTADO (Vindas do seu ambiente) ---
const STATE_NAMES = {
    NOVO: "1. Novo",
    EM_ANALISE: "2. Em Analise",
    EM_DESENVOLVIMENTO: "3. Em Desenvolvimento",
    EM_TESTES: "4. Em Testes",
    AGUARDANDO_CLIENTE: "5. Aguardando Validação Cliente",
    FECHADO: "7. Finalizado",
};

// --- HELPERS DE MAPEAMENTO ---

/**
 * Mapeia o nome técnico do estado no Zammad para um status amigável na UI do Cliente.
 */
function mapStatus(zammadState: string): TicketDTO['status'] {
    // Normaliza para garantir comparação segura
    const state = zammadState.trim();

    switch (state) {
        case STATE_NAMES.NOVO:
            return 'Aberto';

        case STATE_NAMES.EM_ANALISE:
            return 'Em Análise';

        case STATE_NAMES.EM_DESENVOLVIMENTO:
            // Para o cliente, saber que está em desenvolvimento é bom,
            // mas podemos agrupar como 'Em Análise' ou criar um status novo.
            // Vamos manter 'Em Análise' para simplificar ou usar o texto real.
            return 'Em Análise';

        case STATE_NAMES.EM_TESTES:
        case STATE_NAMES.AGUARDANDO_CLIENTE:
            return 'Pendente'; // Requer ação ou atenção

        case 'closed':
        case 'merged':
        case '4': // ID de fechado as vezes
            return 'Resolvido';

        default:
            return 'Em Análise'; // Fallback seguro
    }
}

/**
 * Mapeia a prioridade. O seu arquivo indicou que ID 3 é ALTA.
 */
function mapPriority(priorityId: number, priorityName: string): TicketDTO['priority'] {
    // Se vier o ID 3, é Alta.
    if (priorityId === 3) return 'Alta';

    // Fallback para verificação por nome
    const name = priorityName.toLowerCase();
    if (name.includes('high') || name.includes('alta')) return 'Alta';
    if (name.includes('low') || name.includes('baixa')) return 'Baixa';

    return 'Média';
}

export const zammadService = {
    /**
     * Busca tickets de um cliente específico pelo E-MAIL.
     */
    async getUserTickets(userEmail: string): Promise<TicketDTO[]> {
        if (!ZAMMAD_URL || !ZAMMAD_TOKEN) {
            console.error("Zammad credentials not found.");
            return [];
        }

        try {
            // Query ajustada para ignorar tickets fechados muito antigos se quiser,
            // mas por enquanto pegamos os últimos 10 independente do estado.
            const query = `query=customer.email:${userEmail}&limit=10&sort_by=updated_at&order_by=desc`;

            const response = await fetch(`${ZAMMAD_URL}/api/v1/tickets/search?${query}`, {
                headers: {
                    "Authorization": `Bearer ${ZAMMAD_TOKEN}`,
                    "Content-Type": "application/json",
                },
                next: { revalidate: 30 } // Cache curto para atualizações rápidas
            });

            if (!response.ok) {
                throw new Error(`Zammad API Error: ${response.statusText}`);
            }

            const data = await response.json();

            // O Zammad retorna 'assets' com os detalhes dos objetos relacionados (States, Priorities)
            // Precisamos usar isso para traduzir IDs em Nomes se o objeto principal só tiver IDs.
            const tickets = data.assets?.Ticket ? Object.values(data.assets.Ticket) : [];
            const stateMap = data.assets?.TicketState || {};
            const priorityMap = data.assets?.TicketPriority || {};

            // Mapeamento para o DTO
            const formattedTickets: TicketDTO[] = (tickets as any[]).map((t) => {
                // Tenta pegar o nome do estado pelo ID, ou usa o campo state se vier string
                const stateName = stateMap[t.state_id]?.name || t.state || '';
                const priorityName = priorityMap[t.priority_id]?.name || '';

                return {
                    id: t.number, // O número do ticket (ex: 49231)
                    subject: t.title,
                    status: mapStatus(stateName),
                    priority: mapPriority(t.priority_id, priorityName),
                    date: new Date(t.updated_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                    }),
                };
            });

            // Ordenação final por data (mais recente primeiro)
            return formattedTickets.sort((a, b) => {
                // Converter de volta para comparar é custoso, mas seguro se a API não garantir ordem
                // Como formatamos a data para string PT-BR, a ordenação simples de string falharia.
                // O ideal é confiar na ordem da API ou manter o ISO no DTO original se precisar reordenar muito.
                // Por simplicidade, confiamos na ordem da API (order_by=desc).
                return 0;
            });

        } catch (error) {
            console.error("Erro ao buscar tickets no Zammad:", error);
            return [];
        }
    },

    /**
     * [NOVO] Função genérica para buscar contagem (útil para os cards de estatística)
     * Baseado no seu arquivo stats.ts
     */
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