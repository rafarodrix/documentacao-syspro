import { auth } from "./auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"
import { redirect } from "next/navigation"

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type UserRole = Role

export type ProtectedSession = {
  userId: string
  email: string
  role: Role
  name: string | null
  image: string | null
}

// ─── Session Principal ────────────────────────────────────────────────────────

/**
 * Valida a sessão e retorna os dados do usuário direto do banco.
 * Retorna null se: não autenticado, usuário não encontrado ou conta inativa.
 *
 * Verificação de `lockoutUntil` — bloqueia usuários em lockout
 * mesmo que o token de sessão seja válido (ex: sessão aberta antes do lockout).
 */
export async function getProtectedSession(): Promise<ProtectedSession | null> {
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
        deletedAt: true,      // Rejeita usuários soft-deleted
        lockoutUntil: true,   // Rejeita usuários em lockout
      },
    })

    // Conta não existe, foi deletada, está inativa ou em lockout
    if (!dbUser) return null
    if (dbUser.deletedAt) return null
    if (!dbUser.isActive) return null
    if (dbUser.lockoutUntil && dbUser.lockoutUntil > new Date()) return null

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
}

// ─── Helpers com Redirect ────────────────────────────────────────────────────

/**
 * Variante que redireciona automaticamente para /login.
 * Use em layouts e pages que SEMPRE exigem autenticação.
 * Elimina o padrão repetitivo `if (!session) redirect("/login")` em todo page.tsx.
 *
 * @example
 * // Em um layout de área protegida:
 * const session = await requireSession()
 * // Se chegou aqui, session está garantida e tipada sem null
 */
export async function requireSession(): Promise<ProtectedSession> {
  const session = await getProtectedSession()
  if (!session) redirect("/login")
  return session
}

/**
 * Variante que exige role específica.
 * Redireciona para /login se não autenticado, ou para /app se sem permissão.
 *
 * @example
 * // Em um page.tsx do painel admin:
 * const session = await requireRole(["ADMIN", "DEVELOPER"])
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