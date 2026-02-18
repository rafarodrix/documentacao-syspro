import { getTicketDetailsAction } from "@/actions/tickets/ticket-actions";
import { TicketDetails } from "@/components/platform/tickets/TicketDetails";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ClientTicketPage({ params }: PageProps) {
    const { id } = await params;
    // A action pode retornar articles como undefined se der erro
    const { ticket, articles, error } = await getTicketDetailsAction(id);

    return (
        <TicketDetails
            ticket={ticket}
            // CORREÇÃO: Garante array vazio se undefined
            articles={articles || []}
            error={error}
            isAdmin={false}
        />
    );
}