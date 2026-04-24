"use client"

import { ModeToggle } from "@/components/ModeToggle"
import { Button } from "@/components/ui/button"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Breadcrumbs } from "./Breadcrumbs"
import { CommandPaletteTrigger } from "./CommandPaletteTrigger"
import { UserProfile } from "./UserProfile"
import { NotificationsMenu } from "./NotificationsMenu"
import type { Role } from "@prisma/client"
import { SYSTEM_ROLES } from "@dosc-syspro/core"
import { RemoteActiveSessionsCounter } from "@/features/remote/interface/active-sessions-counter"
import type { NavigationAccess } from "@/components/platform/app/layout/AppSidebar"

interface ClientHeaderProps {
  user: {
    name: string
    email: string
    image?: string | null
    role: Role
  }
  showSidebarToggle?: boolean
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  initialActiveSessionsCount?: number
  navigationAccess?: NavigationAccess
}

export function ClientHeader({
  user,
  showSidebarToggle = true,
  sidebarCollapsed,
  onToggleSidebar,
  initialActiveSessionsCount,
  navigationAccess,
}: ClientHeaderProps) {
  const isSystemUser = SYSTEM_ROLES.includes(user.role)

  return (
    <header className="hidden md:flex sticky top-0 z-40 h-14 items-center gap-4 border-b border-border/40 bg-background/90 px-4 lg:px-6 backdrop-blur-md">
      {showSidebarToggle ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? "Expandir menu lateral" : "Minimizar menu lateral"}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      ) : null}

      <Breadcrumbs />

      <div className="flex-1 flex justify-center max-w-sm mx-auto gap-4">
        <CommandPaletteTrigger navigationAccess={navigationAccess} />
        {isSystemUser && (
          <RemoteActiveSessionsCounter initialCount={initialActiveSessionsCount} />
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <NotificationsMenu />

        <ModeToggle />

        <div className="h-4 w-px bg-border/60 mx-1" />
        <UserProfile
          user={user}
          canAccessSettings={Boolean(navigationAccess?.settings)}
          canAccessAtendimento={Boolean(navigationAccess?.atendimento) && isSystemUser}
        />
      </div>
    </header>
  )
}


