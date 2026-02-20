"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { authClient } from "@/lib/auth-client"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NavItem, NavItemType } from "./NavItem"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Headset,
  Ticket,
  Users,
  Sparkles,
  Rocket,
  Wrench,
  LogOut,
  ChevronUp,
  Settings,
  FileText,
  ShieldCheck,
  Scale,
  HelpCircle,
} from "lucide-react"

// ─── Tipos ────────────────────────────────────────────────────────────────────

type UserRole = string

interface SidebarUser {
  name: string
  email: string
  image?: string | null
  role: UserRole
}

interface AppSidebarProps {
  user: SidebarUser
  mobile?: boolean
  onClose?: () => void
}

// ─── Configuração de menus ────────────────────────────────────────────────────

// Roles de sistema — mesmo padrão do CadastrosContainer
const SYSTEM_ROLES: UserRole[] = ["ADMIN", "DEVELOPER", "SUPORTE"]

const NAV_MAIN: NavItemType[] = [
  { title: "Dashboard",       href: "/app",           icon: LayoutDashboard },
  { title: "Meus Chamados",   href: "/app/chamados",  icon: Ticket,    roles: ["CLIENTE_ADMIN", "CLIENTE_USER"] },
  { title: "Gestão de Equipe",href: "/app/cadastros", icon: Users,     roles: ["CLIENTE_ADMIN", "ADMIN", "DEVELOPER", "SUPORTE"] },
    { title: "Central de Chamados",   href: "/app/chamados",         icon: Headset,  roles: ["ADMIN", "DEVELOPER", "SUPORTE"] },
  { title: "Ferramentas",           href: "/app/tools",              icon: Wrench,   roles: ["ADMIN", "DEVELOPER", "SUPORTE", "CLIENTE_ADMIN", "CLIENTE_USER"] },
  { title: "Reforma Tributária",    href: "/app/reforma-tributaria", icon: Scale, roles: ["ADMIN", "DEVELOPER", "SUPORTE", "CLIENTE_ADMIN", "CLIENTE_USER"] },

]

const NAV_SYSTEM: NavItemType[] = [
  { title: "Contratos",       href: "/app/contratos", icon: FileText,  roles: ["ADMIN"] },
]

const NAV_HELP: NavItemType[] = [
  { title: "Documentação",    href: "/docs/manual",   icon: BookOpen },
  { title: "Dúvidas",         href: "/docs/duvidas",  icon: GraduationCap },
  { title: "Suporte Técnico", href: "/docs/suporte",  icon: Headset,  roles: ["CLIENTE_ADMIN", "CLIENTE_USER"] },
  { title: "Releases",        href: "/releases",      icon: Rocket },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function filterByRole(items: NavItemType[], role: UserRole): NavItemType[] {
  return items.filter((item) => !item.roles || item.roles.includes(role))
}

function getRoleLabel(role: UserRole): string {
  const labels: Record<string, string> = {
    ADMIN:        "Super Administrador",
    DEVELOPER:    "Desenvolvedor",
    SUPORTE:      "Suporte Técnico",
    CLIENTE_ADMIN:"Gestor da Conta",
    CLIENTE_USER: "Colaborador",
  }
  return labels[role] ?? role.replace(/_/g, " ").toLowerCase()
}

function getInitials(name: string): string {
  return name.substring(0, 2).toUpperCase()
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function NavGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <nav className="grid gap-0.5">
      <p className="px-3 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1">
        {title}
      </p>
      {children}
    </nav>
  )
}

interface SidebarBrandProps {
  isSystemUser: boolean
  onClose?: () => void
}

