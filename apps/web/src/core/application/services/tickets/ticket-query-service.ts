import { ZammadGateway } from "@/core/infrastructure/gateways/zammad-gateway";
import { getZammadRouteHealth } from "@/core/infrastructure/observability/zammad-observability";
import { listCachedTickets, upsertOperationalTicketsToCache } from "@/core/infrastructure/cache/zammad-ticket-cache";
import { buildEmailScopeQuery, buildOperationalStatusQuery, buildQueueQuery, buildSearchQuery, buildStatusQuery, buildTrackedStatusQuery, combineQueryParts } from "@/features/tickets/application/services/ticket-query-builders";
import { getQueueCountsFromCache, getQueueCountsFromZammad, getStatusCountsFromCache, getStatusCountsFromZammad } from "@/features/tickets/application/services/ticket-query-counts.service";
import { buildPagination, formatCachedTickets, formatTickets } from "@/features/tickets/application/services/ticket-query-formatters";
import { getScopedCompanyZammadEmails, isSystemRole, type TicketViewer } from "@/features/tickets/application/services/ticket-scope.service";
import type { TicketQueryParams, TicketsDataResponse } from "@/components/platform/tickets/types";

export async function queryTicketsForViewer(
  viewer: TicketViewer,
  params: TicketQueryParams = {}
): Promise<TicketsDataResponse> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(20, Math.max(10, params.pageSize ?? 20));
  const queue = params.queue ?? "all";
  const statusGroup = params.statusGroup ?? "all";
  const search = (params.search || "").trim();

  const routeKey = "app-chamados";
  const trackedStatusQuery = buildTrackedStatusQuery();
  const operationalStatusQuery = buildOperationalStatusQuery();
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

  const viewerScopeQuery = isSystemRole(viewer.role) ? "" : buildEmailScopeQuery(scopedEmails);
  const searchQuery = buildSearchQuery(search, isSystemRole(viewer.role));
  const queueQuery = buildQueueQuery(queue, zammadUserId);
  const scopedQuery = combineQueryParts(viewerScopeQuery, searchQuery, queueQuery);
  const finalQuery = combineQueryParts(
    scopedQuery,
    statusGroup === "all" ? trackedStatusQuery : buildStatusQuery(statusGroup)
  );

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
      getQueueCountsFromZammad(combineQueryParts(viewerScopeQuery, operationalStatusQuery), routeKey, zammadUserId, searchQuery),
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
