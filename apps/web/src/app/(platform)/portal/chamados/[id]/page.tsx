import { Role } from "@prisma/client";
import { getTicketDetailsAction } from "@/features/tickets/application/actions";
import { TicketDetails } from "@/components/platform/tickets/TicketDetails";
import { requireSession } from "@/lib/auth-helpers";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ClientTicketPage({ params }: PageProps) {
    const session = await requireSession();
    const { id } = await params;
    const result = await getTicketDetailsAction(id);
    const isAdmin = session.role === Role.ADMIN || session.role === Role.DEVELOPER || session.role === Role.SUPORTE;

    if (!result.success) {
        return <TicketDetails articles={[]} error={result.error} isAdmin={isAdmin} />;
    }

    return <TicketDetails ticket={result.ticket} articles={result.articles} isAdmin={isAdmin} />;
}

