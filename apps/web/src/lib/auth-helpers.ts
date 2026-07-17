import { cache } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { resolveServerOrigin } from "@/lib/server-origin"

import type { AppRole } from "@dosc-syspro/core"

export type UserRole = AppRole

export type ProtectedSession = {
  userId: string
  email: string
  role: AppRole
  name: string | null
  image: string | null
}

const PROTECTED_SESSION_RETRY_STATUSES = new Set([502, 503, 504])
const PROTECTED_SESSION_MAX_ATTEMPTS = 2

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

async function getProtectedSessionFromApi(): Promise<ProtectedSession | null> {
  const requestHeaders = await headers()
  const cookie = requestHeaders.get("cookie")
  const appOrigin = resolveServerOrigin(requestHeaders)
  const url = `${appOrigin}/api/auth/protected-session`
  const requestInit = {
    method: "GET",
    headers: {
      ...(cookie ? { cookie } : {}),
      accept: "application/json",
    },
    cache: "no-store" as const,
  }

  for (let attempt = 1; attempt <= PROTECTED_SESSION_MAX_ATTEMPTS; attempt++) {
    const response = await fetch(url, requestInit)
    if (response.ok) {
      return (await response.json()) as ProtectedSession | null
    }

    if (!PROTECTED_SESSION_RETRY_STATUSES.has(response.status) || attempt === PROTECTED_SESSION_MAX_ATTEMPTS) {
      return null
    }

    await delay(150)
  }

  return null
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
