"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { authClient } from "@/lib/auth-client"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NavItem, NavItemType } from "./NavItem"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LayoutDashboard, BookOpen, GraduationCap, Headset, Ticket,
  Users, Sparkles, Rocket, Wrench, LogOut, ChevronUp,
  Settings, FileText, ShieldCheck, Scale, HelpCircle,
} from "lucide-react"

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type UserRole = string

export interface SidebarUser {
  name: string
  email: string
  image?: string | null
  role: UserRole
}

export interface AppSidebarProps {
  user: SidebarUser
  mobile?: boolean
  onClose?: () => void
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const SYSTEM_ROLES: UserRole[] = ["ADMIN", "DEVELOPER", "SUPORTE"]

// Sem `roles` = visível para todos autenticados
const NAV_MAIN: NavItemType[] = [
  { title: "Dashboard",          href: "/app",                    icon: LayoutDashboard },
  { title: "Meus Chamados",      href: "/app/chamados",           icon: Ticket,   roles: ["CLIENTE_ADMIN", "CLIENTE_USER"] },
  { title: "Gestão de Equipe",   href: "/app/cadastros",          icon: Users,    roles: ["CLIENTE_ADMIN", "ADMIN", "DEVELOPER", "SUPORTE"] },
  { title: "Ferramentas",        href: "/app/tools",              icon: Wrench },
  { title: "Reforma Tributária", href: "/app/reforma-tributaria", icon: Scale },
]

// Só renderizado dentro do bloco isSystemUser
const NAV_SYSTEM: NavItemType[] = [
  { title: "Central de Chamados", href: "/app/chamados", icon: Headset },
  { title: "Contratos",           href: "/app/contratos", icon: FileText, roles: ["ADMIN"] },
]

const NAV_HELP: NavItemType[] = [
  { title: "Documentação",    href: "/docs/manual",  icon: BookOpen },
  { title: "Dúvidas",         href: "/docs/duvidas", icon: GraduationCap },
  { title: "Suporte Técnico", href: "/docs/suporte", icon: Headset, roles: ["CLIENTE_ADMIN", "CLIENTE_USER"] },
  { title: "Releases",        href: "/releases",     icon: Rocket },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function filterByRole(items: NavItemType[], role: UserRole): NavItemType[] {
  return items.filter((item) => !item.roles || item.roles.includes(role))
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<string, string> = {
    ADMIN:         "Super Administrador",
    DEVELOPER:     "Desenvolvedor",
    SUPORTE:       "Suporte Técnico",
    CLIENTE_ADMIN: "Gestor da Conta",
    CLIENTE_USER:  "Colaborador",
  }
  return labels[role] ?? role.replace(/_/g, " ").toLowerCase()
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <nav className="grid gap-0.5">
      <p className="px-3 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest mb-1">
        {title}
      </p>
      {children}
    </nav>
  )
}

function SidebarBrand({ isSystemUser, onClose }: { isSystemUser: boolean; onClose?: () => void }) {
  return (
    <div className="flex h-16 items-center px-5 border-b border-border/40 shrink-0">
      <Link
        href="/app"
        className="flex items-center gap-3 font-semibold group w-full"
        onClick={onClose}
      >
        <div className={cn(
          "h-9 w-9 rounded-xl flex items-center justify-center text-white shadow-sm transition-all duration-300",
          isSystemUser
            ? "bg-violet-600 group-hover:bg-violet-700 group-hover:shadow-violet-500/25 group-hover:shadow-md"
            : "bg-gradient-to-br from-primary to-primary/70 group-hover:shadow-primary/25 group-hover:shadow-md group-hover:scale-105",
        )}>
          {isSystemUser
            ? <ShieldCheck className="h-4.5 w-4.5" />
            : <Sparkles className="h-4.5 w-4.5" />
          }
        </div>
        <div className="flex flex-col gap-0">
          <span className="text-[13px] font-bold tracking-tight text-foreground leading-tight">
            Trilink
            {isSystemUser && <span className="text-violet-500 dark:text-violet-400">Admin</span>}
          </span>
          <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium group-hover:text-primary/70 transition-colors leading-tight">
            {isSystemUser ? "Painel de Controle" : "Portal do Cliente"}
          </span>
        </div>
      </Link>
    </div>
  )
}

function SidebarFooter({
  user, isSystemUser, onClose,
}: { user: SidebarUser; isSystemUser: boolean; onClose?: () => void }) {
  const router = useRouter()

  const handleLogout = async () => {
    await authClient.signOut()
    router.push("/login")
  }

  return (
    <div className="p-3 border-t border-border/40 shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={cn(
            "flex items-center gap-3 w-full px-2 py-2 rounded-lg",
            "hover:bg-muted transition-colors outline-none group text-left",
            "border border-transparent hover:border-border/40",
          )}>
            <Avatar className="h-8 w-8 border border-border/50 flex-shrink-0">
              <AvatarImage src={user.image ?? ""} alt={user.name} />
              <AvatarFallback className={cn(
                "text-xs font-bold",
                isSystemUser
                  ? "bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300"
                  : "bg-primary/10 text-primary",
              )}>
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col items-start flex-1 min-w-0">
              <span className={cn(
                "text-[13px] font-medium text-foreground truncate w-full transition-colors leading-tight",
                isSystemUser ? "group-hover:text-violet-600" : "group-hover:text-primary",
              )}>
                {user.name}
              </span>
              <span className="text-[11px] text-muted-foreground/70 truncate w-full leading-tight">
                {user.email}
              </span>
            </div>

            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground flex-shrink-0 transition-colors" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-56 mb-2" side="top">
          <DropdownMenuLabel className="font-normal py-2">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold leading-none truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground">{getRoleLabel(user.role)}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="cursor-pointer gap-2 text-sm"
            onClick={() => { router.push(isSystemUser ? "/admin/configuracoes" : "/app/perfil"); onClose?.() }}
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            {isSystemUser ? "Configurações" : "Meus Dados"}
          </DropdownMenuItem>

