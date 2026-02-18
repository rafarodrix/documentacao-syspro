"use server"

import { prisma } from "@/lib/prisma"
import { getProtectedSession } from "@/lib/auth-helpers"
import { Role } from "@prisma/client"

export async function getCadastrosData() {
    const session = await getProtectedSession()
    if (!session) return { error: "Não autorizado" }

    const isSuperAdmin = session.role === Role.ADMIN || session.role === Role.DEVELOPER

    try {
        let companies = []
        let users = []

        if (isSuperAdmin) {
            // --- LÓGICA DE SUPER ADMIN: TUDO ---
            companies = await prisma.company.findMany({
                orderBy: { razaoSocial: 'asc' },
                include: { _count: { select: { memberships: true } } }
            })

            users = await prisma.user.findMany({
                orderBy: { name: 'asc' },
                include: {
                    memberships: { include: { company: true } }
                }
            })

        } else {
            // --- LÓGICA DE CLIENTE: FILTRADO ---
            // Busca apenas as empresas onde o usuário tem vínculo
            const myMemberships = await prisma.membership.findMany({
                where: { userId: session.userId },
                select: { companyId: true, role: true }
            })

            const myCompanyIds = myMemberships.map(m => m.companyId)

            // Se não tem empresa, não vê nada
            if (myCompanyIds.length === 0) return { companies: [], users: [] }

            companies = await prisma.company.findMany({
                where: { id: { in: myCompanyIds } }
            })

            // Busca usuários APENAS dessas empresas
            users = await prisma.user.findMany({
                where: {
                    memberships: {
                        some: { companyId: { in: myCompanyIds } }
                    }
                },
                include: {
                    memberships: {
                        where: { companyId: { in: myCompanyIds } }, // Filtra os vínculos para mostrar só os dessa empresa
                        include: { company: true }
                    }
                }
            })
        }

        return { companies, users }

    } catch (error) {
        console.error(error)
        return { error: "Erro ao buscar dados." }
    }
}