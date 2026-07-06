import { requireSession } from "@/lib/auth-helpers";
import { getTicketsAction } from "@/features/tickets/application/ticket-actions";
import { TicketsContainer } from "@/features/tickets/interface";
import { type QueueKey, type TicketStatusGroup, TICKET_QUEUE_KEYS, isTicketStatusGroup } from "@dosc-syspro/core";
import type { ClosedTicketsWindow, TicketSortBy, TicketSortOrder, TicketTeamFilter } from "@/features/tickets/domain/ticket-model";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { trpc } from "@/lib/api/trpc-client";
const CLOSED_WINDOW_OPTIONS: ClosedTicketsWindow[] = ["30d", "60d", "90d", "180d", "365d", "all"];
const TEAM_FILTER_OPTIONS: TicketTeamFilter[] = ["all", "SUPORTE", "DESENVOLVIMENTO"];
const SORT_BY_OPTIONS: TicketSortBy[] = ["updatedAt", "subject", "customer"];
const SORT_ORDER_OPTIONS: TicketSortOrder[] = ["asc", "desc"];

interface TicketsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  const renderStartedAt = Date.now();
  const session = await requireSession();
  const params = searchParams ? await searchParams : undefined;
  const pageParam = typeof params?.page === "string" ? Number(params.page) : 1;
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const queueParam = typeof params?.queue === "string" ? params.queue : "all";
  const search = typeof params?.search === "string" ? params.search : "";
  const companyId = typeof params?.companyId === "string" ? params.companyId : "";
  const statusParam = typeof params?.status === "string" ? params.status : "open";
  const teamParam = typeof params?.team === "string" ? params.team : undefined;
  const categoryParam = typeof params?.category === "string" ? params.category : "";
  const moduleParam = typeof params?.module === "string" ? params.module : "";
  const sortByParam = typeof params?.sortBy === "string" ? params.sortBy : "updatedAt";
  const sortOrderParam = typeof params?.sortOrder === "string" ? params.sortOrder : "desc";
  const statusGroup: TicketStatusGroup = isTicketStatusGroup(statusParam) ? statusParam : "open";
  const closedWindowParam =
    typeof params?.closedWindow === "string"
      ? params.closedWindow
      : statusGroup === "closed"
        ? "30d"
        : "all";

  const queue = TICKET_QUEUE_KEYS.includes(queueParam as QueueKey)
    ? (queueParam as QueueKey)
    : "all";
  const closedWindow: ClosedTicketsWindow = CLOSED_WINDOW_OPTIONS.includes(closedWindowParam as ClosedTicketsWindow)
    ? (closedWindowParam as ClosedTicketsWindow)
    : "all";
  const [canManageTickets, currentProfileResult] = await Promise.all([
    currentUserHasPermission("tickets:manage", { acceptCompanyScope: true }),
    trpc.users.getCurrentProfile.query().catch(() => null),
  ]);
  const derivedDefaultTeam: TicketTeamFilter = canManageTickets
    ? (currentProfileResult?.data?.preferences?.tickets?.defaultTeamFilter ?? "all")
    : "all";
  const resolvedTeamParam = teamParam ?? derivedDefaultTeam;
  const team: TicketTeamFilter = TEAM_FILTER_OPTIONS.includes(resolvedTeamParam as TicketTeamFilter)
    ? (resolvedTeamParam as TicketTeamFilter)
    : "all";
  const sortBy: TicketSortBy = SORT_BY_OPTIONS.includes(sortByParam as TicketSortBy)
    ? (sortByParam as TicketSortBy)
    : "updatedAt";
  const sortOrder: TicketSortOrder = SORT_ORDER_OPTIONS.includes(sortOrderParam as TicketSortOrder)
    ? (sortOrderParam as TicketSortOrder)
    : "desc";

  console.info("[TicketsDiag][page] loading", {
    at: new Date().toISOString(),
    userId: session.userId,
    role: session.role,
    page,
    queue,
    team,
    statusGroup,
    closedWindow,
    category: categoryParam || undefined,
    module: moduleParam || undefined,
    sortBy,
    sortOrder,
    hasSearch: Boolean(search.trim()),
    companyId: companyId || undefined,
  });

  const { data, success, pagination, staleWarning, queueCounts, statusCounts } = await getTicketsAction({
    page,
    pageSize: 50,
    queue,
    team: team === "all" ? undefined : team,
    search,
    companyId: companyId || undefined,
    statusGroup,
    closedWindow,
    category: categoryParam || undefined,
    module: moduleParam || undefined,
    sortBy,
    sortOrder,
  });

  if (!success || !data) {
    console.error("[TicketsDiag][page] load_failed", {
      at: new Date().toISOString(),
      userId: session.userId,
      role: session.role,
      elapsedMs: Date.now() - renderStartedAt,
    });
    return (
      <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2">
        <h3 className="font-semibold">Erro ao carregar chamados</h3>
        <p>Verifique sua conexao ou tente novamente mais tarde.</p>
      </div>
    );
  }

  const safePagination = pagination ?? {
    page,
    pageSize: 50,
    hasPreviousPage: false,
    hasNextPage: false,
    total: data.length,
  };
  const safeQueueCounts = queueCounts ?? { all: 0, my_queue: 0, unassigned: 0, critical: 0, no_response: 0 };
  const safeStatusCounts = statusCounts ?? { open: 0, development: 0, testing: 0, closed: 0 };

  console.info("[TicketsDiag][page] load_success", {
    at: new Date().toISOString(),
    userId: session.userId,
    role: session.role,
    ticketsCount: data.length,
    elapsedMs: Date.now() - renderStartedAt,
    pagination: safePagination,
  });

  return (
    <TicketsContainer
      tickets={data}
      canManageTickets={canManageTickets}
      pagination={safePagination}
      staleWarning={staleWarning}
      queue={queue}
      team={team}
      queueCounts={safeQueueCounts}
      statusCounts={safeStatusCounts}
      search={search}
      statusGroup={statusGroup}
      closedWindow={closedWindow}
      category={categoryParam}
      module={moduleParam}
      sortBy={sortBy}
      sortOrder={sortOrder}
    />
  );
}
