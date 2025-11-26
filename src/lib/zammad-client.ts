import 'server-only';

interface ZammadConfig {
    endpoint: string;
    token: string;
}

const config: ZammadConfig = {
    endpoint: (process.env.ZAMMAD_URL || 'https://suporte.trilinksoftware.com.br').replace(/\/$/, '') + '/api/v1',
    token: process.env.ZAMMAD_TOKEN || '',
};

export class ZammadClient {
    private static async request<T>(path: string, options?: RequestInit): Promise<T> {
        if (!config.token) {
            throw new Error('ZAMMAD_TOKEN não está configurado no arquivo .env');
        }

        const url = `${config.endpoint}${path}`;

        const headers = {
            'Authorization': `Token token=${config.token}`,
            'Content-Type': 'application/json',
            ...options?.headers,
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                cache: 'no-store' // Dados sempre frescos
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`[Zammad Error] ${response.status} ${path}:`, errorBody);
                throw new Error(`Erro na API Zammad (${response.status}): ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[Zammad Client Fetch Error]', error);
            throw error;
        }
    }

    // --- MÉTODOS DE CLIENTE (User Scope) ---

    static async getTicketsForUser(email: string) {
        try {
            // 1. Busca ID do usuário
            const userSearch = await this.request<any[]>(`/users/search?query=${encodeURIComponent(`email:${email}`)}&limit=1`);

            if (!userSearch || userSearch.length === 0) return [];

            const zammadUser = userSearch[0];
            let query = '';

            // 2. Define escopo (Organização ou Pessoal)
            if (zammadUser.organization_id) {
                query = `organization_id:${zammadUser.organization_id}`;
            } else {
                query = `customer.email:${email}`;
            }

            // Busca com ordenação
            const finalQuery = encodeURIComponent(query);
            return await this.request<any[]>(`/tickets/search?query=${finalQuery}&expand=true&sort_by=updated_at&order_by=desc`);
        } catch (error) {
            console.error('Erro ao buscar tickets do usuário:', error);
            return [];
        }
    }

    static async createTicket(payload: any) {
        return this.request('/tickets', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    static async getTicketById(ticketId: string | number) {
        return this.request<any>(`/tickets/${ticketId}`);
    }

    static async getTicketArticles(ticketId: string | number) {
        return this.request<any[]>(`/ticket_articles/by_ticket/${ticketId}`);
    }

    static async addTicketReply(ticketId: string | number, body: string) {
        return this.request('/ticket_articles', {
            method: 'POST',
            body: JSON.stringify({
                ticket_id: ticketId,
                body: body,
                type: 'note',
                content_type: 'text/html',
                internal: false,
            }),
        });
    }

    // --- MÉTODOS ADMINISTRATIVOS (Admin Scope) ---

    /**
     * Busca TODOS os tickets ativos para a fila de suporte.
     * CORREÇÃO: Sintaxe de query explícita para maior compatibilidade.
     */
    static async getAllTickets(limit = 100) {
        try {
            // Query explícita (funciona sem ElasticSearch)
            // Traz tickets Novos, Abertos, Pendentes, Fechados e Mesclados
            const query = 'state:new OR state:open OR state:pending_reminder OR state:pending_close OR state:closed OR state:merged';

            const tickets = await this.request<any[]>(
                `/tickets/search?query=${encodeURIComponent(query)}&limit=${limit}&expand=true&sort_by=updated_at&order_by=desc`
            );

            // Debug: Se retornar vazio, avisa no console do servidor
            if (tickets.length === 0) {
                console.warn("[Zammad Admin] A busca retornou 0 tickets. Verifique se o TOKEN pertence a um Agente/Admin.");
            }

            return tickets;
        } catch (error) {
            console.error('Erro ao buscar todos os tickets (Admin):', error);
            return [];
        }
    }
}