          <DropdownMenuItem
            className="cursor-pointer gap-2 text-sm"
            onClick={() => { router.push("/docs/suporte"); onClose?.() }}
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            Suporte
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="cursor-pointer gap-2 text-sm text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sair do Sistema
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function AppSidebar({ user, mobile = false, onClose }: AppSidebarProps) {
  const pathname = usePathname()
  const isSystemUser = SYSTEM_ROLES.includes(user.role)

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href)

  return (
    <div className={cn(
      "flex flex-col bg-background border-r border-border/40",
      mobile ? "h-full w-full" : "h-screen w-[264px] fixed left-0 top-0 hidden md:flex",
    )}>
      <SidebarBrand isSystemUser={isSystemUser} onClose={onClose} />

      <div className="flex-1 overflow-y-auto py-5 px-2.5 space-y-5">

        <NavGroup title="Principal">
          {filterByRole(NAV_MAIN, user.role).map((item) => (
            <NavItem key={item.href} item={item} isActive={isActive(item.href)} onClick={onClose} />
          ))}
        </NavGroup>

        {isSystemUser && (
          <>
            <Separator className="bg-border/30 mx-1" />
            <NavGroup title="Sistema">
              {filterByRole(NAV_SYSTEM, user.role).map((item) => (
                <NavItem key={item.href} item={item} isActive={isActive(item.href)} onClick={onClose} />
              ))}
            </NavGroup>
          </>
        )}

        <Separator className="bg-border/30 mx-1" />

        <NavGroup title="Recursos">
          {filterByRole(NAV_HELP, user.role).map((item) => (
            <NavItem key={item.href} item={item} isActive={isActive(item.href)} onClick={onClose} />
          ))}
        </NavGroup>
      </div>

      <SidebarFooter user={user} isSystemUser={isSystemUser} onClose={onClose} />
    </div>
  )
}