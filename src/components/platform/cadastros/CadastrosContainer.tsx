"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, ShieldCheck } from "lucide-react"
import { CompanyTab } from "./CompanyTab"
import { UserTab } from "./UserTab"
import { SystemUserTab } from "./SystemUserTab" // <--- Importe o novo componente

interface CadastrosContainerProps {
    companies: any[]
    users: any[]
    isAdmin: boolean
}

export function CadastrosContainer({ companies, users, isAdmin }: CadastrosContainerProps) {

    // 1. SEPARAR OS USUÁRIOS
    const systemUsers = users.filter(u => ['ADMIN', 'DEVELOPER', 'SUPORTE'].includes(u.role))
    const clientUsers = users.filter(u => ['CLIENTE_ADMIN', 'CLIENTE_USER'].includes(u.role))

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Cadastros</h1>
                <p className="text-muted-foreground">
                    {isAdmin
                        ? "Gestão global de empresas, clientes e equipe interna."
                        : "Gerencie os dados da sua organização e equipe."}
                </p>
            </div>

            <Tabs defaultValue="empresa" className="w-full space-y-6">
                <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3 lg:w-[600px]' : 'grid-cols-2 lg:w-[400px]'}`}>
                    <TabsTrigger value="empresa" className="gap-2">
                        <Building2 className="h-4 w-4" /> {isAdmin ? "Empresas" : "Minha Empresa"}
                    </TabsTrigger>

                    <TabsTrigger value="usuarios" className="gap-2">
                        <Users className="h-4 w-4" /> {isAdmin ? "Clientes" : "Minha Equipe"}
                    </TabsTrigger>

                    {/* ABA NOVA - SÓ PARA ADMIN */}
                    {isAdmin && (
                        <TabsTrigger value="sistema" className="gap-2">
                            <ShieldCheck className="h-4 w-4" /> Equipe Interna
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* ABA EMPRESA */}
                <TabsContent value="empresa">
                    <Card>
                        <CardHeader>
                            <CardTitle>{isAdmin ? "Empresas Cadastradas" : "Dados da Organização"}</CardTitle>
                            <CardDescription>Visualize e edite as informações cadastrais.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CompanyTab data={companies} isAdmin={isAdmin} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA USUÁRIOS (CLIENTES) */}
                <TabsContent value="usuarios">
                    <Card>
                        <CardHeader>
                            <CardTitle>Usuários dos Clientes</CardTitle>
                            <CardDescription>Gestão de acesso das empresas cadastradas.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Passamos apenas os clientUsers para não misturar */}
                            <UserTab data={clientUsers} companies={companies} isAdmin={isAdmin} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA SISTEMA (INTERNO) */}
                {isAdmin && (
                    <TabsContent value="sistema">
                        <Card className="border-purple-200/20 bg-purple-500/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-purple-600" />
                                    Equipe do Sistema
                                </CardTitle>
                                <CardDescription>
                                    Administradores, Desenvolvedores e Suporte Técnico da plataforma.
                                </CardDescription>
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