"use client"

import type { Role } from "@prisma/client"
import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { authClient } from "@/lib/auth-client"
import { SYSTEM_ROLES } from "@dosc-syspro/core"
import { getRoleLabel as getUnifiedRoleLabel } from "@dosc-syspro/core"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dosc-syspro/ui"
import { NavItem, NavItemType } from "./nav-item"
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
  infrastructure: boolean
  remote: boolean
  remoteSessions: boolean
  remoteReports: boolean
  agents: boolean
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
  { title: "Empresa", href: "/portal/cadastros/empresa", icon: FileText },
  { title: "Usuarios", href: "/portal/cadastros/usuarios", icon: Users },
  { title: "Contatos", href: "/portal/contatos", icon: Smartphone },
]

const NAV_SUPPORT: NavItemType[] = [
  { title: "Tickets", href: "/portal/tickets", icon: Ticket },
  { title: "Atendimento", href: "/portal/atendimento", icon: MessagesSquare, roles: [...SYSTEM_ROLES], newTab: true },
  { title: "Infraestrutura", href: "/portal/infraestrutura", icon: Monitor },
]

const NAV_COMMERCIAL: NavItemType[] = [
  { title: "CRM", href: "/portal/comercial/leads", icon: Target },
  { title: "Contratos", href: "/portal/contratos", icon: BriefcaseBusiness },
]

