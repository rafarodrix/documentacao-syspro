"use client"

import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Breadcrumbs } from "./breadcrumbs"
import { CommandPaletteTrigger } from "./command-palette-trigger"
import { NotificationsMenu } from "./notifications-menu"
import type { Role } from "@prisma/client"
import { SYSTEM_ROLES } from "@dosc-syspro/core"
import { RemoteActiveSessionsCounter } from "@/features/remote/interface/active-sessions-counter"
import type { NavigationAccess } from "@/components/platform/app/layout/app-sidebar"

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
  canWatchRemoteSessions?: boolean
  navigationAccess?: NavigationAccess
}

export function ClientHeader({
  user,
  showSidebarToggle = true,
  sidebarCollapsed,
  onToggleSidebar,
  initialActiveSessionsCount,
  canWatchRemoteSessions = false,
  navigationAccess,
}: ClientHeaderProps) {
  const isSystemUser = SYSTEM_ROLES.includes(user.role)

  return (
    <header className="hidden md:flex sticky top-0 z-40 h-14 items-center gap-3 border-b border-border/40 bg-background/95 px-4 backdrop-blur-md">
      {showSidebarToggle && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-md text-muted-foreground hover:text-foreground"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? "Expandir menu lateral" : "Minimizar menu lateral"}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      )}

      <div className="h-4 w-px bg-border/50 shrink-0" />

      <Breadcrumbs />

      <div className="flex flex-1 items-center justify-center gap-2">
        <CommandPaletteTrigger navigationAccess={navigationAccess} />
        {isSystemUser && canWatchRemoteSessions && (
          <RemoteActiveSessionsCounter initialCount={initialActiveSessionsCount} />
        )}
      </div>

      <div className="flex items-center gap-0.5">
        <NotificationsMenu />
        <ModeToggle />
      </div>
    </header>
  )
}
