"use client"

import { useMemo } from "react"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { ShieldCheck, Lock } from "lucide-react"
import { CompanyTab } from "./CompanyTab"
import { UserTab } from "../user/UserTab"
import { SystemUserTab } from "../user/SystemUserTab"
import { Role, CompanyStatus } from "@prisma/client"
import { hasPermission } from "@/lib/rbac"

interface CompanyWithAddress {
  id: string
  razaoSocial: string
  cnpj: string
  nomeFantasia: string | null
  status: CompanyStatus
  address?: any
  [key: string]: any
}

interface UserWithRelations {
  id: string
  name: string | null
  email: string
  image: string | null
  role: Role
  isActive: boolean
  jobTitle: string | null
  cpf: string | null
  phone: string | null
  memberships: any[]
  [key: string]: any
}

interface CadastrosContainerProps {
  companies: CompanyWithAddress[]
  users: UserWithRelations[]
  currentUserRole: Role
  initialTab?: string
  pageTitle?: string
  pageDescription?: string
}

const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE]
const CLIENT_ROLES: Role[] = [Role.CLIENTE_ADMIN, Role.CLIENTE_USER]

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in zoom-in-95 duration-300">
      <div className="h-14 w-14 rounded-2xl bg-muted/40 flex items-center justify-center mb-4 ring-1 ring-border/40">
        <Lock className="w-6 h-6 text-muted-foreground/40" />
      </div>
      <h2 className="text-base font-semibold text-foreground">Acesso restrito</h2>
      <p className="text-sm text-muted-foreground mt-1">Voce nao tem permissao para visualizar este modulo.</p>
    </div>
  )
}

export function CadastrosContainer({
  companies,
  users,
  currentUserRole,
  initialTab,
  pageTitle,
  pageDescription,
}: CadastrosContainerProps) {
  const permissions = useMemo(
    () => ({
      isGlobalView: SYSTEM_ROLES.includes(currentUserRole),
      canViewEmpresas: hasPermission(currentUserRole, "companies:view"),
      canViewUsuarios: hasPermission(currentUserRole, "users:view"),
      canViewSistema: hasPermission(currentUserRole, "system_team:view"),
      canCreateCompanies: hasPermission(currentUserRole, "companies:create"),
      canEditCompanies: hasPermission(currentUserRole, "companies:edit"),
      canStatusCompanies: hasPermission(currentUserRole, "companies:status"),
      canDeleteCompanies: currentUserRole === Role.ADMIN,
      canManageUsers: hasPermission(currentUserRole, "users:create") || hasPermission(currentUserRole, "users:edit") || hasPermission(currentUserRole, "users:status"),
      canManageSystemUsers: currentUserRole === Role.ADMIN,
    }),
    [currentUserRole],
  )

  const { systemUsers, clientUsers } = useMemo(
    () => ({
      systemUsers: users.filter((u) => SYSTEM_ROLES.includes(u.role)),
      clientUsers: users.filter((u) => CLIENT_ROLES.includes(u.role)),
    }),
    [users],
  )

  const hasAnyPermission = permissions.canViewEmpresas || permissions.canViewUsuarios || permissions.canViewSistema
  if (!hasAnyPermission) return <AccessDenied />

  const fallbackTab = permissions.canViewEmpresas ? "empresa" : permissions.canViewUsuarios ? "usuarios" : "sistema"
  const allowedTabs = new Set<string>()
  if (permissions.canViewEmpresas) allowedTabs.add("empresa")
  if (permissions.canViewUsuarios) allowedTabs.add("usuarios")
  if (permissions.canViewSistema) allowedTabs.add("sistema")
  const defaultTab = initialTab && allowedTabs.has(initialTab) ? initialTab : fallbackTab

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight">{pageTitle || "Cadastros"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pageDescription ||
              (permissions.isGlobalView
                ? "Gestao centralizada de organizacoes, clientes e equipe interna."
                : "Gerencie os dados da sua organizacao e controle o acesso da equipe.")}
          </p>
        </div>

        {permissions.isGlobalView && (
          <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Visao global
          </span>
        )}
      </header>

      <Tabs value={defaultTab} className="w-full">
        {permissions.canViewEmpresas && (
          <TabsContent value="empresa" className="outline-none mt-0">
            <CompanyTab
              data={companies}
              canCreate={permissions.canCreateCompanies}
              canEdit={permissions.canEditCompanies}
              canToggleStatus={permissions.canStatusCompanies}
              canDelete={permissions.canDeleteCompanies}
              canEditCnpj={SYSTEM_ROLES.includes(currentUserRole)}
            />
          </TabsContent>
        )}

        {permissions.canViewUsuarios && (
          <TabsContent value="usuarios" className="outline-none mt-0">
            <UserTab data={clientUsers} companies={companies} isAdmin={permissions.isGlobalView} canManage={permissions.canManageUsers} />
          </TabsContent>
        )}

        {permissions.canViewSistema && (
          <TabsContent value="sistema" className="outline-none mt-0">
            <SystemUserTab data={systemUsers} companies={companies} canManage={permissions.canManageSystemUsers} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
