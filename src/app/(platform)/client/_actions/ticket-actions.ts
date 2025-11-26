'use server';

import { getProtectedSession } from '@/lib/auth-helpers';
import { ZammadClient } from '@/lib/zammad-client';
import { revalidatePath } from 'next/cache';

export interface TicketState {
    success: boolean;
    message?: string;
    data?: any;
    errors?: Record<string, string[]>;
}

export async function createTicketAction(prevState: TicketState, formData: FormData): Promise<TicketState> {
    // 1. Autenticação e Segurança
    const session = await getProtectedSession();
    if (!session) {
        return { success: false, message: 'Você precisa estar logado.' };
    }

    // 2. Extração e Validação de Dados
    const subject = formData.get('subject') as string;
    const description = formData.get('description') as string;
    // const priority = formData.get('priority') as string; // Pode ser implementado depois

    if (!subject || !description) {
        return {
            success: false,
            message: 'Preencha todos os campos obrigatórios.'
        };
    }

    try {
        // 3. Chamada ao Serviço do Zammad
        // O Zammad vai associar automaticamente à organização se o usuário (customer) já existir e tiver org.
        const newTicket = await ZammadClient.createTicket({
            title: subject,
            group: 'Users', // Certifique-se que este grupo existe no seu Zammad
            customer: session.email,
            article: {
                subject: subject,
                body: description,
                type: 'note',
                internal: false,
            },
        });

        // 4. Revalidação
        revalidatePath('/dashboard');

        return { success: true, message: 'Chamado criado com sucesso!', data: newTicket };

    } catch (error) {
        console.error('Erro ao criar ticket:', error);
        return { success: false, message: 'Erro ao comunicar com o suporte. Verifique se o email do usuário existe no Zammad.' };
    }
}

export async function getMyTicketsAction() {
    const session = await getProtectedSession();
    if (!session) return { success: false, data: [] };

    try {
        // Agora usa o método inteligente que decide entre Usuário vs Organização
        const tickets = await ZammadClient.getTicketsForUser(session.email);

        // Mapear dados do Zammad para o formato da nossa UI
        const formattedTickets = tickets.map((t: any) => ({
            id: t.id,
            subject: t.title,
            // Mapeamento de status do Zammad (inglês) para UI (português/visual)
            status: mapZammadStatus(t.state),
            priority: mapZammadPriority(t.priority_id),
            lastUpdate: new Date(t.updated_at).toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
            }),
        }));

        return { success: true, data: formattedTickets };
    } catch (error) {
        console.error("Erro ao buscar tickets:", error);
        return { success: false, data: [] };
    }
}

// Helpers de Mapeamento (Opcional, mas melhora a UI)
function mapZammadStatus(state: string): string {
    const map: Record<string, string> = {
        'new': 'Novo',
        'open': 'Aberto',
        'pending_reminder': 'Pendente',
        'closed': 'Resolvido',
        'merged': 'Mesclado'
    };
    return map[state] || state;
}

function mapZammadPriority(priorityId: number): string {
    // Zammad padrão: 1-Baixa, 2-Normal, 3-Alta
    if (priorityId === 1) return 'Baixa';
    if (priorityId === 3) return 'Alta';
    return 'Normal';
}