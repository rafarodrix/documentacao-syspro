"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { AppSidebar } from "./app-sidebar"

interface MobileHeaderProps {
  user: {
    name: string
    email: string
    image?: string | null
    role: string
  }
}

export function MobileHeader({ user }: MobileHeaderProps) {
  const [open, setOpen] = useState(false)

  return (
    <header className="md:hidden sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/40 h-16 flex items-center px-4 gap-3">

      {/* Botão hamburguer */}
      <Button
        variant="ghost"
        size="icon"
        className="-ml-2 flex-shrink-0"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Abrir menu</span>
      </Button>

      {/* Logo mobile */}
      <Link href="/app" className="font-bold text-base tracking-tight">
        Trilink
        <span className="text-primary">Admin</span>
      </Link>

      {/* Sheet com a sidebar completa */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <AppSidebar user={user} mobile onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  )
}
