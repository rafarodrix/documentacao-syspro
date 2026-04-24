"use client"

import type { Role } from "@prisma/client"
import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { authClient } from "@/lib/auth-client"
import { SIDEBAR_ROLE_RULES, SYSTEM_ROLES } from "@dosc-syspro/core"
import { getRoleLabel as getUnifiedRoleLabel } from "@dosc-syspro/core"
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
  HelpCircle,
  Monitor,
  Smartphone,
  MessagesSquare,
  BriefcaseBusiness,
  Target,
} from "lucide-react"

export type UserRole = Role

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
  collapsed?: boolean
  navigationAccess?: NavigationAccess
}

export interface NavigationAccess {
  dashboard: boolean
  companies: boolean
  users: boolean
  contacts: boolean
  tickets: boolean
  atendimento: boolean
  remote: boolean
  crm: boolean
  contracts: boolean
  docs: boolean
  releases: boolean
  tools: boolean
  settings: boolean
}

const NAV_MAIN: NavItemType[] = [
  { title: "Dashboard", href: "/portal", icon: LayoutDashboard },
]

const NAV_CADASTROS: NavItemType[] = [
  { title: "Empresa", href: "/portal/cadastros/empresa", icon: FileText, roles: [...SIDEBAR_ROLE_RULES.cadastroEmpresa] },
  { title: "Usuarios", href: "/portal/cadastros/usuarios", icon: Users, roles: [...SIDEBAR_ROLE_RULES.cadastroUsuarios] },
  { title: "Contatos", href: "/portal/contatos", icon: Smartphone, roles: [...SIDEBAR_ROLE_RULES.cadastroContatos] },
]

const NAV_SUPPORT: NavItemType[] = [
  { title: "Meus Chamados", href: "/portal/tickets", icon: Ticket, roles: [...SIDEBAR_ROLE_RULES.chamadosCliente] },
  { title: "Tickets", href: "/portal/tickets", icon: Ticket, roles: [...SIDEBAR_ROLE_RULES.chamadosSistema] },
  { title: "Atendimento", href: "/portal/atendimento", icon: MessagesSquare, roles: [...SYSTEM_ROLES], newTab: true },
  { title: "Plataforma Remota", href: "/portal/plataforma-remota", icon: Monitor, roles: [...SYSTEM_ROLES, "CLIENTE_ADMIN"] },
]

const NAV_COMMERCIAL: NavItemType[] = [
  { title: "CRM", href: "/portal/comercial/leads", icon: Target, roles: [...SYSTEM_ROLES] },
  { title: "Contratos", href: "/portal/contratos", icon: BriefcaseBusiness, roles: [...SYSTEM_ROLES] },
]

const NAV_DOCS: NavItemType[] = [
  { title: "Documentacao", href: "/portal/docs", icon: BookOpen },
  { title: "Releases", href: "/portal/releases", icon: Rocket },
  { title: "Ferramentas", href: "/portal/tools", icon: Wrench },
]

function filterByRole(items: NavItemType[], role: UserRole): NavItemType[] {
  return items.filter((item) => !item.roles || item.roles.includes(role))
}

function filterByAccess(items: NavItemType[], accessByHref: Partial<Record<string, boolean>>): NavItemType[] {
  return items.filter((item) => accessByHref[item.href] !== false)
}

