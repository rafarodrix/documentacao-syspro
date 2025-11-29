"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, ShieldCheck, Lock } from "lucide-react"
import { CompanyTab } from "./CompanyTab"
import { UserTab } from "./UserTab"
import { SystemUserTab } from "./SystemUserTab"
import { Role } from "@prisma/client"
import { hasPermission } from "@/lib/rbac" // Importe o helper de permissões

interface CadastrosContainerProps {
    companies: any[]
    users: any[]
    currentUserRole: Role // Recebemos a Role em vez de um booleano simples
}

export function CadastrosContainer({ companies, users, currentUserRole }: CadastrosContainerProps) {

    // 1. Definição de "Visão Global" (Admin)
    // Se for qualquer cargo interno, consideramos como modo Admin Global para layout
    const isGlobalView = ['ADMIN', 'DEVELOPER', 'SUPORTE'].includes(currentUserRole)

    // 2. Filtros de dados
    const systemUsers = users.filter(u => ['ADMIN', 'DEVELOPER', 'SUPORTE'].includes(u.role))

    // Se for visão global, mostra TODOS os usuários na lista principal (exceto equipe interna se quiser separar)
    // Se for visão cliente, mostra apenas quem veio da server action (que já filtrou por empresa)
    const clientUsers = isGlobalView
        ? users // Admin vê tudo na aba geral
        : users.filter(u => ['CLIENTE_ADMIN', 'CLIENTE_USER'].includes(u.role))

    // 3. Verificação de Permissões (RBAC Granular)
    // Usamos o helper para saber se a aba deve aparecer ou não
    const canViewEmpresas = hasPermission(currentUserRole, 'companies:view')
    const canViewUsuarios = hasPermission(currentUserRole, 'users:view')
    const canViewSistema = hasPermission(currentUserRole, 'system_team:view')

    // Se o usuário não puder ver nada, mostra mensagem de acesso negado
    if (!canViewEmpresas && !canViewUsuarios && !canViewSistema) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground animate-in fade-in zoom-in-95">
                <Lock className="w-12 h-12 mb-4 opacity-20" />
                <h2 className="text-xl font-semibold text-foreground">Acesso Restrito</h2>
                <p>Você não tem permissão para visualizar este módulo.</p>
            </div>
        )
    }

    // Define a aba padrão com base na primeira permissão disponível
    const defaultTab = canViewEmpresas ? "empresa" : (canViewUsuarios ? "usuarios" : "sistema")

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Cadastros</h1>
                <p className="text-muted-foreground">
                    {isGlobalView
                        ? "Gestão global de empresas, clientes e equipe interna."
                        : "Gerencie os dados da sua organização e equipe."}
                </p>
            </div>

            <Tabs defaultValue={defaultTab} className="w-full space-y-6">
                <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 gap-2 overflow-x-auto">

                    {/* ABA EMPRESAS (Condicional) */}
                    {canViewEmpresas && (
                        <TabsTrigger value="empresa" className="gap-2 px-4 py-2">
                            <Building2 className="h-4 w-4" /> {isGlobalView ? "Empresas" : "Minha Empresa"}
                        </TabsTrigger>
                    )}

                    {/* ABA USUÁRIOS (Condicional) */}
                    {canViewUsuarios && (
                        <TabsTrigger value="usuarios" className="gap-2 px-4 py-2">
                            <Users className="h-4 w-4" /> {isGlobalView ? "Todos Usuários" : "Minha Equipe"}
                        </TabsTrigger>
                    )}

                    {/* ABA SISTEMA (Condicional) */}
                    {canViewSistema && (
                        <TabsTrigger value="sistema" className="gap-2 px-4 py-2">
                            <ShieldCheck className="h-4 w-4" /> Equipe Interna
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* CONTEÚDO DAS ABAS */}

                {canViewEmpresas && (
                    <TabsContent value="empresa" className="animate-in fade-in slide-in-from-left-2 duration-300">
                        <Card>
                            <CardHeader>
                                <CardTitle>{isGlobalView ? "Empresas Cadastradas" : "Dados da Organização"}</CardTitle>
                                <CardDescription>Visualize e edite as informações cadastrais.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* Passamos a Role para o componente filho controlar os botões internos */}
                                <CompanyTab data={companies} isAdmin={isGlobalView} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {canViewUsuarios && (
                    <TabsContent value="usuarios" className="animate-in fade-in slide-in-from-left-2 duration-300">
                        <Card>
                            <CardHeader>
                                <CardTitle>{isGlobalView ? "Todos os Usuários" : "Usuários da Empresa"}</CardTitle>
                                <CardDescription>
                                    {isGlobalView
                                        ? "Visão completa de todos os usuários do sistema."
                                        : "Gestão de acesso da sua equipe."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <UserTab data={clientUsers} companies={companies} isAdmin={isGlobalView} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {canViewSistema && (
                    <TabsContent value="sistema" className="animate-in fade-in slide-in-from-left-2 duration-300">
                        <Card className="border-purple-200/20 bg-purple-500/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-purple-600" /> Equipe do Sistema
                                </CardTitle>
                                <CardDescription>Gestão administrativa da plataforma.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SystemUserTab data={systemUsers} companies={companies} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    )
}