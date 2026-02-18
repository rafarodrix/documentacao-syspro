"use server";

import { getProtectedSession } from "@/lib/auth-helpers";
import { ZammadClient } from "@/lib/zammad-client";
import { revalidatePath } from "next/cache";

// --- Helpers de Mapeamento ---
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

// --- AÇÕES ---

export async function getTicketsAction() {
    const session = await getProtectedSession();
    if (!session) return { success: false, error: "Não autorizado", data: [] };

    const isAdmin = ['ADMIN', 'DEVELOPER', 'SUPORTE'].includes(session.role);

    try {
        let ticketsRaw: any[] = [];

        if (isAdmin) {
            // Admin vê os 50 últimos tickets globais
            ticketsRaw = await ZammadClient.getAllTickets(50);

            // Filtro de Developer (opcional)
            if (session.role === 'DEVELOPER') {
                ticketsRaw = ticketsRaw.filter((t: any) => t.group === 'Development');
            }
        } else {
            // Cliente vê os seus (busca por email)
            ticketsRaw = await ZammadClient.getTicketsForUser(session.email);
        }

        // Se ticketsRaw vier vazio ou undefined, retorna array vazio
        if (!ticketsRaw || !Array.isArray(ticketsRaw)) {
            return { success: true, data: [] };
        }

        const formattedTickets = ticketsRaw.map((t: any) => ({
            id: t.id,
            number: t.number,
            title: t.title,
            group: t.group,
            status: t.state,
            statusLabel: mapZammadStatus(t.state),
            priority: t.priority_id,
            customer: t.customer || "Cliente", // O Zammad retorna o ID ou email
            createdAt: t.created_at,
            updatedAt: t.updated_at,
        }));

        // Ordenar por data (mais recente primeiro) no JS para garantir
        formattedTickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        return { success: true, data: formattedTickets };

    } catch (error) {
        console.error("Erro ao buscar tickets:", error);
        return { success: false, error: "Erro de conexão com o Zammad.", data: [] };
    }
}

export async function createTicketAction(prevState: any, formData: FormData) {
    const session = await getProtectedSession();
    if (!session) return { success: false, message: 'Sessão expirada.' };

    const subject = formData.get('subject') as string;
    const description = formData.get('description') as string;
    const priorityStr = formData.get('priority') as string || '2 normal';

    // Extrai ID da prioridade "2 normal" -> 2
    const priorityId = parseInt(priorityStr.charAt(0)) || 2;

    try {
        const newTicket = await ZammadClient.createTicket({
            title: subject,
            group: 'Users', // Verifique se este grupo existe no seu Zammad
            customer: session.email, // O Zammad usa o email para vincular
            priority_id: priorityId,
            article: {
                subject: subject,
                body: description,
                type: 'note', // Cria como nota web
                internal: false,
            },
        });

        revalidatePath('/app/chamados');
        revalidatePath('/admin/chamados');
        return { success: true, message: 'Chamado aberto com sucesso!', data: newTicket };

    } catch (error) {
        console.error("Erro ao criar:", error);
        return { success: false, message: 'Erro ao criar chamado no suporte.' };
    }
}

export async function getTicketDetailsAction(ticketId: string) {
    const session = await getProtectedSession();
    if (!session) return { success: false, error: "Não autorizado" };

    const isAdmin = ['ADMIN', 'DEVELOPER', 'SUPORTE'].includes(session.role);

    try {
        const ticket = await ZammadClient.getTicketById(ticketId);

        // Validação de Segurança: Cliente não pode ver ticket de outro
        // (Isso depende de como o Zammad retorna o customer, pode ser ID ou Email)
        // if (!isAdmin && ticket.created_by_id !== ... ) { ... } 

        const articles = await ZammadClient.getTicketArticles(ticketId);

        const visibleArticles = articles.filter((a: any) => {
            if (isAdmin) return true;
            return a.internal === false;
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
                from: a.from, // Ex: "Rafael <rafael@email.com>"
                body: a.body,
                createdAt: new Date(a.created_at).toLocaleString('pt-BR'),
                sender: a.sender || (a.from.includes(session.email) ? 'Customer' : 'Agent'),
                isInternal: a.internal
            }))
        };
    } catch (error) {
        return { success: false, error: "Chamado não encontrado." };
    }
}

export async function replyTicketAction(ticketId: string, message: string) {
    try {
        await ZammadClient.addTicketReply(ticketId, message);
        revalidatePath(`/app/chamados/${ticketId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: "Erro ao enviar." };
    }
}

// Alias para manter compatibilidade
export const getMyTicketsAction = getTicketsAction;
export const getAdminTicketsAction = getTicketsAction;