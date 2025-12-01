import { getProtectedSession } from "@/lib/auth-helpers";
import { zammadService } from "@/core/infrastructure/gateways/zammad-service"; // Sua service do Zammad
import { TicketsContainer } from "@/components/platform/tickets/TicketsContainer";

export default async function AdminTicketsPage() {
    const session = await getProtectedSession();
    if (!session) return null;

    // 1. Buscar TODOS os tickets (Lógica de Admin)
    // Você pode criar um método específico no service como 'getAllTickets'
    const ticketsRaw = await zammadService.getUserTickets(session.email); // Exemplo

    // 2. Mapear para o formato da UI
    const tickets = ticketsRaw.map((t: any) => ({
        id: t.id,
        number: t.number,
        title: t.title,
        group: t.group,
        status: t.state,
        priority: t.priority_id,
        customer: t.customer || "Cliente Desconhecido", // O service deve trazer o nome do cliente
        createdAt: t.created_at,
        updatedAt: t.updated_at
    }));

    return <TicketsContainer tickets={tickets} isAdmin={true} />;
}