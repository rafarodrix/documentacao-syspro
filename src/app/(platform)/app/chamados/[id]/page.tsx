import { Role } from "@prisma/client";
import { getTicketDetailsAction } from "@/actions/tickets/ticket-actions";
import { TicketDetails } from "@/components/platform/tickets/TicketDetails";
import { requireSession } from "@/lib/auth-helpers";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ClientTicketPage({ params }: PageProps) {
    const session = await requireSession();
    const { id } = await params;
    const { ticket, articles, error } = await getTicketDetailsAction(id);
    const isAdmin = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE].includes(session.role);

    return <TicketDetails ticket={ticket} articles={articles || []} error={error} isAdmin={isAdmin} />;
}
