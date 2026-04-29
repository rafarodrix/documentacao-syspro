import { redirect } from "next/navigation"
import { type ReactNode } from "react"
import { AppShell } from "@/components/platform/app/layout/AppShell"
import { PortalShellModeProvider } from "@/components/platform/app/layout/PortalShellModeContext"
import { getProtectedSession } from "@/lib/auth-helpers"
import { getActiveSessionsCount } from "@/features/remote/application/session-queries"
import { getRemoteTenantScope } from "@/features/remote/application/scope"
import { currentUserHasAnyPermission, currentUserHasPermission } from "@/features/user-access/application/current-user-access"

interface PortalShellLayoutProps {
  children: ReactNode
  contentClassName?: string
  contentContainerClassName?: string
}

export async function PortalShellLayout({
  children,
  contentClassName,
  contentContainerClassName,
}: PortalShellLayoutProps) {
  const session = await getProtectedSession()

  if (!session) redirect("/login")

  let initialActiveSessionsCount = 0
  const canWatchRemoteSessions = await currentUserHasPermission("tools:all")
  if (canWatchRemoteSessions) {
    try {
      const tenantScope = await getRemoteTenantScope()
      initialActiveSessionsCount = await getActiveSessionsCount(tenantScope)
    } catch (error) {
      console.error("[PortalShellLayout] Falha ao carregar contador de sessoes remotas:", error)
    }
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
    infrastructure: false,
    remote: await currentUserHasAnyPermission(["remote:view", "remote:manage"], {
      acceptCompanyScope: true,
    }),
    remoteSessions: false,
    remoteReports: false,
    agents: await currentUserHasAnyPermission(["agents:view", "agents:manage"], {
      acceptCompanyScope: true,
    }),
    crm: await currentUserHasAnyPermission(["crm:view", "crm:manage"], {
      acceptCompanyScope: true,
    }),
    contracts: await currentUserHasPermission("contracts:view", { acceptCompanyScope: true }),
    docs: true,
    releases: true,
    tools: await currentUserHasAnyPermission(["tools:view", "tools:basic", "tools:all"]),
    settings: await currentUserHasPermission("settings:view"),
  }
  navigationAccess.remoteSessions = navigationAccess.remote
  navigationAccess.remoteReports = navigationAccess.remote
  navigationAccess.infrastructure =
    navigationAccess.remote ||
    navigationAccess.agents

  const user = {
    name: session.name ?? session.email.split("@")[0] ?? "Usuario",
    email: session.email,
    image: session.image ?? null,
    role: session.role,
  }

  return (
    <PortalShellModeProvider>
      <AppShell
        user={user}
        initialActiveSessionsCount={initialActiveSessionsCount}
        canWatchRemoteSessions={canWatchRemoteSessions}
        navigationAccess={navigationAccess}
        contentClassName={contentClassName}
        contentContainerClassName={contentContainerClassName}
      >
        {children}
      </AppShell>
    </PortalShellModeProvider>
  )
}
