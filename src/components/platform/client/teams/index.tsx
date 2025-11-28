"use client";

import { Building2, ShieldCheck, Users } from "lucide-react";
import { Company } from "./types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MembersTable } from "./MembersTable";
import { AddMemberDialog } from "./AddMemberDialog";
import { Badge } from "@/components/ui/badge";

interface TeamManagementProps {
    companies: Company[];
}

export function TeamManagement({ companies }: TeamManagementProps) {
    if (companies.length === 0) {
        return <div className="text-center p-10">Você não está vinculado a nenhuma empresa.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Gestão de Equipes</h1>
                <p className="text-muted-foreground">
                    Gerencie o acesso e os membros das empresas em que você atua.
                </p>
            </div>

            <Tabs defaultValue={companies[0].id} className="w-full">
                {/* Lista de Empresas (Abas) */}
                <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 overflow-x-auto flex-nowrap">
                    {companies.map((company) => (
                        <TabsTrigger
                            key={company.id}
                            value={company.id}
                            className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                        >
                            <Building2 size={16} />
                            {company.name}
                            {company.currentUserRole === 'admin' && (
                                <Badge variant="secondary" className="ml-2 text-[10px] h-5 px-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                                    Admin
                                </Badge>
                            )}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* Conteúdo de cada Empresa */}
                {companies.map((company) => (
                    <TabsContent key={company.id} value={company.id} className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-4">

                        {/* Cabeçalho da Empresa */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    {company.name}
                                    <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                        CNPJ: {company.cnpj}
                                    </span>
                                </h2>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1"><Users size={14} /> {company.users.length} Membros</span>
                                    <span className="flex items-center gap-1"><ShieldCheck size={14} /> Plano: {company.plan}</span>
                                </div>
                            </div>

                            {/* Botão Adicionar (Só aparece se for Admin) */}
                            {company.currentUserRole === 'admin' ? (
                                <AddMemberDialog companyName={company.name} />
                            ) : (
                                <div className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-md border">
                                    Você tem acesso de visualização
                                </div>
                            )}
                        </div>

                        {/* Tabela de Membros */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Membros da Equipe</CardTitle>
                                <CardDescription>
                                    Usuários com acesso aos dados da {company.name}.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <MembersTable users={company.users} />
                            </CardContent>
                        </Card>

                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}