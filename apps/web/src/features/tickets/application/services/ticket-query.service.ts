import { TicketGateway } from "@/features/tickets/infrastructure/gateways/ticket-gateway";
import { getTicketRouteHealth } from "@/features/tickets/infrastructure/observability/ticket-observability";
import { buildClosedWindowQuery, buildEmailScopeQuery, buildQueueQuery, buildSearchQuery, buildStatusQuery, buildTrackedStatusQuery, combineQueryParts } from "@/features/tickets/application/services/ticket-query-builders";
import { buildPagination, formatTickets } from "@/features/tickets/application/services/ticket-query-formatters";
import { getScopedCompanyTicketEmails, isSystemRole, type TicketViewer } from "@/features/tickets/application/services/ticket-scope.service";
import type { TicketQueryParams, TicketsDataResponse } from "@/components/platform/tickets/types";
import type { QueueKey } from "@dosc-syspro/core";

const EMPTY_QUEUE_COUNTS = { all: 0, my_queue: 0, unassigned: 0, critical: 0, no_response: 0 } as const;
const EMPTY_STATUS_COUNTS = { open: 0, pending: 0, closed: 0 } as const;

type TicketQueryExecutionOptions = {
  includeQueueCounts?: boolean;
  includeStatusCounts?: boolean;
};

async function safeGetTicketCount(query: string, routeKey: string): Promise<number> {
  try {
    return await TicketGateway.getTicketCount(query, routeKey);
  } catch (error) {
    console.error("Falha ao obter contagem de tickets:", error);
    return 0;
  }
}

function buildCountQuery(input: {
  viewerScopeQuery: string;
  searchQuery: string;
  queueQuery: string;
  statusQuery: string;
}): string {
  return combineQueryParts(input.viewerScopeQuery, input.searchQuery, input.queueQuery, input.statusQuery);
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

  const routeKey = "app-chamados";
  const trackedStatusQuery = buildTrackedStatusQuery();
  const zammadUserId = isSystemRole(viewer.role)
    ? await TicketGateway.getUserIdByEmail(viewer.email, routeKey)
    : null;
  const scopedEmails = isSystemRole(viewer.role) ? [] : await getScopedCompanyTicketEmails(viewer.userId);

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
    const ticketsPage = await TicketGateway.searchOperationalTicketsPage(finalQuery, {
      limit: pageSize,
      page,
      routeKey,
    });
    const ticketsRaw = ticketsPage.tickets;

    const queueCountQueries: Record<QueueKey, string> = {
      all: buildCountQuery({
        viewerScopeQuery,
        searchQuery,
        queueQuery: buildQueueQuery("all", zammadUserId),
        statusQuery: trackedStatusQuery,
      }),
      my_queue: buildCountQuery({
        viewerScopeQuery,
        searchQuery,
        queueQuery: buildQueueQuery("my_queue", zammadUserId),
        statusQuery: trackedStatusQuery,
      }),
      unassigned: buildCountQuery({
        viewerScopeQuery,
        searchQuery,
        queueQuery: buildQueueQuery("unassigned", zammadUserId),
        statusQuery: trackedStatusQuery,
      }),
      critical: buildCountQuery({
        viewerScopeQuery,
        searchQuery,
        queueQuery: buildQueueQuery("critical", zammadUserId),
        statusQuery: trackedStatusQuery,
      }),
      no_response: buildCountQuery({
        viewerScopeQuery,
        searchQuery,
        queueQuery: buildQueueQuery("no_response", zammadUserId),
        statusQuery: trackedStatusQuery,
      }),
    };

    const queueCounts = includeQueueCounts
      ? {
          all: await safeGetTicketCount(queueCountQueries.all, routeKey),
          my_queue: await safeGetTicketCount(queueCountQueries.my_queue, routeKey),
          unassigned: await safeGetTicketCount(queueCountQueries.unassigned, routeKey),
          critical: await safeGetTicketCount(queueCountQueries.critical, routeKey),
          no_response: await safeGetTicketCount(queueCountQueries.no_response, routeKey),
        }
      : { ...EMPTY_QUEUE_COUNTS };

    const statusCounts = includeStatusCounts
      ? {
          open: await safeGetTicketCount(
            buildCountQuery({
              viewerScopeQuery,
              searchQuery,
              queueQuery,
              statusQuery: buildStatusQuery("open"),
            }),
            routeKey
          ),
          pending: await safeGetTicketCount(
            buildCountQuery({
              viewerScopeQuery,
              searchQuery,
              queueQuery,
              statusQuery: buildStatusQuery("pending"),
            }),
            routeKey
          ),
          closed: await safeGetTicketCount(
            buildCountQuery({
              viewerScopeQuery,
              searchQuery,
              queueQuery,
              statusQuery: buildStatusQuery("closed"),
            }),
            routeKey
          ),
        }
      : { ...EMPTY_STATUS_COUNTS };

    const routeHealth = getTicketRouteHealth(routeKey);
    const staleWarning = routeHealth.stale
      ? `Dados de tickets desatualizados ha ${routeHealth.staleMinutes} min.`
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

    return {
      success: false,
      error: "Falha ao consultar tickets no backend.",
      data: [],
      pagination: buildPagination(page, pageSize, 0, 0),
      queueCounts: { ...EMPTY_QUEUE_COUNTS },
      statusCounts: { ...EMPTY_STATUS_COUNTS },
    };
  }
}



