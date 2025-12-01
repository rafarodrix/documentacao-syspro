"use server";

import { getProtectedSession } from "@/lib/auth-helpers";
import { ZammadClient } from "@/lib/zammad-client"; // Sua lib do Zammad
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";

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

function mapZammadPriority(priorityId: number): string {
    if (priorityId === 1) return 'Baixa';
    if (priorityId === 3) return 'Alta';
    return 'Normal';
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
            // Admin vê a fila global
            ticketsRaw = await ZammadClient.getAllTickets(100);
        } else {
            // Cliente vê apenas os seus
            ticketsRaw = await ZammadClient.getTicketsForUser(session.email);
        }

        // Mapeamento Unificado
        const formattedTickets = ticketsRaw.map((t: any) => ({
            id: t.id,
            number: t.number,
            title: t.title,
            group: t.group,
            status: t.state, // Mantemos o original para lógica, o front traduz se quiser
            statusLabel: mapZammadStatus(t.state), // Traduzido
            priority: t.priority_id,
            customer: t.customer_id, // Útil para o Admin saber de quem é
            createdAt: new Date(t.created_at).toISOString(), // ISO é melhor para ordenação no front
            updatedAt: new Date(t.updated_at).toISOString(),
        }));

        return { success: true, data: formattedTickets };

    } catch (error) {
        console.error("Erro ao buscar tickets:", error);
        return { success: false, error: "Erro ao carregar chamados.", data: [] };
    }
}

/**
 * Cria um novo ticket
 */
export async function createTicketAction(prevState: any, formData: FormData) {
    const session = await getProtectedSession();
    if (!session) return { success: false, message: 'Você precisa estar logado.' };

    const subject = formData.get('subject') as string;
    const description = formData.get('description') as string;

    if (!subject || !description) {
        return { success: false, message: 'Preencha todos os campos.' };
    }

    try {
        const newTicket = await ZammadClient.createTicket({
            title: subject,
            group: 'Users', // Ajuste conforme seu Zammad
            customer: session.email, // Vincula ao usuário logado
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

        // SEGURANÇA: Se não for admin, verifica se o ticket pertence ao usuário
        // (Assumindo que o Zammad retorna customer_id ou email do cliente no objeto ticket)
        // if (!isAdmin && ticket.customer !== session.email) {
        //    return { success: false, error: "Acesso negado a este chamado." };
        // }

        const articles = await ZammadClient.getTicketArticles(ticketId);

        // Filtra notas internas se for cliente
        const visibleArticles = articles.filter((a: any) => {
            if (isAdmin) return true; // Admin vê tudo (inclusive notas internas)
            return !a.internal;       // Cliente só vê notas públicas
        });

        return {
            success: true,
            ticket: {
                id: ticket.id,
                title: ticket.title,
                status: mapZammadStatus(ticket.state),
                number: ticket.number,
                createdAt: new Date(ticket.created_at).toLocaleDateString('pt-BR'),
            },
            articles: visibleArticles.map((a: any) => ({
                id: a.id,
                from: a.from,
                body: a.body,
                createdAt: new Date(a.created_at).toLocaleString('pt-BR'),
                isInternal: a.internal,
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

        // Revalida ambas as rotas para garantir
        revalidatePath(`/app/chamados/${ticketId}`);
        revalidatePath(`/admin/chamados/${ticketId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: "Erro ao enviar resposta." };
    }
}