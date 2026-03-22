import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ZammadGateway } from "@/core/infrastructure/gateways/zammad-gateway";
import { ZammadOperationalTicket } from "@/core/application/schema/zammad-api.schema";
import { mapTicketStateLabel } from "@/core/infrastructure/mappers/zammad-ticket.mapper";
import { getZammadRouteHealth } from "@/core/infrastructure/observability/zammad-observability";
import { listCachedTickets, upsertOperationalTicketsToCache } from "@/core/infrastructure/cache/zammad-ticket-cache";
import { computeTicketSla } from "@/core/application/services/zammad-sla";
import {
    OPERATIONAL_STATE_IDS,
    getStateIdsForStatusGroup,
    type QueueKey,
    type TicketStatusGroup,
} from "@/core/config/tickets-workflow";
import type {
    TicketListItem,
    TicketQueryParams,
    TicketsDataResponse,
    TicketsPagination,
    TicketStatusCounts,
} from "@/components/platform/tickets/types";

const SYSTEM_ROLES = new Set<Role>([Role.ADMIN, Role.DEVELOPER, Role.SUPORTE]);

type TicketViewer = {
    userId: string;
    email: string;
    role: Role;
};

function isSystemRole(role: Role): boolean {
    return SYSTEM_ROLES.has(role);
}

async function getScopedCompanyZammadEmails(userId: string): Promise<string[]> {
    const memberships = await prisma.membership.findMany({
        where: { userId },
        select: { companyId: true },
    });

    const companyIds = memberships.map((membership) => membership.companyId);
    if (!companyIds.length) return [];

    const configured = await prisma.companyZammadEmail.findMany({
        where: {
            companyId: { in: companyIds },
            isActive: true,
        },
        select: { email: true },
    });

    return Array.from(
        new Set(configured.map((item) => item.email.trim().toLowerCase()).filter(Boolean))
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

function buildStateQuery(stateIds: readonly number[] = OPERATIONAL_STATE_IDS): string {
    return `(${stateIds.map((id) => `state_id:${id}`).join(" OR ")})`;
}

function buildEmailScopeQuery(emails: string[]): string {
    const normalized = Array.from(new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)));
    if (!normalized.length) return "";
    return `(${normalized.map((email) => `customer.email:${email}`).join(" OR ")})`;
}

function buildQueueQuery(queue: QueueKey, zammadUserId?: number | null): string {
    if (queue === "critical") return "priority_id:3";
    if (queue === "unassigned") return "owner_id:null";
    if (queue === "no_response") return "first_response_at:null";
    if (queue === "my_queue") return zammadUserId ? `owner_id:${zammadUserId}` : "id:-1";
    return "";
}

