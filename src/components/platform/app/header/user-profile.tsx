"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { LogOut, User, Settings, HelpCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface UserProfileProps {
  user: {
    name: string
    email: string
    image?: string | null
    role: string
  }
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN:         "Super Administrador",
  DEVELOPER:     "Desenvolvedor",
  SUPORTE:       "Suporte Técnico",
  CLIENTE_ADMIN: "Gestor da Conta",
  CLIENTE_USER:  "Colaborador",
}

export function UserProfile({ user }: UserProfileProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await authClient.signOut()
    router.push("/login")
  }

  const initials = user.name
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  const roleLabel = ROLE_LABELS[user.role] ?? user.role

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-8 w-8 rounded-lg border border-border/50 bg-background hover:bg-muted p-0 focus-visible:ring-0"
        >
          <Avatar className="h-full w-full rounded-lg">
            <AvatarImage src={user.image ?? ""} alt={user.name} />
            <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52" forceMount>
        <DropdownMenuLabel className="font-normal py-2">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold leading-none truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{roleLabel}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="cursor-pointer gap-2">
          <Link href="/app/perfil">
            <User className="h-4 w-4 text-muted-foreground" />
            Meu Perfil
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem className="cursor-pointer gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          Preferências
        </DropdownMenuItem>

        <DropdownMenuItem className="cursor-pointer gap-2">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          Ajuda
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
