import { ModeToggle } from "@/components/ModeToggle"
import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"
import { Breadcrumbs } from "./breadcrumbs"
import { CommandPaletteTrigger } from "./command-palette-trigger"
import { UserProfile } from "./user-profile"

interface ClientHeaderProps {
  user: {
    name: string
    email: string
    image?: string | null
    role: string
  }
}

/**
 * Header da área autenticada — desktop only.
 * Mobile usa MobileHeader (sticky, com Sheet de navegação).
 * 
 * NOTA: mobile-menu.tsx foi DELETADO. 
 * MobileHeader já tem o Sheet integrado e não precisa mais deste componente.
 */
export function ClientHeader({ user }: ClientHeaderProps) {
  return (
    <header className="hidden md:flex sticky top-0 z-40 h-14 items-center gap-4 border-b border-border/40 bg-background/90 px-6 backdrop-blur-md">

      {/* Esquerda: Breadcrumbs */}
      <Breadcrumbs />

      {/* Centro: Command Palette */}
      <div className="flex-1 flex justify-center max-w-sm mx-auto">
        <CommandPaletteTrigger />
      </div>

      {/* Direita: Ações */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" />
          {/* Badge de notificação não lida */}
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-500 border border-background" />
        </Button>

        <ModeToggle />

        <div className="h-4 w-px bg-border/60 mx-1" />

        <UserProfile user={user} />
      </div>
    </header>
  )
}