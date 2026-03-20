"use server";

import { Role } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { ZammadGateway } from "@/core/infrastructure/gateways/zammad-gateway";
import { ZammadOperationalTicket, ZammadTicketArticle } from "@/core/application/schema/zammad-api.schema";
import { mapTicketStateLabel } from "@/core/infrastructure/mappers/zammad-ticket.mapper";
import { getZammadRouteHealth } from "@/core/infrastructure/observability/zammad-observability";

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

type GetTicketsActionParams = {
    page?: number;
    pageSize?: number;
};

type TicketsPagination = {
    page: number;
    pageSize: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    total: number | null;
};

type TicketsDataResponse = {
    success: boolean;
    error?: string;
    data: TicketListItem[];
    pagination: TicketsPagination;
    staleWarning?: string;
};

const SYSTEM_ROLES = new Set<Role>([Role.ADMIN, Role.DEVELOPER, Role.SUPORTE]);

function isSystemRole(role: Role): boolean {
    return SYSTEM_ROLES.has(role);
}

async function getScopedCompanyUserEmails(userId: string): Promise<string[]> {
    const memberships = await prisma.membership.findMany({
        where: { userId },
        select: { companyId: true },
    });

    const companyIds = memberships.map((membership) => membership.companyId);
    if (!companyIds.length) return [];

    const users = await prisma.user.findMany({
        where: {
            deletedAt: null,
            isActive: true,
            memberships: { some: { companyId: { in: companyIds } } },
        },
        select: { email: true },
    });

    return Array.from(
        new Set(users.map((user) => user.email.trim().toLowerCase()).filter(Boolean))
    );
}

function formatTickets(ticketsRaw: ZammadOperationalTicket[]): TicketListItem[] {
    const formattedTickets: TicketListItem[] = ticketsRaw.map((ticket) => ({
        id: ticket.id,
        number: ticket.number,
        title: ticket.title,
        group: ticket.group || "Sem grupo",
        status: ticket.state || "",
        statusLabel: mapTicketStateLabel(ticket.state || ""),
        priority: ticket.priority_id ?? 2,
        customer: String(ticket.customer || "Cliente"),
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
    }));

    formattedTickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return formattedTickets;
}

function buildPagination(page: number, pageSize: number, total: number | null, currentCount: number): TicketsPagination {
    const hasPreviousPage = page > 1;
    const hasNextPage = total !== null ? page * pageSize < total : currentCount >= pageSize;

    return {
        page,
        pageSize,
        hasPreviousPage,
        hasNextPage,
        total,
    };
}

function buildEmailQueryForCount(emails: string[]): string {
    const normalized = Array.from(new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)));
    if (!normalized.length) return "";
    return `(${normalized.map((email) => `customer.email:${email}`).join(" OR ")})`;
}

export async function getTicketsAction(params: GetTicketsActionParams = {}): Promise<TicketsDataResponse> {
    const session = await getProtectedSession();
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(50, Math.max(10, params.pageSize ?? 20));

    if (!session) {
        return {
            success: false,
            error: "Nao autorizado",
            data: [],
            pagination: buildPagination(page, pageSize, 0, 0),
        };
    }

    try {
        let ticketsRaw: ZammadOperationalTicket[] = [];
        let total: number | null = null;
        const routeKey = "app-chamados";

        if (isSystemRole(session.role)) {
            const query = "(state_id:1 OR state_id:2 OR state_id:3 OR state_id:4 OR state_id:5 OR state_id:6 OR state_id:7 OR state_id:8 OR state_id:9)";

            ticketsRaw = await ZammadGateway.getAllTickets(pageSize, {
                page,
                cacheTtlSeconds: 45,
                tags: ["tickets-list", "tickets-dashboard"],
                routeKey,
            });
            total = await ZammadGateway.getTicketCount(query, routeKey);
        } else {
            const scopedEmails = await getScopedCompanyUserEmails(session.userId);
            if (!scopedEmails.length) {
                return {
                    success: true,
                    data: [],
                    pagination: buildPagination(page, pageSize, 0, 0),
                };
            }

            ticketsRaw = await ZammadGateway.getTicketsForCustomerEmailsPaged(scopedEmails, {
                limit: pageSize,
                page,
                cacheTtlSeconds: 45,
                tags: ["tickets-list", "tickets-dashboard"],
                routeKey,
            });

            const query = buildEmailQueryForCount(scopedEmails);
            total = query ? await ZammadGateway.getTicketCount(query, routeKey) : 0;
        }

        const routeHealth = getZammadRouteHealth(routeKey);
        const staleWarning = routeHealth.stale
            ? `Dados do Zammad desatualizados ha ${routeHealth.staleMinutes} min.`
            : undefined;

        return {
            success: true,
            data: formatTickets(ticketsRaw),
            pagination: buildPagination(page, pageSize, total, ticketsRaw.length),
            staleWarning,
        };
    } catch (error) {
        console.error("Erro ao buscar tickets:", error);
        return {
            success: false,
            error: "Erro de conexao com o Zammad.",
            data: [],
            pagination: buildPagination(page, pageSize, 0, 0),
        };
    }
}

