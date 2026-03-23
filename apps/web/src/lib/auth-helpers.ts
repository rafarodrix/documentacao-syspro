import { cache } from "react"
import { auth } from "./auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import { CompanySegment, CompanyStatus, ContractStatus, Role } from "@prisma/client"
import { redirect } from "next/navigation"

export type UserRole = Role

export type ProtectedSession = {
  userId: string
  email: string
  role: Role
  name: string | null
  image: string | null
}

/**
 * Valida a sessao e retorna os dados do usuario direto do banco.
 * Retorna null se: nao autenticado, usuario nao encontrado ou conta inativa.
 *
 * A verificacao de `lockoutUntil` bloqueia usuarios em lockout
 * mesmo que o token de sessao ainda esteja valido.
 */
export const getProtectedSession = cache(async (): Promise<ProtectedSession | null> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user?.email) return null

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        isActive: true,
        deletedAt: true,
        lockoutUntil: true,
      },
    })

    if (!dbUser) return null
    if (dbUser.deletedAt) return null
    if (!dbUser.isActive) return null
    if (dbUser.lockoutUntil && dbUser.lockoutUntil > new Date()) return null

    if (dbUser.role === Role.CLIENTE_ADMIN || dbUser.role === Role.CLIENTE_USER) {
      const activeMembership = await prisma.membership.findFirst({
        where: {
          userId: dbUser.id,
          company: {
            deletedAt: null,
            status: CompanyStatus.ACTIVE,
            contracts: {
              some: {
                status: ContractStatus.ACTIVE,
                OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
              },
            },
          },
        },
        select: { id: true },
      })

      if (!activeMembership) return null
    }

    return {
      userId: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      image: dbUser.image,
      role: dbUser.role,
    }
  } catch {
    return null
  }
})

/**
 * Variante que redireciona automaticamente para /login.
 * Use em layouts e pages que sempre exigem autenticacao.
 */
export async function requireSession(): Promise<ProtectedSession> {
  const session = await getProtectedSession()
  if (!session) redirect("/login")
  return session
}

/**
 * Variante que exige role especifica.
 * Redireciona para /login se nao autenticado, ou para /app se sem permissao.
 */
export async function requireRole(
  allowedRoles: Role[],
  unauthorizedRedirect = "/app"
): Promise<ProtectedSession> {
  const session = await requireSession()
  if (!allowedRoles.includes(session.role)) {
    redirect(unauthorizedRedirect)
  }
  return session
}

export async function canAccessByCompanySegment(
  userId: string,
  requiredSegments: CompanySegment[]
): Promise<boolean> {
  if (!requiredSegments.length) return true

  const memberships = await prisma.membership.findMany({
    where: {
      userId,
      company: {
        deletedAt: null,
        status: CompanyStatus.ACTIVE,
      },
    },
    select: {
      company: {
        select: { segment: true },
      },
    },
  })

  const membershipSegments = memberships.map((membership) => membership.company.segment)

  if (!membershipSegments.length || membershipSegments.some((segment) => segment == null)) {
    return true
  }

  const definedSegments = membershipSegments.filter(
    (segment): segment is CompanySegment => segment != null
  )

  return definedSegments.some((segment) => requiredSegments.includes(segment))
}
