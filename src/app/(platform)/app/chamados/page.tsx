import { getProtectedSession } from "@/lib/auth-helpers";
import { zammadService } from "@/core/infrastructure/gateways/zammad-service";
import { TicketsContainer } from "@/components/platform/tickets/TicketsContainer";

export default async function ClientTicketsPage() {
    const session = await getProtectedSession();
    if (!session) return null;

    // 1. Buscar Tickets DO USUÁRIO (Lógica de Cliente)
    const ticketsRaw = await zammadService.getUserTickets(session.email); // Seu método de filtro por email

    // 2. Mapear
    const tickets = ticketsRaw.map((t: any) => ({
        id: t.id,
        number: t.number,
        title: t.title,
        group: t.group,
        status: t.state,
        priority: t.priority_id,
        customer: "Eu", // Não importa para o cliente
        createdAt: t.created_at,
        updatedAt: t.updated_at
    }));

    return <TicketsContainer tickets={tickets} isAdmin={false} />;
}