"use server";

import { getProtectedSession } from "@/lib/auth-helpers";
import { ZammadClient } from "@/lib/zammad-client";
import { revalidatePath } from "next/cache";

// --- Helpers de Mapeamento (Privados) ---

function mapZammadStatus(state: string): string {
    const map: Record<string, string> = {
        'new': 'Novo',
        'open': 'Aberto',
        'pending_reminder': 'Pendente',
        'pending_close': 'Pendente',
        'closed': 'Resolvido',
        'merged': 'Mesclado',
        'removed': 'Removido'
    };
    return map[state] || state;
}

// --- AÇÕES PÚBLICAS ---

/**
 * Busca lista de tickets.
 * Se for ADMIN/DEV/SUPORTE -> Traz tudo (limitado)
 * Se for CLIENTE -> Traz apenas os dele
 */
export async function getTicketsAction() {
    const session = await getProtectedSession();
    if (!session) return { success: false, error: "Não autorizado", data: [] };

    const isAdmin = ['ADMIN', 'DEVELOPER', 'SUPORTE'].includes(session.role);

    try {
        let ticketsRaw = [];

        if (isAdmin) {
            // Admin vê a fila global (limitada a 100 para performance)
            ticketsRaw = await ZammadClient.getAllTickets(100);
        } else {
            // Cliente vê apenas os seus
            // IMPORTANTE: Garante que busca pelo email da sessão
            ticketsRaw = await ZammadClient.getTicketsForUser(session.email);
        }

        // Mapeamento Unificado
        const formattedTickets = ticketsRaw.map((t: any) => ({
            id: t.id,
            number: t.number,
            title: t.title,
            group: t.group,
            status: t.state, // Mantemos o original para lógica
            statusLabel: mapZammadStatus(t.state), // Traduzido para UI
            priority: t.priority_id,
            customer: t.customer_id, // Útil para o Admin saber de quem é
            createdAt: t.created_at ? new Date(t.created_at).toISOString() : new Date().toISOString(),
            updatedAt: t.updated_at ? new Date(t.updated_at).toISOString() : new Date().toISOString(),
        }));

        return { success: true, data: formattedTickets };

    } catch (error) {
        console.error("Erro ao buscar tickets:", error);
        // Retorna array vazio em vez de erro fatal para não quebrar a UI
        return { success: false, error: "Erro ao carregar chamados.", data: [] };
    }
}

// --- ALIAS PARA COMPATIBILIDADE ---
// Isso permite que códigos antigos que chamam getMyTicketsAction continuem funcionando
export const getMyTicketsAction = getTicketsAction;
export const getAdminTicketsAction = getTicketsAction;

/**
 * Cria um novo ticket
 */
export async function createTicketAction(prevState: any, formData: FormData) {
    const session = await getProtectedSession();
    if (!session) return { success: false, message: 'Você precisa estar logado.' };

    const subject = formData.get('subject') as string;
    const description = formData.get('description') as string;
    const priority = formData.get('priority') as string || '2 normal';

    if (!subject || !description) {
        return { success: false, message: 'Preencha todos os campos.' };
    }

    try {
        const newTicket = await ZammadClient.createTicket({
            title: subject,
            group: 'Users',
            customer: session.email, // Vincula ao usuário logado
            priority_id: parseInt(priority.charAt(0)) || 2, // Extrai o ID da string "2 normal"
            article: {
                subject: subject,
                body: description,
                type: 'note',
                internal: false,
            },
        });

        revalidatePath('/app/chamados');
        revalidatePath('/admin/chamados');
        return { success: true, message: 'Chamado criado com sucesso!', data: newTicket };

    } catch (error) {
        console.error('Erro ao criar ticket:', error);
        return { success: false, message: 'Erro ao comunicar com o suporte.' };
    }
}

/**
 * Busca detalhes de um ticket (com segurança)
 */
export async function getTicketDetailsAction(ticketId: string) {
    const session = await getProtectedSession();
    if (!session) return { success: false, error: "Não autorizado" };

    const isAdmin = ['ADMIN', 'DEVELOPER', 'SUPORTE'].includes(session.role);

    try {
        const ticket = await ZammadClient.getTicketById(ticketId);

        // Opcional: Adicionar verificação se o ticket pertence ao usuário (se não for admin)

        const articles = await ZammadClient.getTicketArticles(ticketId);

        // Filtra notas internas se for cliente
        const visibleArticles = articles.filter((a: any) => {
            if (isAdmin) return true;
            return !a.internal;
        });

        return {
            success: true,
            ticket: {
                id: ticket.id,
                title: ticket.title,
                status: mapZammadStatus(ticket.state),
                number: ticket.number,
                priority: ticket.priority_id,
                createdAt: new Date(ticket.created_at).toLocaleDateString('pt-BR'),
            },
            articles: visibleArticles.map((a: any) => ({
                id: a.id,
                from: a.from,
                body: a.body,
                createdAt: new Date(a.created_at).toLocaleString('pt-BR'),
                isInternal: a.internal,
                sender: a.sender || (a.internal ? 'Agent' : 'Customer') // Fallback simples
            }))
        };

    } catch (error) {
        console.error("Erro detalhe ticket:", error);
        return { success: false, error: "Chamado não encontrado." };
    }
}

/**
 * Responder ao ticket
 */
export async function replyTicketAction(ticketId: string, message: string) {
    const session = await getProtectedSession();
    if (!session) return { success: false, error: "Não autorizado" };

    if (!message.trim()) return { success: false, error: "Mensagem vazia." };

    try {
        await ZammadClient.addTicketReply(ticketId, message);

        revalidatePath(`/app/chamados/${ticketId}`);
        revalidatePath(`/admin/chamados/${ticketId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: "Erro ao enviar resposta." };
    }
}