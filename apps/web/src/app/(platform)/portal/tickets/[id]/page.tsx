import { getTicketDetailsAction } from "@/features/tickets/application/ticket-actions";
import { TicketDetails } from "@/features/tickets/interface";
import { requireSession, getProtectedSession } from "@/lib/auth-helpers";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientTicketPage({ params }: PageProps) {
  await requireSession();
  const session = await getProtectedSession();
  const canManageTickets = await currentUserHasPermission("tickets:manage", { acceptCompanyScope: true });

  try {
    const { id } = await params;
    const ticketId = (id || "").trim();
    if (!ticketId) {
      return <TicketDetails articles={[]} error="Identificador do chamado invalido." canManageTickets={canManageTickets} currentUserId={session?.userId} />;
    }

    const result = await getTicketDetailsAction(ticketId, { page: 1, pageSize: 50 });
    if (!result.success) {
      return <TicketDetails articles={[]} error={result.error} canManageTickets={canManageTickets} currentUserId={session?.userId} />;
    }

    return <TicketDetails ticket={result.ticket} articles={result.articles} messagePagination={result.messagePagination} canManageTickets={canManageTickets} currentUserId={session?.userId} />;
  } catch (error) {
    console.error("Erro ao abrir pagina do ticket:", error);
    return <TicketDetails articles={[]} error="Falha ao abrir o chamado. Tente novamente." canManageTickets={canManageTickets} currentUserId={session?.userId} />;
  }
}
