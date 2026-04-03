import { redirect } from "next/navigation"
import { type ReactNode } from "react"
import { getProtectedSession } from "@/lib/auth-helpers"
import { AppShell } from "@/components/platform/app/layout/AppShell"
import { getActiveSessionsCount } from "@/features/remote/application/session-queries"
import { getRemoteTenantScope } from "@/features/remote/application/scope"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getProtectedSession()

  if (!session) redirect("/login")
  
  const tenantScope = await getRemoteTenantScope();
  const initialActiveSessionsCount = await getActiveSessionsCount(tenantScope);

  const user = {
    name: session.name ?? session.email.split("@")[0] ?? "Usuário",
    email: session.email,
    image: session.image ?? null,
    role: session.role,
  }

  return (
    <AppShell user={user} initialActiveSessionsCount={initialActiveSessionsCount}>
      {children}
    </AppShell>
  )
}