function SidebarBrand({ isSystemUser, onClose }: SidebarBrandProps) {
  return (
    <div className="flex h-16 items-center px-6 border-b border-border/40 bg-muted/5 shrink-0">
      <Link
        href="/app"
        className="flex items-center gap-2.5 font-semibold group w-full"
        onClick={onClose}
      >
        <div
          className={cn(
            "h-9 w-9 rounded-xl flex items-center justify-center text-white shadow-sm transition-all duration-200",
            isSystemUser
              ? "bg-purple-600 group-hover:bg-purple-700"
              : "bg-gradient-to-br from-primary to-primary/80 group-hover:scale-105",
          )}
        >
          {isSystemUser ? (
            <ShieldCheck className="h-5 w-5" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="tracking-tight text-sm font-bold text-foreground">
            Trilink
            {isSystemUser && (
              <span className="text-purple-600 dark:text-purple-400">Admin</span>
            )}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium group-hover:text-primary transition-colors">
            {isSystemUser ? "Painel de Controle" : "Portal do Cliente"}
          </span>
        </div>
      </Link>
    </div>
  )
}

interface SidebarFooterProps {
  user: SidebarUser
  isSystemUser: boolean
  onClose?: () => void
}

function SidebarFooter({ user, isSystemUser, onClose }: SidebarFooterProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await authClient.signOut()
    router.push("/login")
  }

  return (
    <div className="p-3 border-t border-border/40 bg-muted/5 shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted transition-colors outline-none group text-left">
            <Avatar className="h-9 w-9 border border-border/50 flex-shrink-0">
              <AvatarImage src={user.image ?? ""} />
              <AvatarFallback
                className={cn(
                  "text-xs font-bold",
                  isSystemUser
                    ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                    : "bg-primary/10 text-primary",
                )}
              >
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col items-start flex-1 min-w-0">
              <span
                className={cn(
                  "text-sm font-medium text-foreground truncate w-full transition-colors",
                  isSystemUser
                    ? "group-hover:text-purple-600"
                    : "group-hover:text-primary",
                )}
              >
                {user.name}
              </span>
              <span className="text-xs text-muted-foreground truncate w-full">
                {user.email}
              </span>
            </div>

            <ChevronUp className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100 flex-shrink-0" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-[240px] mb-2" side="top">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">Minha Conta</p>
              <p className="text-xs leading-none text-muted-foreground">
                {getRoleLabel(user.role)}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => {
              router.push(isSystemUser ? "/admin/configuracoes" : "/app/perfil")
              onClose?.()
            }}
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            {isSystemUser ? "Configurações" : "Meus Dados"}
          </DropdownMenuItem>

          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => {
              router.push("/docs/suporte")
              onClose?.()
            }}
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            Suporte
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="cursor-pointer gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
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
    <div
      className={cn(
        "flex flex-col bg-background border-r border-border/40",
        mobile ? "h-full w-full" : "h-screen w-72 fixed left-0 top-0 hidden md:flex",
      )}
    >
      {/* Brand */}
      <SidebarBrand isSystemUser={isSystemUser} onClose={onClose} />

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
        <NavGroup title="Principal">
          {filterByRole(NAV_MAIN, user.role).map((item) => (
            <NavItem
              key={item.href}
              item={item}
              isActive={isActive(item.href)}
              onClick={onClose}
            />
          ))}
        </NavGroup>

        {/* Grupo Sistema — só para system users */}
        {isSystemUser && (
          <>
            <Separator className="bg-border/40" />
            <NavGroup title="Sistema">
              {filterByRole(NAV_SYSTEM, user.role).map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={isActive(item.href)}
                  onClick={onClose}
                />
              ))}
            </NavGroup>
          </>
        )}

        <Separator className="bg-border/40" />

        <NavGroup title="Recursos">
          {filterByRole(NAV_HELP, user.role).map((item) => (
            <NavItem
              key={item.href}
              item={item}
              isActive={isActive(item.href)}
              onClick={onClose}
            />
          ))}
        </NavGroup>
      </div>

      {/* Footer */}
      <SidebarFooter user={user} isSystemUser={isSystemUser} onClose={onClose} />
    </div>
  )
}
