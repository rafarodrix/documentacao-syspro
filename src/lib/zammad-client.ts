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
            // Erro amigável para facilitar o debug em desenvolvimento
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
                // cache: 'no-store' // Opcional: garante dados sempre frescos se necessário
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
     * Busca tickets inteligentes.
     * Lógica:
     * 1. Busca o usuário no Zammad pelo e-mail.
     * 2. Se o usuário tiver 'organization_id', busca todos os tickets dessa organização.
     * 3. Se não, busca apenas os tickets onde ele é o 'customer'.
     */
    static async getTicketsForUser(email: string) {
        try {
            // 1. Encontrar o usuário para descobrir sua Organização
            const userSearch = await this.request<any[]>(`/users/search?query=${encodeURIComponent(`email:${email}`)}&limit=1`);

            if (!userSearch || userSearch.length === 0) {
                console.warn(`[Zammad] Usuário não encontrado para o email: ${email}`);
                return [];
            }

            const zammadUser = userSearch[0];
            let query = '';

            // 2. Decidir a estratégia de busca (Organização vs Pessoal)
            if (zammadUser.organization_id) {
                // Estratégia Corporativa: Ver tickets da empresa inteira
                query = `organization_id:${zammadUser.organization_id}`;
            } else {
                // Estratégia Individual: Ver apenas seus tickets
                query = `customer.email:${email}`;
            }

            // Adiciona filtro para não trazer tickets arquivados/muito antigos se desejar, 
            // ou remove filtros de estado para trazer histórico completo.
            // Ordenação: Mais recentes primeiro.
            const finalQuery = encodeURIComponent(query);

            return await this.request<any[]>(`/tickets/search?query=${finalQuery}&expand=true&sort_by=updated_at&order_by=desc`);

        } catch (error) {
            console.error('Erro ao buscar tickets do usuário/organização:', error);
            return []; // Retorna array vazio para não quebrar a UI
        }
    }

    /**
     * Cria um novo ticket
     */
    static async createTicket(payload: {
        title: string;
        group: string;
        customer: string; // E-mail do cliente
        article: {
            subject: string;
            body: string;
            type?: string;
            internal?: boolean;
        };
    }) {
        return this.request('/tickets', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }
}