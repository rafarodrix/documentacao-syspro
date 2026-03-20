"use server";

import { Role } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { ZammadGateway } from "@/core/infrastructure/gateways/zammad-gateway";
import { ZammadOperationalTicket, ZammadTicketArticle } from "@/core/application/schema/zammad-api.schema";
import { mapTicketStateLabel } from "@/core/infrastructure/mappers/zammad-ticket.mapper";
import { getZammadRouteHealth } from "@/core/infrastructure/observability/zammad-observability";
import { listCachedTickets, upsertOperationalTicketsToCache } from "@/core/infrastructure/cache/zammad-ticket-cache";
import { computeTicketSla } from "@/core/application/services/zammad-sla";
import { OPERATIONAL_STATE_IDS, type QueueKey } from "@/core/config/tickets-workflow";
import { consumeActionRateLimit } from "@/lib/security/action-rate-limit";
import { getRequestIp } from "@/lib/security/request-context";

type TicketListItem = {
    id: number;
    number: string;
    title: string;
    group: string;
    status: string;
    statusLabel: string;
    priority: number;
    customer: string;
    ownerId?: number | null;
    firstResponseAt?: string | null;
    resolvedAt?: string | null;
    slaBreached?: boolean;
    slaWarning?: boolean;
    minutesToBreach?: number;
    createdAt: string;
    updatedAt: string;
};

type GetTicketsActionParams = {
    page?: number;
    pageSize?: number;
    queue?: QueueKey;
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
    queueCounts: Record<QueueKey, number>;
};

const SYSTEM_ROLES = new Set<Role>([Role.ADMIN, Role.DEVELOPER, Role.SUPORTE]);
const CREATE_TICKET_RATE_LIMIT = { max: 10, windowMs: 60_000 };
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
        ...(() => {
            const sla = computeTicketSla({
                createdAt: new Date(ticket.created_at),
                firstResponseAt: ticket.first_response_at ? new Date(ticket.first_response_at) : null,
                resolvedAt: ticket.close_at ? new Date(ticket.close_at) : null,
                priorityId: ticket.priority_id ?? null,
            });
            return {
                slaBreached: sla.breached,
                slaWarning: sla.warning,
                minutesToBreach: sla.minutesToBreach,
            };
        })(),
        id: ticket.id,
        number: ticket.number,
        title: ticket.title,
        group: ticket.group || "Sem grupo",
        status: ticket.state || "",
        statusLabel: mapTicketStateLabel(ticket.state || ""),
        priority: ticket.priority_id ?? 2,
        customer: String(ticket.customer || "Cliente"),
        ownerId: ticket.owner_id ?? null,
        firstResponseAt: ticket.first_response_at ?? null,
        resolvedAt: ticket.close_at ?? null,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
    }));

    formattedTickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return formattedTickets;
}

