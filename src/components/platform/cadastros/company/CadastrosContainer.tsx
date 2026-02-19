// src/components/platform/cadastros/company/CadastrosContainer.tsx
"use client"

import { useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Users, ShieldCheck, Lock } from "lucide-react"
import { CompanyTab } from "./CompanyTab"
import { UserTab } from "../user/UserTab"
import { SystemUserTab } from "../user/SystemUserTab"
import { Role, CompanyStatus } from "@prisma/client"
import { hasPermission } from "@/lib/rbac"
import { cn } from "@/lib/utils"

// ─── Tipos ────────────────────────────────────────────────────────────────────

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
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE]
const CLIENT_ROLES: Role[] = [Role.CLIENTE_ADMIN, Role.CLIENTE_USER]

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in zoom-in-95 duration-300">
      <div className="h-14 w-14 rounded-2xl bg-muted/40 flex items-center justify-center mb-4 ring-1 ring-border/40">
        <Lock className="w-6 h-6 text-muted-foreground/40" />
      </div>
      <h2 className="text-base font-semibold text-foreground">Acesso Restrito</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Você não tem permissão para visualizar este módulo.
      </p>
    </div>
  )
}

interface SectionDescriptionProps {
  title: string
  description: string
}

function SectionDescription({ title, description }: SectionDescriptionProps) {
  return (
    <div className="px-1 pb-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function CadastrosContainer({
  companies,
  users,
  currentUserRole,
}: CadastrosContainerProps) {

  const permissions = useMemo(() => ({
    isGlobalView: SYSTEM_ROLES.includes(currentUserRole),
    canViewEmpresas: hasPermission(currentUserRole, "companies:view"),
    canViewUsuarios: hasPermission(currentUserRole, "users:view"),
    canViewSistema: hasPermission(currentUserRole, "system_team:view"),
  }), [currentUserRole])

  const { systemUsers, clientUsers } = useMemo(() => ({
    systemUsers: users.filter((u) => SYSTEM_ROLES.includes(u.role)),
    clientUsers: users.filter((u) => CLIENT_ROLES.includes(u.role)),
  }), [users])

  const hasAnyPermission =
    permissions.canViewEmpresas ||
    permissions.canViewUsuarios ||
    permissions.canViewSistema

  if (!hasAnyPermission) return <AccessDenied />

  const defaultTab = permissions.canViewEmpresas
    ? "empresa"
    : permissions.canViewUsuarios
      ? "usuarios"
      : "sistema"

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight">
            Cadastros
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {permissions.isGlobalView
              ? "Gestão centralizada de organizações, clientes e equipe interna."
              : "Gerencie os dados da sua organização e controle o acesso da equipe."}
          </p>
        </div>

        {/* Badge de contexto de visão */}
        {permissions.isGlobalView && (
          <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Visão Global
          </span>
        )}
      </header>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <Tabs defaultValue={defaultTab} className="w-full space-y-5">
        <div className="overflow-x-auto pb-px">
          <TabsList
            className={cn(
              "inline-flex h-10 items-center rounded-lg p-1",
              "bg-muted/40 border border-border/40",
              "text-muted-foreground",
            )}
          >
            {permissions.canViewEmpresas && (
              <TabsTrigger
                value="empresa"
                className="gap-2 px-4 text-sm data-[state=active]:shadow-sm"
              >
                <Building2 className="h-3.5 w-3.5" />
                {permissions.isGlobalView ? "Empresas" : "Minha Empresa"}
              </TabsTrigger>
            )}

            {permissions.canViewUsuarios && (
              <TabsTrigger
                value="usuarios"
                className="gap-2 px-4 text-sm data-[state=active]:shadow-sm"
              >
                <Users className="h-3.5 w-3.5" />
                {permissions.isGlobalView ? "Clientes" : "Minha Equipe"}
              </TabsTrigger>
            )}

            {permissions.canViewSistema && (
              <TabsTrigger
                value="sistema"
                className={cn(
                  "gap-2 px-4 text-sm data-[state=active]:shadow-sm",
                  "data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700",
                  "dark:data-[state=active]:bg-purple-900/20 dark:data-[state=active]:text-purple-300",
                )}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Equipe Interna
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* ── Empresas ─────────────────────────────────────────────── */}
        {permissions.canViewEmpresas && (
          <TabsContent value="empresa" className="space-y-4 outline-none">
            <SectionDescription
              title={permissions.isGlobalView ? "Empresas Cadastradas" : "Dados da Organização"}
              description="Visualize e edite as informações cadastrais e fiscais."
            />
            <CompanyTab data={companies} isAdmin={permissions.isGlobalView} />
          </TabsContent>
        )}

        {/* ── Usuários / Equipe ─────────────────────────────────────── */}
        {permissions.canViewUsuarios && (
          <TabsContent value="usuarios" className="space-y-4 outline-none">
            <SectionDescription
              title={permissions.isGlobalView ? "Usuários dos Clientes" : "Gestão de Equipe"}
              description={
                permissions.isGlobalView
                  ? "Listagem de usuários vinculados às empresas clientes."
                  : "Controle quem tem acesso ao sistema e seus níveis de permissão."
              }
            />
            <UserTab
              data={clientUsers}
              companies={companies}
              isAdmin={permissions.isGlobalView}
            />
          </TabsContent>
        )}

        {/* ── Equipe Interna ────────────────────────────────────────── */}
        {permissions.canViewSistema && (
          <TabsContent value="sistema" className="space-y-4 outline-none">
            <SectionDescription
              title="Equipe do Sistema"
              description="Administradores, desenvolvedores e suporte com acesso à plataforma."
            />
            <SystemUserTab data={systemUsers} companies={companies} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}