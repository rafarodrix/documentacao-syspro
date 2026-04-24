import { redirect } from "next/navigation"
import { type ReactNode } from "react"
import { getProtectedSession } from "@/lib/auth-helpers"
import { AppShell } from "@/components/platform/app/layout/AppShell"
import { getActiveSessionsCount } from "@/features/remote/application/session-queries"
import { getRemoteTenantScope } from "@/features/remote/application/scope"
import { currentUserHasAnyPermission, currentUserHasPermission } from "@/features/user-access/application/current-user-access"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getProtectedSession()

  if (!session) redirect("/login")
  
  let initialActiveSessionsCount = 0
  try {
    const tenantScope = await getRemoteTenantScope()
    initialActiveSessionsCount = await getActiveSessionsCount(tenantScope)
  } catch (error) {
    console.error("[PortalLayout] Falha ao carregar contador de sessoes remotas:", error)
  }

  const navigationAccess = {
    dashboard: await currentUserHasPermission("dashboard:view"),
    companies: await currentUserHasAnyPermission(["companies:view", "companies:view_own", "companies:view_all"], {
      acceptCompanyScope: true,
    }),
    users: await currentUserHasAnyPermission(["users:view", "users:view_team", "users:view_all"], {
      acceptCompanyScope: true,
    }),
    contacts: await currentUserHasAnyPermission(["contacts:view", "contacts:view_team", "contacts:view_all"], {
      acceptCompanyScope: true,
    }),
    tickets: await currentUserHasAnyPermission(["tickets:view_own", "tickets:view_all", "tickets:create", "tickets:manage"], {
      acceptCompanyScope: true,
    }),
    atendimento: await currentUserHasPermission("atendimento:view", { acceptCompanyScope: true }),
    remote: await currentUserHasAnyPermission(["remote:view", "remote:manage"], {
      acceptCompanyScope: true,
    }),
    crm: await currentUserHasAnyPermission(["crm:view", "crm:manage"], {
      acceptCompanyScope: true,
    }),
    contracts: await currentUserHasPermission("contracts:view", { acceptCompanyScope: true }),
    docs: true,
    releases: true,
    tools: await currentUserHasPermission("tools:view"),
    settings: await currentUserHasPermission("settings:view"),
  }

  const user = {
    name: session.name ?? session.email.split("@")[0] ?? "Usuário",
    email: session.email,
    image: session.image ?? null,
    role: session.role,
  }

  return (
    <AppShell user={user} initialActiveSessionsCount={initialActiveSessionsCount} navigationAccess={navigationAccess}>
      {children}
    </AppShell>
  )
}