function escapeSearchTerm(term: string): string {
    return term.replace(/["\\]/g, "").trim();
}

function buildSearchQuery(search?: string, includeCustomer = false): string {
    const term = escapeSearchTerm(search || "");
    if (!term) return "";

    const parts = [
        `number:${term}`,
        `title:${term}`,
        `"${term}"`,
    ];

    if (includeCustomer) {
        parts.push(`customer:${term}`);
    }

    return `(${parts.join(" OR ")})`;
}

function combineQueryParts(...parts: Array<string | null | undefined>): string {
    return parts.filter(Boolean).map((part) => `(${part})`).join(" AND ");
}

function buildStatusQuery(statusGroup?: TicketStatusGroup | "all"): string {
    if (!statusGroup || statusGroup === "all") return "";
    return buildStateQuery(getStateIdsForStatusGroup(statusGroup));
}

async function getQueueCountsFromZammad(
    baseQuery: string,
    routeKey: string,
    zammadUserId: number | null,
    searchQuery: string
): Promise<Record<QueueKey, number>> {
    const queueBaseQuery = combineQueryParts(baseQuery, searchQuery);

    const [all, myQueue, unassigned, critical, noResponse] = await Promise.all([
        ZammadGateway.getTicketCount(queueBaseQuery, routeKey),
        zammadUserId
            ? ZammadGateway.getTicketCount(combineQueryParts(queueBaseQuery, buildQueueQuery("my_queue", zammadUserId)), routeKey)
            : Promise.resolve(0),
        ZammadGateway.getTicketCount(combineQueryParts(queueBaseQuery, buildQueueQuery("unassigned")), routeKey),
        ZammadGateway.getTicketCount(combineQueryParts(queueBaseQuery, buildQueueQuery("critical")), routeKey),
        ZammadGateway.getTicketCount(combineQueryParts(queueBaseQuery, buildQueueQuery("no_response")), routeKey),
    ]);

    return {
        all,
        my_queue: myQueue,
        unassigned,
        critical,
        no_response: noResponse,
    };
}

async function getStatusCountsFromZammad(
    scopedQuery: string,
    routeKey: string
): Promise<TicketStatusCounts> {
    const [open, pending, closed] = await Promise.all([
        ZammadGateway.getTicketCount(combineQueryParts(scopedQuery, buildStatusQuery("open")), routeKey),
        ZammadGateway.getTicketCount(combineQueryParts(scopedQuery, buildStatusQuery("pending")), routeKey),
        ZammadGateway.getTicketCount(combineQueryParts(scopedQuery, buildStatusQuery("closed")), routeKey),
    ]);

    return { open, pending, closed };
}

function buildCacheWhere(input: {
    role: Role;
    email: string;
    scopedEmails: string[];
    queue: QueueKey;
    zammadUserId: number | null;
    search?: string;
    statusGroup?: TicketStatusGroup | "all";
}): Prisma.ZammadTicketCacheWhereInput {
    const where: Prisma.ZammadTicketCacheWhereInput = {
        stateId: { in: [...OPERATIONAL_STATE_IDS] },
    };

    if (!isSystemRole(input.role)) {
        const emails = input.scopedEmails.length ? input.scopedEmails : [input.email];
        where.OR = emails.map((value) => ({
            customer: { contains: value, mode: "insensitive" },
        }));
    }

    const search = escapeSearchTerm(input.search || "");
    if (search) {
        const searchConditions: Prisma.ZammadTicketCacheWhereInput[] = [
            { number: { contains: search, mode: "insensitive" } },
            { title: { contains: search, mode: "insensitive" } },
        ];
        if (isSystemRole(input.role)) {
            searchConditions.push({ customer: { contains: search, mode: "insensitive" } });
        }
        const existingAnd = where.AND
            ? Array.isArray(where.AND)
                ? where.AND
                : [where.AND]
            : [];

        where.AND = [...existingAnd, { OR: searchConditions }];
    }

    if (input.queue === "my_queue") {
        if (input.zammadUserId) {
            where.ownerId = input.zammadUserId;
        } else {
            where.zammadTicketId = -1;
        }
    }

    if (input.queue === "unassigned") {
        where.ownerId = null;
    }

    if (input.queue === "critical") {
        where.priorityId = 3;
    }

    if (input.queue === "no_response") {
        where.firstResponseAt = null;
    }

    if (input.statusGroup && input.statusGroup !== "all") {
        where.stateId = { in: [...getStateIdsForStatusGroup(input.statusGroup)] };
    }

    return where;
}

async function getQueueCountsFromCache(input: {
    role: Role;
    email: string;
    scopedEmails: string[];
    zammadUserId: number | null;
    search?: string;
}): Promise<Record<QueueKey, number>> {
    const [all, myQueue, unassigned, critical, noResponse] = await Promise.all([
        prisma.zammadTicketCache.count({
            where: buildCacheWhere({ ...input, queue: "all", statusGroup: "all" }),
        }),
        input.zammadUserId
            ? prisma.zammadTicketCache.count({
                where: buildCacheWhere({ ...input, queue: "my_queue", statusGroup: "all" }),
            })
            : Promise.resolve(0),
        prisma.zammadTicketCache.count({
            where: buildCacheWhere({ ...input, queue: "unassigned", statusGroup: "all" }),
        }),
        prisma.zammadTicketCache.count({
            where: buildCacheWhere({ ...input, queue: "critical", statusGroup: "all" }),
        }),
        prisma.zammadTicketCache.count({
            where: buildCacheWhere({ ...input, queue: "no_response", statusGroup: "all" }),
        }),
    ]);

    return {
        all,
        my_queue: myQueue,
        unassigned,
        critical,
        no_response: noResponse,
    };
}

async function getStatusCountsFromCache(input: {
    role: Role;
    email: string;
    scopedEmails: string[];
    zammadUserId: number | null;
    queue: QueueKey;
    search?: string;
}): Promise<TicketStatusCounts> {
    const [open, pending, closed] = await Promise.all([
        prisma.zammadTicketCache.count({
            where: buildCacheWhere({ ...input, statusGroup: "open" }),
        }),
        prisma.zammadTicketCache.count({
            where: buildCacheWhere({ ...input, statusGroup: "pending" }),
        }),
        prisma.zammadTicketCache.count({
            where: buildCacheWhere({ ...input, statusGroup: "closed" }),
        }),
    ]);

    return { open, pending, closed };
}

export async function queryTicketsForViewer(
    viewer: TicketViewer,
    params: TicketQueryParams = {}
): Promise<TicketsDataResponse> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(50, Math.max(10, params.pageSize ?? 20));
    const queue = params.queue ?? "all";
    const statusGroup = params.statusGroup ?? "all";
    const search = (params.search || "").trim();

    const routeKey = "app-chamados";
    const stateQuery = buildStateQuery();
    const zammadUserId = isSystemRole(viewer.role)
        ? await ZammadGateway.getUserIdByEmail(viewer.email, routeKey)
        : null;
    const scopedEmails = isSystemRole(viewer.role) ? [] : await getScopedCompanyZammadEmails(viewer.userId);

    if (!isSystemRole(viewer.role) && !scopedEmails.length) {
        return {
            success: true,
            data: [],
            pagination: buildPagination(page, pageSize, 0, 0),
            queueCounts: { all: 0, my_queue: 0, unassigned: 0, critical: 0, no_response: 0 },
            statusCounts: { open: 0, pending: 0, closed: 0 },
        };
    }

    const baseQuery = isSystemRole(viewer.role)
        ? stateQuery
        : combineQueryParts(buildEmailScopeQuery(scopedEmails), stateQuery);
    const searchQuery = buildSearchQuery(search, isSystemRole(viewer.role));
    const queueQuery = buildQueueQuery(queue, zammadUserId);
    const scopedQuery = combineQueryParts(baseQuery, searchQuery, queueQuery);
    const finalQuery = combineQueryParts(scopedQuery, buildStatusQuery(statusGroup));

    try {
        const [ticketsRaw, total, queueCounts, statusCounts] = await Promise.all([
            ZammadGateway.searchOperationalTickets(finalQuery, {
                limit: pageSize,
                page,
                cacheTtlSeconds: 45,
                tags: ["tickets-list", "tickets-dashboard"],
                routeKey,
            }),
            ZammadGateway.getTicketCount(finalQuery, routeKey),
            getQueueCountsFromZammad(baseQuery, routeKey, zammadUserId, searchQuery),
            getStatusCountsFromZammad(scopedQuery, routeKey),
        ]);

        await upsertOperationalTicketsToCache(ticketsRaw);

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
            statusCounts,
        };
    } catch (error) {
        console.error("Erro ao consultar tickets no service:", error);

        const cacheInput = {
            role: viewer.role,
            email: viewer.email,
            scopedEmails,
            zammadUserId,
            search,
        };

        const cached = await listCachedTickets({
            role: viewer.role,
            email: viewer.email,
            scopedEmails,
            page,
            pageSize,
            queue,
            zammadUserId,
            search,
            statusGroup,
        });

        return {
            success: true,
            error: "Exibindo cache local por indisponibilidade do Zammad.",
            data: formatCachedTickets(cached.rows),
            pagination: buildPagination(page, pageSize, cached.total, cached.rows.length),
            staleWarning: "Dados carregados do cache local (sync incremental).",
            queueCounts: await getQueueCountsFromCache(cacheInput),
            statusCounts: await getStatusCountsFromCache({ ...cacheInput, queue }),
        };
    }
}
