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
            throw new Error('ZAMMAD_TOKEN não configurado');
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
                console.error(`[Zammad Error] ${response.status} ${path}:`, errorBody);
                throw new Error(`Erro Zammad (${response.status})`);
            }

            return await response.json();
        } catch (error) {
            console.error('[Zammad Fetch Error]', error);
            throw error;
        }
    }

    // --- MÉTODOS DE CLIENTE ---

    static async getTicketsForUser(email: string) {
        try {
            // 1. Busca ID do usuário
            const userSearch = await this.request<any[]>(`/users/search?query=${encodeURIComponent(`email:${email}`)}&limit=1`);

            if (!Array.isArray(userSearch) || userSearch.length === 0) return [];

            const zammadUser = userSearch[0];

            // 2. Define escopo (Organização ou Pessoal)
            // Prioriza Organização se existir, para o cliente ver tickets dos colegas
            const query = zammadUser.organization_id
                ? `organization_id:${zammadUser.organization_id}`
                : `customer.email:${email}`;

            // 3. Busca e Normaliza
            const response = await this.request<any>(
                `/tickets/search?query=${encodeURIComponent(query)}&expand=true&sort_by=updated_at&order_by=desc`
            );

            return this.normalizeResponse(response);

        } catch (error) {
            console.error('Erro ao buscar tickets do usuário:', error);
            return [];
        }
    }

    // --- MÉTODOS ADMINISTRATIVOS ---

    static async getAllTickets(limit = 100) {
        try {
            // CORREÇÃO: Usando os nomes exatos conforme sua imagem
            // Nota: Coloquei entre aspas duplas para garantir que espaços funcionem
            const activeStates = [
                'state:"1. Novo"',
                'state:"2. Em Analise"',
                'state:"3. Em Desenvolvimento"',
                'state:"4. Em Testes"',
                'state:"5. Aguardando Validação Cliente"'
            ].join(' OR ');

            // Query final: Busca todos esses estados ativos
            const query = `(${activeStates})`;

            const tickets = await this.request<any[]>(
                `/tickets/search?query=${encodeURIComponent(query)}&limit=${limit}&expand=true&sort_by=updated_at&order_by=desc`
            );

            return this.normalizeResponse(tickets);
        } catch (error) {
            console.error('Erro ao buscar tickets admin:', error);
            return [];
        }
    }
    // --- HELPERS DE NORMALIZAÇÃO ---

    // O Zammad pode retornar array direto [] OU objeto { assets:..., tickets: [...] }
    // Esse helper garante que sempre devolvemos um array limpo.
    private static normalizeResponse(response: any): any[] {
        if (Array.isArray(response)) {
            return response;
        }
        if (response && response.assets && response.assets.Ticket) {
            // Formato com assets (mais comum em search expandido)
            return Object.values(response.assets.Ticket);
        }
        if (response && Array.isArray(response.tickets)) {
            // Formato paginado
            return response.tickets;
        }
        return [];
    }

    // --- OPERAÇÕES CRUD (Create, Get, Reply) ---

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
}