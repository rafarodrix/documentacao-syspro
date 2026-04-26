"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { AppSidebar, SidebarUser, type NavigationAccess } from "./AppSidebar"

interface MobileHeaderProps {
  user: SidebarUser
  navigationAccess?: NavigationAccess
}

export function MobileHeader({ user, navigationAccess }: MobileHeaderProps) {
  const [open, setOpen] = useState(false)

  return (
    <header className="md:hidden sticky top-0 z-40 w-full border-b border-border/40 h-14 flex items-center justify-between px-3 bg-background/95 backdrop-blur-md">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Link href="/portal" className="absolute left-1/2 -translate-x-1/2">
        <div className="relative h-7 w-24 dark:hidden">
          <Image src="/img/logo/logo-escura.png" alt="Trilink" fill className="object-contain" sizes="96px" />
        </div>
        <div className="relative hidden h-7 w-24 dark:block">
          <Image src="/img/logo/logo-clara.png" alt="Trilink" fill className="object-contain" sizes="96px" />
        </div>
      </Link>

      {/* Spacer para manter logo centralizada */}
      <div className="h-9 w-9 shrink-0" aria-hidden="true" />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-72 border-r-border/40">
          <AppSidebar user={user} mobile onClose={() => setOpen(false)} navigationAccess={navigationAccess} />
        </SheetContent>
      </Sheet>
    </header>
  )
}
