import { ZammadGateway } from "@/features/tickets/infrastructure/gateways/zammad-gateway";
import { getZammadRouteHealth } from "@/features/tickets/infrastructure/observability/zammad-observability";
import {
  getLatestOperationalTicketCacheFreshness,
  listCachedTickets,
  upsertOperationalTicketsToCache,
} from "@/features/tickets/infrastructure/cache/zammad-ticket-cache";
import { buildClosedWindowQuery, buildEmailScopeQuery, buildQueueQuery, buildSearchQuery, buildStatusQuery, buildTrackedStatusQuery, combineQueryParts } from "@/features/tickets/application/services/ticket-query-builders";
import { getQueueCountsFromCache, getStatusCountsFromCache } from "@/features/tickets/application/services/ticket-query-counts.service";
import { getTicketMetricsSnapshot } from "@/features/tickets/application/services/ticket-metrics-snapshot.service";
import { buildPagination, formatCachedTickets, formatTickets } from "@/features/tickets/application/services/ticket-query-formatters";
import { getScopedCompanyZammadEmails, isSystemRole, type TicketViewer } from "@/features/tickets/application/services/ticket-scope.service";
import type { TicketQueryParams, TicketsDataResponse } from "@/components/platform/tickets/types";

const TRANSPARENT_CACHE_THRESHOLD_MINUTES = 15;
const EMPTY_QUEUE_COUNTS = { all: 0, my_queue: 0, unassigned: 0, critical: 0, no_response: 0 } as const;
const EMPTY_STATUS_COUNTS = { open: 0, pending: 0, closed: 0 } as const;

type TicketQueryExecutionOptions = {
  includeQueueCounts?: boolean;
  includeStatusCounts?: boolean;
};

function buildCacheFallbackWarning(input: { hasCache: boolean; staleMinutes: number | null }): string | undefined {
  if (!input.hasCache) {
    return "Zammad indisponivel e cache local ainda nao possui dados sincronizados.";
  }

  if (input.staleMinutes !== null && input.staleMinutes <= TRANSPARENT_CACHE_THRESHOLD_MINUTES) {
    return undefined;
  }

  if (input.staleMinutes !== null) {
    return `Dados carregados do cache local (${input.staleMinutes} min sem sincronizacao).`;
  }

  return "Dados carregados do cache local por indisponibilidade do Zammad.";
}

function shouldUseMetricsSnapshot(search: string): boolean {
  return search.length === 0;
}

export async function queryTicketsForViewer(
  viewer: TicketViewer,
  params: TicketQueryParams = {},
  options: TicketQueryExecutionOptions = {}
): Promise<TicketsDataResponse> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(20, Math.max(10, params.pageSize ?? 20));
  const queue = params.queue ?? "all";
  const statusGroup = params.statusGroup ?? "all";
  const closedWindow = params.closedWindow ?? "30d";
  const search = (params.search || "").trim();
  const includeQueueCounts = options.includeQueueCounts ?? true;
  const includeStatusCounts = options.includeStatusCounts ?? true;
  const shouldResolveMetrics = includeQueueCounts || includeStatusCounts;
  const canUseMetricsSnapshot = shouldResolveMetrics && shouldUseMetricsSnapshot(search);

  const routeKey = "app-chamados";
  const trackedStatusQuery = buildTrackedStatusQuery();
  const zammadUserId = isSystemRole(viewer.role)
    ? await ZammadGateway.getUserIdByEmail(viewer.email, routeKey)
    : null;
  const scopedEmails = isSystemRole(viewer.role) ? [] : await getScopedCompanyZammadEmails(viewer.userId);

  if (!isSystemRole(viewer.role) && !scopedEmails.length) {
    return {
      success: true,
      data: [],
      pagination: buildPagination(page, pageSize, 0, 0),
      queueCounts: { ...EMPTY_QUEUE_COUNTS },
      statusCounts: { ...EMPTY_STATUS_COUNTS },
    };
  }

  const viewerScopeQuery = isSystemRole(viewer.role) ? "" : buildEmailScopeQuery(scopedEmails);
  const searchQuery = buildSearchQuery(search, isSystemRole(viewer.role));
  const queueQuery = buildQueueQuery(queue, zammadUserId);
  const scopedQuery = combineQueryParts(viewerScopeQuery, searchQuery, queueQuery);
  const finalQuery = combineQueryParts(
    scopedQuery,
    statusGroup === "all" ? trackedStatusQuery : buildStatusQuery(statusGroup),
    statusGroup === "closed" ? buildClosedWindowQuery(closedWindow) : ""
  );

  try {
    const ticketsPage = await ZammadGateway.searchOperationalTicketsPage(finalQuery, {
      limit: pageSize,
      page,
      cacheTtlSeconds: 45,
      tags: ["tickets-list", "tickets-dashboard"],
      routeKey,
    });
    const ticketsRaw = ticketsPage.tickets;

    await upsertOperationalTicketsToCache(ticketsRaw);
    const cacheInput = {
      role: viewer.role,
      email: viewer.email,
      scopedEmails,
      zammadUserId,
      search,
    };
    const snapshot = canUseMetricsSnapshot
      ? await getTicketMetricsSnapshot({
          role: viewer.role,
          email: viewer.email,
          scopedEmails,
          zammadUserId,
        })
      : null;
    const [queueCounts, statusCounts] = snapshot
      ? await Promise.all([
          includeQueueCounts ? Promise.resolve(snapshot.queueCounts) : Promise.resolve({ ...EMPTY_QUEUE_COUNTS }),
          includeStatusCounts
            ? Promise.resolve(snapshot.statusCountsByQueue[queue] ?? { ...EMPTY_STATUS_COUNTS })
            : Promise.resolve({ ...EMPTY_STATUS_COUNTS }),
        ])
      : await Promise.all([
          includeQueueCounts
            ? getQueueCountsFromCache(cacheInput)
            : Promise.resolve({ ...EMPTY_QUEUE_COUNTS }),
          includeStatusCounts
            ? getStatusCountsFromCache({ ...cacheInput, queue })
            : Promise.resolve({ ...EMPTY_STATUS_COUNTS }),
        ]);

    const routeHealth = getZammadRouteHealth(routeKey);
    const staleWarning = routeHealth.stale
      ? `Dados do Zammad desatualizados ha ${routeHealth.staleMinutes} min.`
      : undefined;

    return {
      success: true,
      data: formatTickets(ticketsRaw),
      pagination: buildPagination(page, pageSize, ticketsPage.total, ticketsRaw.length),
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

    const [cached, cacheFreshness] = await Promise.all([
      listCachedTickets({
        role: viewer.role,
        email: viewer.email,
        scopedEmails,
        page,
        pageSize,
        queue,
        zammadUserId,
        search,
        statusGroup,
        closedWindow,
      }),
      getLatestOperationalTicketCacheFreshness(),
    ]);
    const snapshot = canUseMetricsSnapshot
      ? await getTicketMetricsSnapshot({
          role: viewer.role,
          email: viewer.email,
          scopedEmails,
          zammadUserId,
        })
      : null;
    const queueCounts = snapshot?.queueCounts ?? await getQueueCountsFromCache(cacheInput);
    const statusCounts = snapshot?.statusCountsByQueue[queue] ?? await getStatusCountsFromCache({ ...cacheInput, queue });

    return {
      success: true,
      data: formatCachedTickets(cached.rows),
      pagination: buildPagination(page, pageSize, cached.total, cached.rows.length),
      staleWarning: buildCacheFallbackWarning(cacheFreshness),
      queueCounts,
      statusCounts,
    };
  }
}
