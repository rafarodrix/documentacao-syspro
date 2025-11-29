"use server"

import { prisma } from "@/lib/prisma"
import { getProtectedSession } from "@/lib/auth-helpers"
import { getMyTicketsAction } from "@/actions/app/ticket-actions" // Reutilizando sua action existente

export async function getClientDashboardData() {
    const session = await getProtectedSession()
    if (!session) return { error: "Unauthorized" }

    // 1. Busca Usuário + Empresa (via Membership)
    // Corrigimos aqui a chamada que estava quebrando
    const userPromise = prisma.user.findUnique({
        where: { id: session.userId },
        select: {
            name: true,
            email: true,
            memberships: {
                take: 1, // Pega a primeira empresa vinculada
                include: {
                    company: {
                        select: { razaoSocial: true, nomeFantasia: true }
                    }
                }
            }
        }
    })

    // 2. Busca Tickets (Paralelo)
    const [user, ticketsRes] = await Promise.all([
        userPromise,
        getMyTicketsAction()
    ])

    // 3. Formata os dados para a View
    const tickets = ticketsRes.success && ticketsRes.data ? ticketsRes.data : []

    // Tratamento de segurança caso não tenha empresa ainda
    const companyName = user?.memberships[0]?.company?.nomeFantasia ||
        user?.memberships[0]?.company?.razaoSocial ||
        "Sem Empresa Vinculada"

    const userName = user?.name || session.email.split('@')[0]

    return {
        success: true,
        data: {
            user: {
                name: userName,
                company: companyName
            },
            tickets: tickets,
            // Pré-cálculo de KPIs no servidor para aliviar o cliente
            kpis: {
                open: tickets.filter((t: any) => ['Aberto', 'Em Análise', 'Novo', 'new', 'open', 'pending'].includes(t.status)).length,
                resolved: tickets.filter((t: any) => ['Resolvido', 'Fechado', 'closed', 'merged'].includes(t.status)).length,
            }
        }
    }
}