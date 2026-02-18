"use server"

import { prisma } from "@/lib/prisma"
import { getProtectedSession } from "@/lib/auth-helpers"
import { getMyTicketsAction } from "@/actions/tickets/ticket-actions"

// Normaliza todos os status possíveis para uma tipagem única
function normalizeStatus(status: string): string {
    const s = status?.toLowerCase()

    const map: Record<string, string> = {
        "new": "open",
        "novo": "open",
        "open": "open",
        "aberto": "open",
        "em análise": "open",

        "pending": "pending",
        "pending_close": "pending",
        "pending_reminder": "pending",

        "closed": "resolved",
        "resolvido": "resolved",
        "fechado": "resolved",
        "merged": "resolved",
    }

    return map[s] ?? "unknown"
}

export async function getClientDashboardData() {
    const session = await getProtectedSession()
    if (!session) return { error: "Unauthorized", data: null }

    // ------------------------------
    // 1. BUSCA USUÁRIO + EMPRESA
    // ------------------------------
    const userPromise = prisma.user.findUnique({
        where: { id: session.userId },
        select: {
            name: true,
            email: true,
            memberships: {
                take: 1,
                include: {
                    company: {
                        select: {
                            razaoSocial: true,
                            nomeFantasia: true,
                        }
                    }
                }
            }
        }
    })

    // ------------------------------
    // 2. BUSCA TICKETS DO ZAMMAD
    // ------------------------------
    const ticketsPromise = getMyTicketsAction()

    // Rodar em paralelo = mais rápido
    const [user, ticketsRes] = await Promise.all([
        userPromise,
        ticketsPromise
    ])

    const tickets = ticketsRes?.success ? ticketsRes.data : []

    // ------------------------------
    // 3. NOME DA EMPRESA
    // ------------------------------
    const companyName =
        user?.memberships?.[0]?.company?.nomeFantasia ??
        user?.memberships?.[0]?.company?.razaoSocial ??
        "Sem Empresa Vinculada"

    const userName =
        user?.name ??
        session.email.split("@")[0]

    // ------------------------------
    // 4. NORMALIZA STATUS E CALCULA KPIs
    // ------------------------------

    const normalized = tickets.map((t: any) => ({
        ...t,
        normalizedStatus: normalizeStatus(t.status)
    }))

    const kpis = {
        open: normalized.filter(t => t.normalizedStatus === "open").length,
        pending: normalized.filter(t => t.normalizedStatus === "pending").length,
        resolved: normalized.filter(t => t.normalizedStatus === "resolved").length,
        unknown: normalized.filter(t => t.normalizedStatus === "unknown").length,
    }

    // ------------------------------
    // 5. RETORNO FINAL PARA O DASHBOARD
    // ------------------------------
    return {
        success: true,
        data: {
            user: {
                name: userName,
                company: companyName,
            },
            tickets: normalized,
            kpis,
        }
    }
}