const NAV_DOCS: NavItemType[] = [
  { title: "Documentacao", href: "/portal/docs", icon: BookOpen },
  { title: "Ferramentas", href: "/portal/tools", icon: Wrench },
  { title: "Releases", href: "/portal/releases", icon: Rocket },
]

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
    <div className="space-y-0.5">
      {!collapsed && (
        <p className="px-3 pb-1 text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-[0.08em]">{title}</p>
      )}
      {collapsed && <div className="mx-3 mb-1 h-px bg-border/30" />}
      <nav className="grid min-w-0 gap-0.5">{children}</nav>
    </div>
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
        className={cn("flex items-center font-semibold group w-full", collapsed ? "justify-center" : "gap-2")}
        onClick={onClose}
        title={collapsed ? "Trilink" : undefined}
      >
        {collapsed ? (
          <div
            className={cn(
              "h-9 w-9 rounded-xl flex items-center justify-center text-white shadow-sm transition-all duration-300",
              isSystemUser
                ? "bg-violet-600 group-hover:bg-violet-700 group-hover:shadow-violet-500/25 group-hover:shadow-md" // ds-allow: surface accent
                : "bg-linear-to-br from-primary to-primary/70 group-hover:shadow-primary/25 group-hover:shadow-md group-hover:scale-105",
            )}
          >
            {isSystemUser ? <ShieldCheck className="h-4.5 w-4.5" /> : <Sparkles className="h-4.5 w-4.5" />}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative h-7 w-28 dark:hidden">
              <Image
                src="/img/logo/logo-escura.png"
                alt="Trilink"
                fill
                className="object-contain object-left"
                sizes="112px"
              />
            </div>
            <div className="relative hidden h-7 w-28 dark:block">
              <Image
                src="/img/logo/logo-clara.png"
                alt="Trilink"
                fill
                className="object-contain object-left"
                sizes="112px"
              />
            </div>
            {isSystemUser && (
              {/* ds-allow: surface accent */}
              <span className="text-[10px] font-semibold text-violet-500 dark:text-violet-400 uppercase tracking-wider">
                Admin
              </span>
            )}
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
  navigationAccess,
}: {
  user: SidebarUser
  isSystemUser: boolean
  onClose?: () => void
  collapsed?: boolean
  navigationAccess?: NavigationAccess
}) {
  const router = useRouter()

  const handleLogout = async () => {
    await authClient.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className={cn("border-t border-border/40 shrink-0", collapsed ? "p-2" : "p-2")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center w-full rounded-md outline-none",
              "transition-colors hover:bg-muted/60 focus-visible:ring-1 focus-visible:ring-primary/30",
              collapsed ? "justify-center p-2" : "gap-2.5 px-2 py-1.5",
            )}
          >
            <Avatar className="h-7 w-7 border border-border/60 shrink-0">
              <AvatarImage src={user.image ?? ""} alt={user.name} />
              <AvatarFallback
                className={cn(
                  "text-[11px] font-bold",
                  isSystemUser
                    ? "bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300" // ds-allow: surface accent
                    : "bg-primary/10 text-primary",
                )}
              >
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>

            {!collapsed && (
              <>
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="text-[12.5px] font-medium text-foreground truncate w-full leading-tight">
                    {user.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground/60 truncate w-full leading-tight">{user.email}</span>
                </div>
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-56 mb-1" side="top">
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
              router.push(navigationAccess?.settings ? "/portal/configuracoes" : "/portal/perfil")
              onClose?.()
            }}
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            {navigationAccess?.settings ? "Configuracoes" : "Meu Perfil"}
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
            className="cursor-pointer gap-2 text-sm text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20" // ds-allow: status
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

export function AppSidebar({ user, mobile = false, onClose, collapsed = false, navigationAccess }: AppSidebarProps) {
  const pathname = usePathname()
  const isSystemUser = SYSTEM_ROLES.includes(user.role)
  const isSidebarCollapsed = !mobile && collapsed
  const supportNavItems = NAV_SUPPORT.map((item) =>
    item.href === "/portal/tickets" ? { ...item, title: isSystemUser ? "Tickets" : "Meus Chamados" } : item,
  )
  const mainItems = filterByAccess(NAV_MAIN, {
    "/portal": navigationAccess?.dashboard,
  })
  const cadastroItems = filterByAccess(NAV_CADASTROS, {
    "/portal/cadastros/empresa": navigationAccess?.companies,
    "/portal/cadastros/usuarios": navigationAccess?.users,
    "/portal/contatos": navigationAccess?.contacts,
  })
  const supportItems = filterByAccess(supportNavItems, {
    "/portal/tickets": navigationAccess?.tickets,
    "/portal/atendimento": navigationAccess?.atendimento,
    "/portal/infraestrutura": navigationAccess?.infrastructure,
  })
  const commercialItems = filterByAccess(NAV_COMMERCIAL, {
    "/portal/comercial/leads": navigationAccess?.crm,
    "/portal/contratos": navigationAccess?.contracts,
  })
  const docsItems = filterByAccess(NAV_DOCS, {
    "/portal/docs": navigationAccess?.docs,
    "/portal/releases": navigationAccess?.releases,
    "/portal/tools": navigationAccess?.tools,
  })

  const isActive = (href: string) => {
    if (href === "/portal") return pathname === "/portal"
    if (href === "/portal/infraestrutura") {
      return (
        pathname.startsWith("/portal/infraestrutura") ||
        pathname.startsWith("/portal/infraestrutura/hosts")
      )
    }
    return pathname.startsWith(href)
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-x-hidden border-r border-border/40 bg-background",
        mobile
          ? "h-full w-full"
          : cn("h-screen fixed left-0 top-0 hidden md:flex transition-[width] duration-200", isSidebarCollapsed ? "w-16" : "w-64"),
      )}
    >
      <SidebarBrand isSystemUser={isSystemUser} onClose={onClose} collapsed={isSidebarCollapsed} />

      <div className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-2 py-3 pb-4 space-y-4">
        <div className="space-y-0.5">
          {mainItems.map((item) => (
            <NavItem key={item.href} item={item} isActive={isActive(item.href)} onClick={onClose} collapsed={isSidebarCollapsed} />
          ))}
        </div>

        {cadastroItems.length > 0 && (
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
        )}

        {supportItems.length > 0 && (
          <NavGroup title="Suporte" collapsed={isSidebarCollapsed}>
            {supportItems.map((item) => (
              <NavItem key={item.href} item={item} isActive={isActive(item.href)} onClick={onClose} collapsed={isSidebarCollapsed} />
            ))}
          </NavGroup>
        )}

        {commercialItems.length > 0 && (
          <NavGroup title="Comercial" collapsed={isSidebarCollapsed}>
            {commercialItems.map((item) => (
              <NavItem key={item.href} item={item} isActive={isActive(item.href)} onClick={onClose} collapsed={isSidebarCollapsed} />
            ))}
          </NavGroup>
        )}

        {docsItems.length > 0 && (
          <NavGroup title="Documentacao" collapsed={isSidebarCollapsed}>
            {docsItems.map((item) => (
              <NavItem key={item.href} item={item} isActive={isActive(item.href)} onClick={onClose} collapsed={isSidebarCollapsed} />
            ))}
          </NavGroup>
        )}
      </div>

      <SidebarFooter
        user={user}
        isSystemUser={isSystemUser}
        onClose={onClose}
        collapsed={isSidebarCollapsed}
        navigationAccess={navigationAccess}
      />
    </div>
  )
}
