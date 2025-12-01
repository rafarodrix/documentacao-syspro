import { getTicketDetailsAction } from "@/actions/app/ticket-actions";
import { TicketDetails } from "@/components/platform/tickets/TicketDetails";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ClientTicketPage({ params }: PageProps) {
    const { id } = await params;
    const { ticket, articles, error } = await getTicketDetailsAction(id);

    return (
        <TicketDetails
            ticket={ticket}
            // CORREÇÃO AQUI: Adicionando '|| []' para garantir que nunca seja undefined
            articles={articles || []}
            error={error}
            isAdmin={false}
        />
    );
}