export async function createTicketAction(_prevState: unknown, formData: FormData) {
    const session = await getProtectedSession();
    if (!session) return { success: false, message: "Sessao expirada." };

    const subject = String(formData.get("subject") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const priorityStr = String(formData.get("priority") || "2 normal");
    const priorityId = parseInt(priorityStr.charAt(0), 10) || 2;

    if (!subject || !description) {
        return { success: false, message: "Preencha assunto e descricao." };
    }

    try {
        const newTicket = await ZammadGateway.createTicket({
            title: subject,
            group: "Users",
            customer: session.email,
            priority_id: priorityId,
            article: {
                subject,
                body: description,
                type: "note",
                internal: false,
            },
        });

        revalidatePath("/app/chamados");
        revalidateTag("tickets-list");
        revalidateTag("tickets-dashboard");
        return { success: true, message: "Chamado aberto com sucesso!", data: newTicket };
    } catch (error) {
        console.error("Erro ao criar chamado:", error);
        return { success: false, message: "Erro ao criar chamado no suporte." };
    }
}

export async function getTicketDetailsAction(ticketId: string) {
    const session = await getProtectedSession();
    if (!session) return { success: false, error: "Nao autorizado" };

    const systemUser = isSystemRole(session.role);

    try {
        if (!systemUser) {
            const scopedEmails = await getScopedCompanyUserEmails(session.userId);
            if (!scopedEmails.length) {
                return { success: false, error: "Chamado nao encontrado." };
            }

            const canAccess = await ZammadGateway.canAccessTicketForCustomerEmails(ticketId, scopedEmails);
            if (!canAccess) {
                return { success: false, error: "Voce nao tem permissao para acessar este chamado." };
            }
        }

        const [ticket, articles] = await Promise.all([
            ZammadGateway.getTicketById(ticketId),
            ZammadGateway.getTicketArticles(ticketId),
        ]);

        const visibleArticles = articles.filter((article: ZammadTicketArticle) => {
            if (systemUser) return true;
            return article.internal === false;
        });

        return {
            success: true,
            ticket: {
                id: ticket.id,
                title: ticket.title,
                status: mapTicketStateLabel(ticket.state || ""),
                number: ticket.number,
                createdAt: new Date(ticket.created_at).toLocaleDateString("pt-BR"),
            },
            articles: visibleArticles.map((article: ZammadTicketArticle) => ({
                id: article.id,
                from: article.from || "Sistema",
                body: article.body,
                createdAt: new Date(article.created_at).toLocaleString("pt-BR"),
                sender:
                    article.sender ||
                    ((article.from || "").toLowerCase().includes(session.email.toLowerCase()) ? "Customer" : "Agent"),
                isInternal: article.internal ?? false,
            })),
        };
    } catch (error) {
        console.error("Erro ao carregar detalhes do chamado:", error);
        return { success: false, error: "Chamado nao encontrado." };
    }
}

export async function replyTicketAction(ticketId: string, message: string) {
    const session = await getProtectedSession();
    if (!session) return { success: false, error: "Nao autorizado." };

    const body = message.trim();
    if (!body) return { success: false, error: "Mensagem vazia." };

    const systemUser = isSystemRole(session.role);

    try {
        if (!systemUser) {
            const scopedEmails = await getScopedCompanyUserEmails(session.userId);
            if (!scopedEmails.length) {
                return { success: false, error: "Voce nao pode responder este chamado." };
            }

            const canAccess = await ZammadGateway.canAccessTicketForCustomerEmails(ticketId, scopedEmails);
            if (!canAccess) {
                return { success: false, error: "Voce nao pode responder este chamado." };
            }
        }

        await ZammadGateway.addTicketReply(ticketId, body);
        revalidatePath(`/app/chamados/${ticketId}`);
        revalidateTag("tickets-list");
        revalidateTag("tickets-dashboard");
        return { success: true };
    } catch (error) {
        console.error("Erro ao responder chamado:", error);
        return { success: false, error: "Erro ao enviar." };
    }
}

export const getMyTicketsAction = getTicketsAction;
export const getAdminTicketsAction = getTicketsAction;
