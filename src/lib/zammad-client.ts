import 'server-only';

interface ZammadConfig {
    endpoint: string;
    token: string;
}

// Configuração usando as variáveis de ambiente corretas
const config: ZammadConfig = {
    // Garante que a URL não tenha barra no final antes de adicionar o sufixo da API
    endpoint: (process.env.ZAMMAD_URL || 'https://suporte.trilinksoftware.com.br').replace(/\/$/, '') + '/api/v1',
    token: process.env.ZAMMAD_TOKEN || '',
};

export class ZammadClient {
    /**
     * Wrapper genérico para fetch na API do Zammad
     */
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
                cache: 'no-store' // Importante para garantir dados frescos (ex: novas mensagens no chat)
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

    /**
     * Busca tickets do usuário ou organização
     */
    static async getTicketsForUser(email: string) {
        try {
            const userSearch = await this.request<any[]>(`/users/search?query=${encodeURIComponent(`email:${email}`)}&limit=1`);

            if (!userSearch || userSearch.length === 0) {
                return [];
            }

            const zammadUser = userSearch[0];
            let query = '';

            if (zammadUser.organization_id) {
                query = `organization_id:${zammadUser.organization_id}`;
            } else {
                query = `customer.email:${email}`;
            }

            const finalQuery = encodeURIComponent(query);

            // Busca estendida para trazer detalhes
            return await this.request<any[]>(`/tickets/search?query=${finalQuery}&expand=true&sort_by=updated_at&order_by=desc`);

        } catch (error) {
            console.error('Erro ao buscar tickets:', error);
            return [];
        }
    }

    /**
     * Cria um novo ticket
     */
    static async createTicket(payload: any) {
        return this.request('/tickets', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    // --- MÉTODOS NOVOS (Adicionados para corrigir os erros da Action) ---

    /**
     * Busca um ticket específico pelo ID
     */
    static async getTicketById(ticketId: string | number) {
        return this.request<any>(`/tickets/${ticketId}`);
    }

    /**
     * Busca o histórico de mensagens (artigos) de um ticket
     */
    static async getTicketArticles(ticketId: string | number) {
        return this.request<any[]>(`/ticket_articles/by_ticket/${ticketId}`);
    }

    /**
     * Adiciona uma resposta (Nota) ao ticket
     */
    static async addTicketReply(ticketId: string | number, body: string) {
        return this.request('/ticket_articles', {
            method: 'POST',
            body: JSON.stringify({
                ticket_id: ticketId,
                body: body,
                type: 'note', // Cria uma nota pública
                content_type: 'text/html',
                internal: false, // false = Cliente consegue ver a resposta
            }),
        });
    }
}