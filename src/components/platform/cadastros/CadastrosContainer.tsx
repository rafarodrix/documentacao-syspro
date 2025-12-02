"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Users, ShieldCheck, Lock } from "lucide-react"
import { CompanyTab } from "./CompanyTab"
import { UserTab } from "./user/UserTab"
import { SystemUserTab } from "./user/SystemUserTab"
import { Role } from "@prisma/client"
import { hasPermission } from "@/lib/rbac"

interface CadastrosContainerProps {
    companies: any[]
    users: any[]
    currentUserRole: Role
}

export function CadastrosContainer({ companies, users, currentUserRole }: CadastrosContainerProps) {

    // 1. Lógica de Visão Global (Para saber se mostra botões de admin, etc)
    const isGlobalView = ['ADMIN', 'DEVELOPER', 'SUPORTE'].includes(currentUserRole)

    // 2. Filtros de dados (SEPARAÇÃO ESTRITA)

    // Lista A: Apenas Equipe do Sistema
    const systemUsers = users.filter(u => ['ADMIN', 'DEVELOPER', 'SUPORTE'].includes(u.role))

    // Lista B: Apenas Clientes (Removemos a lógica que mostrava tudo para o Admin)
    // Agora, Admin ou não, esta lista só conterá usuários de clientes.
    const clientUsers = users.filter(u => ['CLIENTE_ADMIN', 'CLIENTE_USER'].includes(u.role))


    // 3. Permissões
    const canViewEmpresas = hasPermission(currentUserRole, 'companies:view')
    const canViewUsuarios = hasPermission(currentUserRole, 'users:view')
    const canViewSistema = hasPermission(currentUserRole, 'system_team:view')

    if (!canViewEmpresas && !canViewUsuarios && !canViewSistema) {
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

    // Define aba padrão inteligente
    const defaultTab = canViewEmpresas ? "empresa" : (canViewUsuarios ? "usuarios" : "sistema")

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Cabeçalho da Página */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Cadastros</h1>
                <p className="text-muted-foreground mt-1">
                    {isGlobalView
                        ? "Gestão centralizada de organizações, clientes e equipe interna."
                        : "Gerencie os dados da sua organização e controle o acesso da equipe."}
                </p>
            </div>

            <Tabs defaultValue={defaultTab} className="w-full space-y-6">

                {/* Lista de Abas */}
                <div className="overflow-x-auto pb-2">
                    <TabsList className="w-full sm:w-auto justify-start h-11 p-1 bg-muted/40 border border-border/40 rounded-lg gap-1">

                        {canViewEmpresas && (
                            <TabsTrigger value="empresa" className="gap-2 px-4 h-9 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                                <Building2 className="h-4 w-4" /> {isGlobalView ? "Empresas" : "Minha Empresa"}
                            </TabsTrigger>
                        )}

                        {canViewUsuarios && (
                            <TabsTrigger value="usuarios" className="gap-2 px-4 h-9 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                                <Users className="h-4 w-4" /> {isGlobalView ? "Clientes" : "Minha Equipe"}
                            </TabsTrigger>
                        )}

                        {canViewSistema && (
                            <TabsTrigger value="sistema" className="gap-2 px-4 h-9 text-purple-600 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 dark:data-[state=active]:bg-purple-900/20 dark:data-[state=active]:text-purple-300 transition-all">
                                <ShieldCheck className="h-4 w-4" /> Equipe Interna
                            </TabsTrigger>
                        )}
                    </TabsList>
                </div>

                {/* Conteúdo das Abas */}

                {canViewEmpresas && (
                    <TabsContent value="empresa" className="space-y-4 focus-visible:outline-none">
                        <div className="flex flex-col gap-1 px-1">
                            <h3 className="text-lg font-medium">{isGlobalView ? "Empresas Cadastradas" : "Dados da Organização"}</h3>
                            <p className="text-sm text-muted-foreground">Visualize e edite as informações cadastrais.</p>
                        </div>
                        <CompanyTab data={companies} isAdmin={isGlobalView} />
                    </TabsContent>
                )}

                {canViewUsuarios && (
                    <TabsContent value="usuarios" className="space-y-4 focus-visible:outline-none">
                        <div className="flex flex-col gap-1 px-1">
                            {/* Título ajustado para refletir que são apenas clientes */}
                            <h3 className="text-lg font-medium">{isGlobalView ? "Usuários dos Clientes" : "Gestão de Equipe"}</h3>
                            <p className="text-sm text-muted-foreground">
                                {isGlobalView
                                    ? "Listagem de usuários vinculados às empresas clientes."
                                    : "Controle quem tem acesso ao sistema."}
                            </p>
                        </div>
                        <UserTab data={clientUsers} companies={companies} isAdmin={isGlobalView} />
                    </TabsContent>
                )}

                {canViewSistema && (
                    <TabsContent value="sistema" className="space-y-4 focus-visible:outline-none">
                        <div className="flex flex-col gap-1 px-1">
                            <h3 className="text-lg font-medium flex items-center gap-2 text-purple-700 dark:text-purple-400">
                                <ShieldCheck className="h-5 w-5" /> Equipe do Sistema
                            </h3>
                            <p className="text-sm text-muted-foreground">Acesso administrativo à plataforma.</p>
                        </div>
                        <SystemUserTab data={systemUsers} companies={companies} />
                    </TabsContent>
                )}

            </Tabs>
        </div>
    )
}