"use server";

import { getProtectedSession } from "@/lib/auth-helpers";
import { ZammadClient } from "@/lib/zammad-client";

// Roles permitidas para ver a central de suporte
const SUPPORT_ROLES = ["ADMIN", "DEVELOPER", "SUPORTE"];

export async function getAdminTicketsAction() {
    const session = await getProtectedSession();

    // 1. Verificação de Permissão (RBAC)
    if (!session || !SUPPORT_ROLES.includes(session.role)) {
        return { success: false, error: "Acesso não autorizado. Permissão insuficiente." };
    }

    try {
        // 2. Busca Global de Tickets (Ativos + Histórico recente)
        // Limitamos a 100 para garantir performance inicial da dashboard
        const tickets = await ZammadClient.getAllTickets(100);

        // 3. Mapeamento e Formatação para o Frontend
        const formattedTickets = tickets.map((t: any) => ({
            id: t.id,
            number: t.number,
            title: t.title,
            group: t.group,

            // Traduz o status técnico (en-US) para visual (pt-BR)
            status: mapZammadStatus(t.state),

            // Mantém o ID numérico da prioridade para lógica de cores no componente (1=Low, 2=Normal, 3=High)
            priority: t.priority_id,

            // ID do cliente (útil se quisermos buscar detalhes do usuário depois)
            customer: t.customer_id,

            // Formatação de Data amigável (Ex: "26 nov, 15:30")
            createdAt: new Date(t.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            }),

            updatedAt: new Date(t.updated_at).toLocaleDateString('pt-BR'),
        }));

        return { success: true, data: formattedTickets };

    } catch (error) {
        console.error("Erro ao buscar tickets admin:", error);
        return { success: false, error: "Não foi possível carregar a fila de chamados. Tente novamente." };
    }
}

// --- Helpers de Mapeamento ---

function mapZammadStatus(state: string): string {
    const map: Record<string, string> = {
        'new': 'Novo',
        'open': 'Aberto',
        'pending_reminder': 'Pendente',
        'pending_close': 'Pendente',
        'closed': 'Resolvido',
        'merged': 'Mesclado',
        'removed': 'Removido'
    };
    // Retorna a tradução ou o estado original se não houver mapa
    return map[state] || state;
}