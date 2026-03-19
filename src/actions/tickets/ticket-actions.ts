"use server";

import { getProtectedSession } from "@/lib/auth-helpers";
import { ZammadGateway } from "@/core/infrastructure/gateways/zammad-gateway";
import { revalidatePath } from "next/cache";
import { ZammadOperationalTicket, ZammadTicketArticle } from "@/core/application/schema/zammad-api.schema";
import { mapTicketStateLabel } from "@/core/infrastructure/mappers/zammad-ticket.mapper";

type TicketListItem = {
    id: number;
    number: string;
    title: string;
    group: string;
    status: string;
    statusLabel: string;
    priority: number;
    customer: string;
    createdAt: string;
    updatedAt: string;
};

// --- AÇÕES ---

export async function getTicketsAction() {
    const session = await getProtectedSession();
    if (!session) return { success: false, error: "Não autorizado", data: [] };

    const isAdmin = ['ADMIN', 'DEVELOPER', 'SUPORTE'].includes(session.role);

    try {
        let ticketsRaw: ZammadOperationalTicket[] = [];

        if (isAdmin) {
            // Admin vê os 50 últimos tickets globais
            ticketsRaw = await ZammadGateway.getAllTickets(50);

            // Filtro de Developer (opcional)
            if (session.role === 'DEVELOPER') {
                ticketsRaw = ticketsRaw.filter((t) => t.group === 'Development');
            }
        } else {
            // Cliente vê os seus (busca por email)
            ticketsRaw = await ZammadGateway.getTicketsForUser(session.email);
        }

        // Se ticketsRaw vier vazio ou undefined, retorna array vazio
        if (!ticketsRaw || !Array.isArray(ticketsRaw)) {
            return { success: true, data: [] };
        }

        const formattedTickets: TicketListItem[] = ticketsRaw.map((t) => ({
            id: t.id,
            number: t.number,
            title: t.title,
            group: t.group || "Sem grupo",
            status: t.state || "",
            statusLabel: mapTicketStateLabel(t.state || ""),
            priority: t.priority_id ?? 2,
            customer: String(t.customer || "Cliente"), // O Zammad retorna o ID ou email
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

export async function createTicketAction(_prevState: unknown, formData: FormData) {
    const session = await getProtectedSession();
    if (!session) return { success: false, message: 'Sessão expirada.' };

    const subject = formData.get('subject') as string;
    const description = formData.get('description') as string;
    const priorityStr = formData.get('priority') as string || '2 normal';

    // Extrai ID da prioridade "2 normal" -> 2
    const priorityId = parseInt(priorityStr.charAt(0)) || 2;

    try {
        const newTicket = await ZammadGateway.createTicket({
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
        const ticket = await ZammadGateway.getTicketById(ticketId);

        // Validação de Segurança: Cliente não pode ver ticket de outro
        // (Isso depende de como o Zammad retorna o customer, pode ser ID ou Email)
        // if (!isAdmin && ticket.created_by_id !== ... ) { ... } 

        const articles = await ZammadGateway.getTicketArticles(ticketId);

        const visibleArticles = articles.filter((a: ZammadTicketArticle) => {
            if (isAdmin) return true;
            return a.internal === false;
        });

        return {
            success: true,
            ticket: {
                id: ticket.id,
                title: ticket.title,
                status: mapTicketStateLabel(ticket.state || ""),
                number: ticket.number,
                createdAt: new Date(ticket.created_at).toLocaleDateString('pt-BR'),
            },
            articles: visibleArticles.map((a: ZammadTicketArticle) => ({
                id: a.id,
                from: a.from || "Sistema", // Ex: "Rafael <rafael@email.com>"
                body: a.body,
                createdAt: new Date(a.created_at).toLocaleString('pt-BR'),
                sender: a.sender || ((a.from || "").includes(session.email) ? 'Customer' : 'Agent'),
                isInternal: a.internal ?? false
            }))
        };
    } catch (error) {
        return { success: false, error: "Chamado não encontrado." };
    }
}

export async function replyTicketAction(ticketId: string, message: string) {
    try {
        await ZammadGateway.addTicketReply(ticketId, message);
        revalidatePath(`/app/chamados/${ticketId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: "Erro ao enviar." };
    }
}

// Alias para manter compatibilidade
export const getMyTicketsAction = getTicketsAction;
export const getAdminTicketsAction = getTicketsAction;
