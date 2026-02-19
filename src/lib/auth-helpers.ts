import { auth } from "./auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type UserRole = Role

export type ProtectedSession = {
  userId: string
  email: string
  role: Role
  name: string | null   // User.name  → String?
  image: string | null  // User.image → String?
}

// ─── Helper Principal ─────────────────────────────────────────────────────────

/**
 * Valida a sessão e retorna os dados do usuário direto do banco.
 * Retorna null se não autenticado ou usuário não encontrado.
 */
export async function getProtectedSession(): Promise<ProtectedSession | null> {
  try {
    // 1. Sessão via better-auth
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user?.email) return null

    // 2. Busca o usuário no banco — fonte de verdade para role, name e image
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        isActive: true,
      },
    })

    if (!dbUser || !dbUser.isActive) return null

    // 3. Retorna sessão segura com todos os campos necessários
    return {
      userId: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,    // string | null — direto do Prisma
      image: dbUser.image,  // string | null — direto do Prisma
      role: dbUser.role,
    }
  } catch {
    return null
  }
}