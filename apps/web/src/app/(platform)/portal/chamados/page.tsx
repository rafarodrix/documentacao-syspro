import { requireSession } from "@/lib/auth-helpers";
import { getTicketsAction } from "@/features/tickets/application/actions";
import { TicketsContainer } from "@/features/tickets/interface";
import { Role } from "@prisma/client";
import { type QueueKey, type TicketStatusGroup, TICKET_QUEUE_KEYS, isTicketStatusGroup } from "@dosc-syspro/core";
import type { ClosedTicketsWindow } from "@/features/tickets/domain/model";

const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];
const CLOSED_WINDOW_OPTIONS: ClosedTicketsWindow[] = ["30d", "60d", "90d", "180d", "365d", "all"];

interface TicketsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  const session = await requireSession();
  const params = searchParams ? await searchParams : undefined;
  const pageParam = typeof params?.page === "string" ? Number(params.page) : 1;
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const queueParam = typeof params?.queue === "string" ? params.queue : "all";
  const search = typeof params?.search === "string" ? params.search : "";
  const statusParam = typeof params?.status === "string" ? params.status : "open";
  const closedWindowParam = typeof params?.closedWindow === "string" ? params.closedWindow : "30d";

  const queue = TICKET_QUEUE_KEYS.includes(queueParam as QueueKey)
    ? (queueParam as QueueKey)
    : "all";
  const statusGroup: TicketStatusGroup = isTicketStatusGroup(statusParam) ? statusParam : "open";
  const closedWindow: ClosedTicketsWindow = CLOSED_WINDOW_OPTIONS.includes(closedWindowParam as ClosedTicketsWindow)
    ? (closedWindowParam as ClosedTicketsWindow)
    : "30d";

  const { data, success, pagination, staleWarning, queueCounts, statusCounts } = await getTicketsAction({
    page,
    pageSize: 20,
    queue,
    search,
    statusGroup,
    closedWindow,
  });

  if (!success || !data) {
    return (
      <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2">
        <h3 className="font-semibold">Erro ao carregar chamados</h3>
        <p>Verifique sua conexao ou as configuracoes do Zammad.</p>
      </div>
    );
  }

  const safePagination = pagination ?? {
    page,
    pageSize: 20,
    hasPreviousPage: false,
    hasNextPage: false,
    total: data.length,
  };
  const safeQueueCounts = queueCounts ?? { all: 0, my_queue: 0, unassigned: 0, critical: 0, no_response: 0 };
  const safeStatusCounts = statusCounts ?? { open: 0, pending: 0, closed: 0 };

  return (
    <TicketsContainer
      tickets={data}
      isAdmin={SYSTEM_ROLES.includes(session.role)}
      pagination={safePagination}
      staleWarning={staleWarning}
      queue={queue}
      queueCounts={safeQueueCounts}
      statusCounts={safeStatusCounts}
      search={search}
      statusGroup={statusGroup}
      closedWindow={closedWindow}
    />
  );
}