function formatCachedTickets(
    rows: Awaited<ReturnType<typeof listCachedTickets>>["rows"]
): TicketListItem[] {
    return rows.map((row) => ({
        ...(() => {
            const sla = computeTicketSla({
                createdAt: row.createdAtZammad,
                firstResponseAt: row.firstResponseAt,
                resolvedAt: row.resolvedAt,
                priorityId: row.priorityId,
            });
            return {
                slaBreached: sla.breached,
                slaWarning: sla.warning,
                minutesToBreach: sla.minutesToBreach,
            };
        })(),
        id: row.zammadTicketId,
        number: row.number,
        title: row.title,
        group: row.groupName || "Sem grupo",
        status: row.state || "",
        statusLabel: mapTicketStateLabel(row.state || ""),
        priority: row.priorityId ?? 2,
        customer: row.customer || "Cliente",
        ownerId: row.ownerId ?? null,
        firstResponseAt: row.firstResponseAt?.toISOString() ?? null,
        resolvedAt: row.resolvedAt?.toISOString() ?? null,
        createdAt: row.createdAtZammad.toISOString(),
        updatedAt: row.updatedAtZammad.toISOString(),
    }));
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

function buildStateQuery(): string {
    return `(${OPERATIONAL_STATE_IDS.map((id) => `state_id:${id}`).join(" OR ")})`;
}

function buildQueueQuery(queue: QueueKey, zammadUserId?: number | null): string {
    if (queue === "critical") return "priority_id:3";
    if (queue === "unassigned") return "owner_id:null";
    if (queue === "no_response") return "first_response_at:null";
    if (queue === "my_queue") return zammadUserId ? `owner_id:${zammadUserId}` : "id:-1";
    return "";
}

function combineQueryParts(...parts: Array<string | null | undefined>): string {
    return parts.filter(Boolean).map((part) => `(${part})`).join(" AND ");
}

async function getQueueCountsFromZammad(baseQuery: string, routeKey: string, zammadUserId?: number | null): Promise<Record<QueueKey, number>> {
    const [all, myQueue, unassigned, critical, noResponse] = await Promise.all([
        ZammadGateway.getTicketCount(baseQuery, routeKey),
        zammadUserId
            ? ZammadGateway.getTicketCount(combineQueryParts(baseQuery, buildQueueQuery("my_queue", zammadUserId)), routeKey)
            : Promise.resolve(0),
        ZammadGateway.getTicketCount(combineQueryParts(baseQuery, buildQueueQuery("unassigned")), routeKey),
        ZammadGateway.getTicketCount(combineQueryParts(baseQuery, buildQueueQuery("critical")), routeKey),
        ZammadGateway.getTicketCount(combineQueryParts(baseQuery, buildQueueQuery("no_response")), routeKey),
    ]);

    return {
        all,
        my_queue: myQueue,
        unassigned,
        critical,
        no_response: noResponse,
    };
}

async function getQueueCountsFromCache(
    role: Role,
    email: string,
    zammadUserId?: number | null,
    scopedEmails?: string[]
): Promise<Record<QueueKey, number>> {
    const baseWhere = isSystemRole(role)
        ? { stateId: { in: [...OPERATIONAL_STATE_IDS] } }
        : {
            stateId: { in: [...OPERATIONAL_STATE_IDS] },
            OR: (scopedEmails?.length ? scopedEmails : [email]).map((value) => ({
                customer: { contains: value, mode: "insensitive" as const },
            })),
        };

    const [all, myQueue, unassigned, critical, noResponse] = await Promise.all([
        prisma.zammadTicketCache.count({ where: baseWhere }),
        zammadUserId
            ? prisma.zammadTicketCache.count({ where: { ...baseWhere, ownerId: zammadUserId } })
            : Promise.resolve(0),
        prisma.zammadTicketCache.count({ where: { ...baseWhere, ownerId: null } }),
        prisma.zammadTicketCache.count({ where: { ...baseWhere, priorityId: 3 } }),
        prisma.zammadTicketCache.count({ where: { ...baseWhere, firstResponseAt: null } }),
    ]);

    return {
        all,
        my_queue: myQueue,
        unassigned,
        critical,
        no_response: noResponse,
    };
}

export async function getTicketsAction(params: GetTicketsActionParams = {}): Promise<TicketsDataResponse> {
    const session = await getProtectedSession();
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(50, Math.max(10, params.pageSize ?? 20));
    const queue = params.queue ?? "all";

    if (!session) {
        return {
            success: false,
            error: "Nao autorizado",
            data: [],
            pagination: buildPagination(page, pageSize, 0, 0),
            queueCounts: { all: 0, my_queue: 0, unassigned: 0, critical: 0, no_response: 0 },
        };
    }

    try {
        const routeKey = "app-chamados";
        const stateQuery = buildStateQuery();
        const zammadUserId = isSystemRole(session.role)
            ? await ZammadGateway.getUserIdByEmail(session.email, routeKey)
            : null;
        const scopedEmails = isSystemRole(session.role) ? [] : await getScopedCompanyUserEmails(session.userId);

        if (!isSystemRole(session.role) && !scopedEmails.length) {
            return {
                success: true,
                data: [],
                pagination: buildPagination(page, pageSize, 0, 0),
                queueCounts: { all: 0, my_queue: 0, unassigned: 0, critical: 0, no_response: 0 },
            };
        }

        const baseQuery = isSystemRole(session.role)
            ? stateQuery
            : combineQueryParts(buildEmailQueryForCount(scopedEmails), stateQuery);
        const currentQueueQuery = buildQueueQuery(queue, zammadUserId);
        const finalQuery = combineQueryParts(baseQuery, currentQueueQuery);

        const [ticketsRaw, total, queueCountsFromZammad] = await Promise.all([
            ZammadGateway.searchOperationalTickets(finalQuery, {
                limit: pageSize,
                page,
                cacheTtlSeconds: 45,
                tags: ["tickets-list", "tickets-dashboard"],
                routeKey,
            }),
            ZammadGateway.getTicketCount(finalQuery, routeKey),
            getQueueCountsFromZammad(baseQuery, routeKey, zammadUserId),
        ]);

        await upsertOperationalTicketsToCache(ticketsRaw);
        const queueCounts = queueCountsFromZammad.all === 0 && ticketsRaw.length > 0
            ? await getQueueCountsFromCache(session.role, session.email, zammadUserId, scopedEmails)
            : queueCountsFromZammad;

        const routeHealth = getZammadRouteHealth(routeKey);
        const staleWarning = routeHealth.stale
            ? `Dados do Zammad desatualizados ha ${routeHealth.staleMinutes} min.`
            : undefined;

        return {
            success: true,
            data: formatTickets(ticketsRaw),
            pagination: buildPagination(page, pageSize, total, ticketsRaw.length),
            staleWarning,
            queueCounts,
        };
    } catch (error) {
        console.error("Erro ao buscar tickets:", error);

        const zammadUserId = isSystemRole(session.role)
            ? await ZammadGateway.getUserIdByEmail(session.email, "app-chamados-cache-fallback")
            : null;
        const scopedEmails = isSystemRole(session.role) ? [] : await getScopedCompanyUserEmails(session.userId);

        const cached = await listCachedTickets({
            role: session.role,
            email: session.email,
            scopedEmails,
            page,
            pageSize,
            queue,
            zammadUserId,
        });

        return {
            success: true,
            error: "Exibindo cache local por indisponibilidade do Zammad.",
            data: formatCachedTickets(cached.rows),
            pagination: buildPagination(page, pageSize, cached.total, cached.rows.length),
            staleWarning: "Dados carregados do cache local (sync incremental).",
            queueCounts: await getQueueCountsFromCache(session.role, session.email, zammadUserId, scopedEmails),
        };
    }
}

export async function createTicketAction(_prevState: unknown, formData: FormData) {
    const session = await getProtectedSession();
    if (!session) return { success: false, message: "Sessao expirada." };
    const ip = await getRequestIp();
    const rateLimit = consumeActionRateLimit({
        action: "createTicketAction",
        max: CREATE_TICKET_RATE_LIMIT.max,
        windowMs: CREATE_TICKET_RATE_LIMIT.windowMs,
        userId: session.userId,
        ip,
    });
    if (!rateLimit.allowed) {
        return { success: false, message: `Muitas tentativas. Aguarde ${rateLimit.retryAfterSeconds}s.` };
    }

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
            ticket: (() => {
                const sla = computeTicketSla({
                    createdAt: new Date(ticket.created_at),
                    firstResponseAt: ticket.first_response_at ? new Date(ticket.first_response_at) : null,
                    resolvedAt: ticket.close_at ? new Date(ticket.close_at) : null,
                    priorityId: ticket.priority_id ?? null,
                });

                return {
                    id: ticket.id,
                    title: ticket.title,
                    status: mapTicketStateLabel(ticket.state || ""),
                    number: ticket.number,
                    priority: ticket.priority_id ?? 2,
                    ownerId: ticket.owner_id ?? null,
                    updatedAt: ticket.updated_at ?? null,
                    firstResponseAt: ticket.first_response_at ?? null,
                    resolvedAt: ticket.close_at ?? null,
                    slaBreached: sla.breached,
                    slaWarning: sla.warning,
                    minutesToBreach: sla.minutesToBreach,
                    createdAt: new Date(ticket.created_at).toLocaleDateString("pt-BR"),
                };
            })(),
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

export async function ticketQuickAction(input: {
    ticketId: string | number;
    action: "assume" | "priority_high" | "macro_followup";
}) {
    const session = await getProtectedSession();
    if (!session || !isSystemRole(session.role)) {
        return { success: false, error: "Nao autorizado." };
    }

    try {
        const zammadUserId = await ZammadGateway.getUserIdByEmail(session.email, "app-chamados");

        if (input.action === "assume") {
            if (!zammadUserId) return { success: false, error: "Usuario Zammad nao encontrado para assumir ticket." };
            await ZammadGateway.updateTicket(input.ticketId, { owner_id: zammadUserId });
        }

        if (input.action === "priority_high") {
            await ZammadGateway.updateTicket(input.ticketId, { priority_id: 3 });
        }

        if (input.action === "macro_followup") {
            await ZammadGateway.addTicketReply(
                input.ticketId,
                "Atualizacao automatica: estamos analisando este chamado e retornaremos em breve."
            );
        }

        revalidateTag("tickets-list");
        revalidateTag("tickets-dashboard");
        revalidatePath("/app/chamados");
        return { success: true };
    } catch (error) {
        console.error("Erro em ticketQuickAction:", error);
        return { success: false, error: "Falha ao executar acao rapida." };
    }
}

export const getMyTicketsAction = getTicketsAction;
export const getAdminTicketsAction = getTicketsAction;
