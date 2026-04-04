"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, Sparkles, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { AppSidebar, SidebarUser } from "./AppSidebar"
import { cn } from "@/lib/utils"
import { SYSTEM_ROLES } from "@dosc-syspro/core"

interface MobileHeaderProps {
  user: SidebarUser
}

export function MobileHeader({ user }: MobileHeaderProps) {
  const [open, setOpen] = useState(false)
  const isSystemUser = SYSTEM_ROLES.includes(user.role)

  return (
    <header className="md:hidden sticky top-0 z-40 w-full border-b border-border/40 min-h-16 flex items-center justify-between px-3 py-2 bg-background/95 backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,0.04)]">

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 border-border/70 bg-background text-foreground shadow-sm"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Menu
        </span>
      </div>

      <Link href="/portal" className="flex items-center gap-2 group min-w-0">
        <div className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs transition-all",
          isSystemUser
            ? "bg-violet-600 group-hover:bg-violet-700"
            : "bg-gradient-to-br from-primary to-primary/70 group-hover:scale-105",
        )}>
          {isSystemUser
            ? <ShieldCheck className="h-4 w-4" />
            : <Sparkles className="h-4 w-4" />
          }
        </div>
        <span className="truncate text-[13px] font-bold tracking-tight text-foreground">
          Trilink
          {isSystemUser && <span className="text-violet-500">Admin</span>}
        </span>
      </Link>

      <div className="w-[52px] shrink-0" aria-hidden="true" />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-[284px] border-r-border/40">
          <AppSidebar user={user} mobile onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  )
}
