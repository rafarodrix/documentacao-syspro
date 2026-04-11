import { getTicketDetailsAction } from "@/features/tickets/application/ticket-actions";
import { TicketDetails } from "@/features/tickets/interface";
import { requireSession } from "@/lib/auth-helpers";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientTicketPage({ params }: PageProps) {
  await requireSession();
  const isAdmin = await currentUserHasPermission("tickets:manage", { acceptCompanyScope: true });

  try {
    const { id } = await params;
    const ticketId = (id || "").trim();
    if (!ticketId) {
      return <TicketDetails articles={[]} error="Identificador do chamado invalido." isAdmin={isAdmin} />;
    }

    const result = await getTicketDetailsAction(ticketId);
    if (!result.success) {
      return <TicketDetails articles={[]} error={result.error} isAdmin={isAdmin} />;
    }

    return <TicketDetails ticket={result.ticket} articles={result.articles} isAdmin={isAdmin} />;
  } catch (error) {
    console.error("Erro ao abrir pagina do ticket:", error);
    return <TicketDetails articles={[]} error="Falha ao abrir o chamado. Tente novamente." isAdmin={isAdmin} />;
  }
}
