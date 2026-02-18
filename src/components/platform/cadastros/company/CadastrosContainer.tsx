// src\components\platform\cadastros\company\CadastrosContainer.tsx
"use client"

import { useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Users, ShieldCheck, Lock } from "lucide-react"
import { CompanyTab } from "./CompanyTab"
import { UserTab } from "../user/UserTab"
import { SystemUserTab } from "../user/SystemUserTab"
import { Role, CompanyStatus } from "@prisma/client"
import { hasPermission } from "@/lib/rbac"

// 1. Interface de Empresa Sincronizada
interface CompanyWithAddress {
    id: string;
    razaoSocial: string;
    cnpj: string;
    nomeFantasia: string | null;
    status: CompanyStatus;
    address?: any;
    [key: string]: any;
}

// 2. Interface de Usuário Sincronizada com o novo UserTab
interface UserWithRelations {
    id: string;
    name: string | null;
    email: string;
    image: string | null;     // Adicionado
    role: Role;
    isActive: boolean;        // Adicionado
    jobTitle: string | null;  // Adicionado
    cpf: string | null;       // Adicionado
    memberships: any[];       // Adicionado
    [key: string]: any;
}

interface CadastrosContainerProps {
    companies: CompanyWithAddress[]
    users: UserWithRelations[]
    currentUserRole: Role
}

export function CadastrosContainer({
    companies,
    users,
    currentUserRole
}: CadastrosContainerProps) {

    // Lógica de Permissões
    const permissions = useMemo(() => ({
        isGlobalView: ([Role.ADMIN, Role.DEVELOPER, Role.SUPORTE] as Role[]).includes(currentUserRole),
        canViewEmpresas: hasPermission(currentUserRole, 'companies:view'),
        canViewUsuarios: hasPermission(currentUserRole, 'users:view'),
        canViewSistema: hasPermission(currentUserRole, 'system_team:view'),
    }), [currentUserRole]);

    // Filtros de Usuários
    const { systemUsers, clientUsers } = useMemo(() => {
        return {
            systemUsers: users.filter(u =>
                ([Role.ADMIN, Role.DEVELOPER, Role.SUPORTE] as Role[]).includes(u.role)
            ),
            clientUsers: users.filter(u =>
                ([Role.CLIENTE_ADMIN, Role.CLIENTE_USER] as Role[]).includes(u.role)
            )
        }
    }, [users]);

    if (!permissions.canViewEmpresas && !permissions.canViewUsuarios && !permissions.canViewSistema) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground animate-in fade-in zoom-in-95">
                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 opacity-40" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Acesso Restrito</h2>
                <p>Você não tem permissão para visualizar este módulo.</p>
            </div>
        )
    }

    const defaultTab = permissions.canViewEmpresas
        ? "empresa"
        : (permissions.canViewUsuarios ? "usuarios" : "sistema")

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Cadastros</h1>
                <p className="text-muted-foreground">
                    {permissions.isGlobalView
                        ? "Gestão centralizada de organizações, clientes e equipe interna."
                        : "Gerencie os dados da sua organização e controle o acesso da equipe."}
                </p>
            </header>

            <Tabs defaultValue={defaultTab} className="w-full space-y-6">
                <div className="overflow-x-auto pb-1">
                    <TabsList className="inline-flex h-11 items-center justify-center rounded-lg bg-muted/40 p-1 text-muted-foreground border border-border/40">
                        {permissions.canViewEmpresas && (
                            <TabsTrigger value="empresa" className="gap-2 px-4">
                                <Building2 className="h-4 w-4" />
                                {permissions.isGlobalView ? "Empresas" : "Minha Empresa"}
                            </TabsTrigger>
                        )}

                        {permissions.canViewUsuarios && (
                            <TabsTrigger value="usuarios" className="gap-2 px-4">
                                <Users className="h-4 w-4" />
                                {permissions.isGlobalView ? "Clientes" : "Minha Equipe"}
                            </TabsTrigger>
                        )}

                        {permissions.canViewSistema && (
                            <TabsTrigger value="sistema" className="gap-2 px-4 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 dark:data-[state=active]:bg-purple-900/20 dark:data-[state=active]:text-purple-300">
                                <ShieldCheck className="h-4 w-4" />
                                Equipe Interna
                            </TabsTrigger>
                        )}
                    </TabsList>
                </div>

                {/* --- CONTEÚDO DAS ABAS --- */}

                {permissions.canViewEmpresas && (
                    <TabsContent value="empresa" className="space-y-4 outline-none">
                        <section className="px-1">
                            <h3 className="text-lg font-medium">
                                {permissions.isGlobalView ? "Empresas Cadastradas" : "Dados da Organização"}
                            </h3>
                            <p className="text-sm text-muted-foreground">Visualize e edite as informações cadastrais.</p>
                        </section>
                        <CompanyTab data={companies} isAdmin={permissions.isGlobalView} />
                    </TabsContent>
                )}

                {permissions.canViewUsuarios && (
                    <TabsContent value="usuarios" className="space-y-4 outline-none">
                        <section className="px-1">
                            <h3 className="text-lg font-medium">
                                {permissions.isGlobalView ? "Usuários dos Clientes" : "Gestão de Equipe"}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {permissions.isGlobalView
                                    ? "Listagem de usuários vinculados às empresas clientes."
                                    : "Controle quem tem acesso ao sistema."}
                            </p>
                        </section>
                        <UserTab data={clientUsers} companies={companies} isAdmin={permissions.isGlobalView} />
                    </TabsContent>
                )}

                {permissions.canViewSistema && (
                    <TabsContent value="sistema" className="space-y-4 outline-none">
                        <section className="px-1">
                            <h3 className="text-lg font-medium flex items-center gap-2 text-purple-700 dark:text-purple-400">
                                <ShieldCheck className="h-5 w-5" /> Equipe do Sistema
                            </h3>
                            <p className="text-sm text-muted-foreground">Acesso administrativo à plataforma.</p>
                        </section>
                        <SystemUserTab data={systemUsers} companies={companies} />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    )
}