"use server";

import { getProtectedSession } from "@/lib/auth-helpers";
import { ZammadClient } from "@/lib/zammad-client";

// Roles permitidas para ver a central de suporte
const SUPPORT_ROLES = ["ADMIN", "DEVELOPER", "SUPORTE"];

export async function getAdminTicketsAction() {
    const session = await getProtectedSession();

    if (!session || !SUPPORT_ROLES.includes(session.role)) {
        return { success: false, error: "Acesso não autorizado." };
    }

    try {
        const tickets = await ZammadClient.getAllTickets();

        // Mapeamento para facilitar o uso no frontend
        const formattedTickets = tickets.map((t: any) => ({
            id: t.id,
            number: t.number,
            title: t.title,
            group: t.group,
            status: t.state,
            priority: t.priority_id, // Você pode mapear para string se quiser
            customer: t.customer_id, // O Zammad retorna o ID, se usar expand=true no client, pode pegar o objeto
            createdAt: new Date(t.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
            updatedAt: new Date(t.updated_at).toLocaleDateString('pt-BR'),
        }));

        return { success: true, data: formattedTickets };
    } catch (error) {
        console.error("Erro ao buscar tickets admin:", error);
        return { success: false, error: "Erro ao carregar fila de chamados." };
    }
}