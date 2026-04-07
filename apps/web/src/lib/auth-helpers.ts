import { cache } from "react"
import { headers } from "next/headers"
import { Role } from "@prisma/client"
import { redirect } from "next/navigation"
import { getBackendApiBaseUrl } from "@/lib/backend-api"

export type UserRole = Role

export type ProtectedSession = {
  userId: string
  email: string
  role: Role
  name: string | null
  image: string | null
}

async function getProtectedSessionFromApi(): Promise<ProtectedSession | null> {
  const requestHeaders = await headers()
  const cookie = requestHeaders.get("cookie")

  const response = await fetch(`${getBackendApiBaseUrl()}/auth/protected-session`, {
    method: "GET",
    headers: {
      ...(cookie ? { cookie } : {}),
      accept: "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) return null
  return (await response.json()) as ProtectedSession | null
}

/**
 * Valida a sessao via API Nest e retorna o payload normalizado.
 */
export const getProtectedSession = cache(async (): Promise<ProtectedSession | null> => {
  try {
    return await getProtectedSessionFromApi()
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
 * Redireciona para /login se nao autenticado, ou para /portal se sem permissao.
 */
export async function requireRole(
  allowedRoles: Role[],
  unauthorizedRedirect = "/portal"
): Promise<ProtectedSession> {
  const session = await requireSession()
  if (!allowedRoles.includes(session.role)) {
    redirect(unauthorizedRedirect)
  }
  return session
}