export function getRoleLabel(role: UserRole): string {
  return getUnifiedRoleLabel(role)
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

function NavGroup({ title, children, collapsed }: { title: string; children: ReactNode; collapsed?: boolean }) {
  return (
    <nav className="grid min-w-0 gap-0.5">
      {!collapsed && (
        <p className="px-3 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest mb-1">{title}</p>
      )}
      {children}
    </nav>
  )
}

function SidebarBrand({
  isSystemUser,
  onClose,
  collapsed,
}: {
  isSystemUser: boolean
  onClose?: () => void
  collapsed?: boolean
}) {
  return (
    <div className={cn("flex h-14 items-center border-b border-border/40 shrink-0", collapsed ? "px-3 justify-center" : "px-4")}>
      <Link
        href="/portal"
        className={cn("flex items-center font-semibold group w-full", collapsed ? "justify-center" : "gap-3")}
        onClick={onClose}
        title={collapsed ? "Trilink" : undefined}
      >
        <div
          className={cn(
            "h-9 w-9 rounded-xl flex items-center justify-center text-white shadow-sm transition-all duration-300",
            isSystemUser
              ? "bg-violet-600 group-hover:bg-violet-700 group-hover:shadow-violet-500/25 group-hover:shadow-md"
              : "bg-linear-to-br from-primary to-primary/70 group-hover:shadow-primary/25 group-hover:shadow-md group-hover:scale-105",
          )}
        >
          {isSystemUser ? <ShieldCheck className="h-4.5 w-4.5" /> : <Sparkles className="h-4.5 w-4.5" />}
        </div>

        {!collapsed && (
          <div className="flex flex-col gap-0">
            <span className="text-[13px] font-bold tracking-tight text-foreground leading-tight">
              Trilink
              {isSystemUser && <span className="text-violet-500 dark:text-violet-400">Admin</span>}
            </span>
            <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium group-hover:text-primary/70 transition-colors leading-tight">
              {isSystemUser ? "Painel de Controle" : "Portal do Cliente"}
            </span>
          </div>
        )}
      </Link>
    </div>
  )
}

function SidebarFooter({
  user,
  isSystemUser,
  onClose,
  collapsed,
  mobile,
  navigationAccess,
}: {
  user: SidebarUser
  isSystemUser: boolean
  onClose?: () => void
  collapsed?: boolean
  mobile?: boolean
  navigationAccess?: NavigationAccess
}) {
  const router = useRouter()

  const handleLogout = async () => {
    await authClient.signOut()
    router.push("/login")
  }

  return (
    <div className={cn("border-t border-border/40 shrink-0", collapsed ? "p-2" : "p-2.5")}>
      {mobile ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center w-full rounded-lg",
                "hover:bg-muted transition-colors outline-none group text-left",
                "border border-transparent hover:border-border/40",
                collapsed ? "justify-center px-1.5 py-2" : "gap-3 px-2 py-1.5",
              )}
            >
              <Avatar className="h-8 w-8 border border-border/50 shrink-0">
                <AvatarImage src={user.image ?? ""} alt={user.name} />
                <AvatarFallback
                  className={cn(
                    "text-xs font-bold",
                    isSystemUser
                      ? "bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>

              {!collapsed && (
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span
                    className={cn(
                      "text-[13px] font-medium text-foreground truncate w-full transition-colors leading-tight",
                      isSystemUser ? "group-hover:text-violet-600" : "group-hover:text-primary",
                    )}
                  >
                    {user.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground/70 truncate w-full leading-tight">{user.email}</span>
                </div>
              )}

              {!collapsed && (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
              )}
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
              onClick={() => {
                router.push(isSystemUser && navigationAccess?.settings ? "/portal/configuracoes" : "/portal/perfil")
                onClose?.()
              }}
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              {isSystemUser && navigationAccess?.settings ? "Configuracoes" : "Meu Perfil"}
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2 text-sm"
              onClick={() => {
                router.push("/portal/docs/suporte")
                onClose?.()
              }}
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
      ) : (
        <div
          className={cn(
            "flex items-center rounded-lg border border-border/40 bg-muted/20",
            collapsed ? "justify-center px-1.5 py-2" : "gap-3 px-2 py-2",
          )}
        >
          <Avatar className="h-8 w-8 border border-border/50 shrink-0">
            <AvatarImage src={user.image ?? ""} alt={user.name} />
            <AvatarFallback
              className={cn(
                "text-xs font-bold",
                isSystemUser
                  ? "bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300"
                  : "bg-primary/10 text-primary",
              )}
            >
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>

          {!collapsed && (
            <div className="flex min-w-0 flex-1 flex-col items-start">
              <span className="w-full truncate text-[13px] font-medium leading-tight text-foreground">{user.name}</span>
              <span className="w-full truncate text-[11px] leading-tight text-muted-foreground/70">{user.email}</span>
              <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                {getRoleLabel(user.role)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function AppSidebar({ user, mobile = false, onClose, collapsed = false, navigationAccess }: AppSidebarProps) {
  const pathname = usePathname()
  const isSystemUser = SYSTEM_ROLES.includes(user.role)
  const isSidebarCollapsed = !mobile && collapsed
  const mainItems = filterByAccess(filterByRole(NAV_MAIN, user.role), {
    "/portal": navigationAccess?.dashboard,
  })
  const cadastroItems = filterByAccess(filterByRole(NAV_CADASTROS, user.role), {
    "/portal/cadastros/empresa": navigationAccess?.companies,
    "/portal/cadastros/usuarios": navigationAccess?.users,
    "/portal/contatos": navigationAccess?.contacts,
  })
  const supportItems = filterByAccess(filterByRole(NAV_SUPPORT, user.role), {
    "/portal/tickets": navigationAccess?.tickets,
    "/portal/atendimento": navigationAccess?.atendimento,
    "/portal/plataforma-remota": navigationAccess?.remote,
  })
  const commercialItems = filterByAccess(filterByRole(NAV_COMMERCIAL, user.role), {
    "/portal/comercial/leads": navigationAccess?.crm,
    "/portal/contratos": navigationAccess?.contracts,
  })
  const docsItems = filterByAccess(filterByRole(NAV_DOCS, user.role), {
    "/portal/docs": navigationAccess?.docs,
    "/portal/releases": navigationAccess?.releases,
    "/portal/tools": navigationAccess?.tools,
  })

  const isActive = (href: string) => (href === "/portal" ? pathname === "/portal" : pathname.startsWith(href))

  return (
    <div
      className={cn(
        "flex flex-col overflow-x-hidden border-r border-border/40 bg-background",
        mobile
          ? "h-full w-full"
          : cn("h-screen fixed left-0 top-0 hidden md:flex transition-[width] duration-200", isSidebarCollapsed ? "w-20" : "w-72"),
      )}
    >
      <SidebarBrand isSystemUser={isSystemUser} onClose={onClose} collapsed={isSidebarCollapsed} />

      <div className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-2 py-4 pb-6 space-y-4">
        {mainItems.map((item) => (
          <NavItem key={item.href} item={item} isActive={isActive(item.href)} onClick={onClose} collapsed={isSidebarCollapsed} />
        ))}

        {cadastroItems.length > 0 ? (
          <>
            <Separator className="bg-border/30 mx-1" />
            <NavGroup title="Cadastros" collapsed={isSidebarCollapsed}>
              {cadastroItems.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={isActive(item.href)}
                  onClick={onClose}
                  collapsed={isSidebarCollapsed}
                />
              ))}
            </NavGroup>
          </>
        ) : null}

        {supportItems.length > 0 ? (
          <>
            <Separator className="bg-border/30 mx-1" />
            <NavGroup title="Suporte" collapsed={isSidebarCollapsed}>
              {supportItems.map((item) => (
                <NavItem key={item.href} item={item} isActive={isActive(item.href)} onClick={onClose} collapsed={isSidebarCollapsed} />
              ))}
            </NavGroup>
          </>
        ) : null}

        {commercialItems.length > 0 ? (
          <>
            <Separator className="bg-border/30 mx-1" />
            <NavGroup title="Comercial" collapsed={isSidebarCollapsed}>
              {commercialItems.map((item) => (
                <NavItem key={item.href} item={item} isActive={isActive(item.href)} onClick={onClose} collapsed={isSidebarCollapsed} />
              ))}
            </NavGroup>
          </>
        ) : null}

        {docsItems.length > 0 ? (
          <>
            <Separator className="bg-border/30 mx-1" />
            <NavGroup title="Documentacao" collapsed={isSidebarCollapsed}>
              {docsItems.map((item) => (
                <NavItem key={item.href} item={item} isActive={isActive(item.href)} onClick={onClose} collapsed={isSidebarCollapsed} />
              ))}
            </NavGroup>
          </>
        ) : null}
      </div>

      <SidebarFooter
        user={user}
        isSystemUser={isSystemUser}
        onClose={onClose}
        collapsed={isSidebarCollapsed}
        mobile={mobile}
        navigationAccess={navigationAccess}
      />
    </div>
  )
}

