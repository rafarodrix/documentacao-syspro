"use server";

import { getProtectedSession } from "@/lib/auth-helpers";
import { zammadService } from "@/core/infrastructure/services/zammad-service";

export async function getMyTicketsAction() {
    const session = await getProtectedSession();

    if (!session) {
        return { success: false, error: "Não autorizado" };
    }

    try {
        // Passa o email do usuário logado para o serviço
        const tickets = await zammadService.getUserTickets(session.email);
        return { success: true, data: tickets };
    } catch (error) {
        return { success: false, error: "Erro ao carregar chamados." };
    }
}