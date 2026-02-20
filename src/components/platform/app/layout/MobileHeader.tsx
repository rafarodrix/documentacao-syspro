"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, Sparkles, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { AppSidebar, SidebarUser } from "./app-sidebar"
import { cn } from "@/lib/utils"

interface MobileHeaderProps {
  user: SidebarUser
}

const SYSTEM_ROLES = ["ADMIN", "DEVELOPER", "SUPORTE"]

export function MobileHeader({ user }: MobileHeaderProps) {
  const [open, setOpen] = useState(false)
  const isSystemUser = SYSTEM_ROLES.includes(user.role)

  return (
    <header className="md:hidden sticky top-0 z-40 w-full border-b border-border/40 h-14 flex items-center px-4 gap-3 bg-background/90 backdrop-blur-md">

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 -ml-1 text-muted-foreground"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu className="h-4.5 w-4.5" />
      </Button>

      {/* Logo centralizada */}
      <Link href="/app" className="flex items-center gap-2 group">
        <div className={cn(
          "h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs transition-all",
          isSystemUser
            ? "bg-violet-600 group-hover:bg-violet-700"
            : "bg-gradient-to-br from-primary to-primary/70 group-hover:scale-105",
        )}>
          {isSystemUser
            ? <ShieldCheck className="h-4 w-4" />
            : <Sparkles className="h-4 w-4" />
          }
        </div>
        <span className="text-[13px] font-bold tracking-tight">
          Trilink
          {isSystemUser && <span className="text-violet-500">Admin</span>}
        </span>
      </Link>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-[264px] border-r-border/40">
          <AppSidebar user={user} mobile onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  )
}