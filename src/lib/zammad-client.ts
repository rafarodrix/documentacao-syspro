import 'server-only';

interface ZammadConfig {
    endpoint: string;
    token: string;
}

// Configuração usando as variáveis de ambiente
const config: ZammadConfig = {
    endpoint: (process.env.ZAMMAD_URL || 'https://suporte.trilinksoftware.com.br').replace(/\/$/, '') + '/api/v1',
    token: process.env.ZAMMAD_TOKEN || '',
};

export class ZammadClient {
    /**
     * Wrapper genérico para fetch na API do Zammad
     */
    private static async request<T>(path: string, options?: RequestInit): Promise<T> {
        if (!config.token) {
            throw new Error('ZAMMAD_TOKEN não configurado.');
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
                cache: 'no-store'
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`[Zammad Error ${response.status}]`, errorBody);
                throw new Error(`Erro na API Zammad: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[Zammad Client]', error);
            throw error;
        }
    }

    // --- MÉTODOS DE CLIENTE (User Scope) ---

    static async getTicketsForUser(email: string) {
        try {
            const userSearch = await this.request<any[]>(`/users/search?query=${encodeURIComponent(`email:${email}`)}&limit=1`);

            if (!userSearch || userSearch.length === 0) return [];

            const zammadUser = userSearch[0];
            let query = '';

            if (zammadUser.organization_id) {
                query = `organization_id:${zammadUser.organization_id}`;
            } else {
                query = `customer.email:${email}`;
            }

            // Busca tickets ordenados por atualização
            return await this.request<any[]>(`/tickets/search?query=${encodeURIComponent(query)}&expand=true&sort_by=updated_at&order_by=desc`);
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
     * Filtra por estados abertos (new, open, pending).
     */
    static async getAllTickets(limit = 50) {
        try {
            // Query para pegar tickets que NÃO estão fechados/mesclados
            // Ajuste os estados conforme seu workflow no Zammad
            const query = 'state:(new OR open OR pending_reminder OR pending_close)';

            // expand=true traz detalhes do cliente (customer_id vira objeto) se a API permitir, ou facilita queries futuras
            return await this.request<any[]>(
                `/tickets/search?query=${encodeURIComponent(query)}&limit=${limit}&expand=true&sort_by=updated_at&order_by=desc`
            );
        } catch (error) {
            console.error('Erro ao buscar todos os tickets:', error);
            return [];
        }
    }
}