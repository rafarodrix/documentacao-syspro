import { Role } from "@prisma/client";
import { getTicketDetailsAction } from "@/features/tickets/application/ticket-actions";
import { TicketDetails } from "@/components/platform/tickets/TicketDetails";
import { requireSession } from "@/lib/auth-helpers";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientTicketPage({ params }: PageProps) {
  const session = await requireSession();
  const isAdmin = session.role === Role.ADMIN || session.role === Role.DEVELOPER || session.role === Role.SUPORTE;

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
