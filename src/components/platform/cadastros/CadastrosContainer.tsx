"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users } from "lucide-react"
import { CompanyTab } from "@/components/platform/cadastros/CompanyTab"
import { UserTab } from "@/components/platform/cadastros/UserTab"

interface CadastrosContainerProps {
    companies: any[] // Tipar com Prisma.CompanyGetPayload
    users: any[]     // Tipar com Prisma.UserGetPayload
    isAdmin: boolean // Flag para saber se libera funções de Super Admin
}

export function CadastrosContainer({ companies, users, isAdmin }: CadastrosContainerProps) {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Cadastros</h1>
                <p className="text-muted-foreground">
                    {isAdmin
                        ? "Gestão global de empresas e usuários do sistema."
                        : "Gerencie os dados da sua organização e equipe."}
                </p>
            </div>

            <Tabs defaultValue="empresa" className="w-full space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="empresa" className="gap-2">
                        <Building2 className="h-4 w-4" /> {isAdmin ? "Empresas" : "Minha Empresa"}
                    </TabsTrigger>
                    <TabsTrigger value="usuarios" className="gap-2">
                        <Users className="h-4 w-4" /> {isAdmin ? "Todos Usuários" : "Minha Equipe"}
                    </TabsTrigger>
                </TabsList>

                {/* ABA EMPRESA */}
                <TabsContent value="empresa">
                    <Card>
                        <CardHeader>
                            <CardTitle>{isAdmin ? "Empresas Cadastradas" : "Dados da Organização"}</CardTitle>
                            <CardDescription>
                                Visualize e edite as informações cadastrais.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CompanyTab data={companies} isAdmin={isAdmin} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA USUÁRIOS */}
                <TabsContent value="usuarios">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gestão de Acesso</CardTitle>
                            <CardDescription>
                                Controle quem tem acesso ao sistema.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UserTab data={users} companies={companies} isAdmin={isAdmin} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}