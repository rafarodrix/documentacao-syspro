import { requireSession } from "@/lib/auth-helpers";
import { getTicketsAction } from "@/features/tickets/application/actions";
import { TicketsContainer } from "@/features/tickets/interface";
import { Role } from "@prisma/client";
import { type QueueKey, type TicketStatusGroup, TICKET_QUEUE_KEYS, isTicketStatusGroup } from "@dosc-syspro/core";

const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];

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

  const queue = TICKET_QUEUE_KEYS.includes(queueParam as QueueKey)
    ? (queueParam as QueueKey)
    : "all";
  const statusGroup: TicketStatusGroup = isTicketStatusGroup(statusParam) ? statusParam : "open";

  const { data, success, pagination, staleWarning, queueCounts, statusCounts } = await getTicketsAction({
    page,
    pageSize: 20,
    queue,
    search,
    statusGroup,
  });

  if (!success || !data) {
    return (
      <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2">
        <h3 className="font-semibold">Erro ao carregar chamados</h3>
        <p>Verifique sua conexao ou as configuracoes do Zammad.</p>
      </div>
    );
  }

  return (
    <TicketsContainer
      tickets={data}
      isAdmin={SYSTEM_ROLES.includes(session.role)}
      pagination={pagination}
      staleWarning={staleWarning}
      queue={queue}
      queueCounts={queueCounts}
      statusCounts={statusCounts}
      search={search}
      statusGroup={statusGroup}
    />
  );
}

