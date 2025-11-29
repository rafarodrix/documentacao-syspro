"use client"

import { useState } from "react"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
    Search, MoreHorizontal, Shield, Building
} from "lucide-react"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"

// Componente do Modal de Criação
import { CreateUserDialog } from "./CreateUserDialog"

interface UserTabProps {
    data: any[]
    companies: any[]
    isAdmin: boolean
}

export function UserTab({ data, companies, isAdmin }: UserTabProps) {
    const [searchTerm, setSearchTerm] = useState("")

    // Filtro de busca local
    const filteredData = data.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-4">
            {/* --- TOPO: Busca e Ação --- */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome ou e-mail..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* --- AQUI ESTÁ A INTEGRAÇÃO DO MODAL --- */}
                {/* Este componente encapsula o botão e o modal de criação */}
                <CreateUserDialog companies={companies} isAdmin={isAdmin} />

            </div>

            {/* --- TABELA DE USUÁRIOS --- */}
            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead>Usuário</TableHead>
                            <TableHead>Função (Role)</TableHead>
                            <TableHead>Empresas Vinculadas</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    Nenhum usuário encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((user) => (
                                <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">

                                    {/* Coluna 1: Avatar e Identificação */}
                                    <TableCell className="flex items-center gap-3 py-3">
                                        <Avatar className="h-9 w-9 border border-border/50">
                                            <AvatarImage src={user.image} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                                {user.name?.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm text-foreground">{user.name}</span>
                                            <span className="text-xs text-muted-foreground">{user.email}</span>
                                        </div>
                                    </TableCell>

                                    {/* Coluna 2: Role Global */}
                                    <TableCell>
                                        {user.role === 'ADMIN' || user.role === 'DEVELOPER' ? (
                                            <Badge variant="default" className="text-[10px] bg-purple-600 hover:bg-purple-700 gap-1 px-2">
                                                <Shield className="w-3 h-3" /> Global Admin
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="font-normal text-muted-foreground">
                                                Usuário
                                            </Badge>
                                        )}
                                    </TableCell>

                                    {/* Coluna 3: Vínculos (Multi-tenant) */}
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                                            {user.memberships.length > 0 ? (
                                                user.memberships.map((m: any) => (
                                                    <Badge
                                                        key={m.company.id}
                                                        variant="outline"
                                                        className="text-[10px] gap-1 font-normal bg-background border-border/60"
                                                    >
                                                        <Building className="w-3 h-3 text-muted-foreground" />
                                                        {m.company.nomeFantasia || m.company.razaoSocial}
                                                        {m.role === 'ADMIN' && (
                                                            <span className="text-amber-600 font-bold ml-0.5" title="Admin da Empresa">*</span>
                                                        )}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-xs text-red-400 italic">Sem vínculo</span>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Coluna 4: Status */}
                                    <TableCell>
                                        <div className={`flex items-center gap-1.5 text-xs font-medium ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                            <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                                            {user.isActive ? "Ativo" : "Inativo"}
                                        </div>
                                    </TableCell>

                                    {/* Coluna 5: Ações */}
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-[160px]">
                                                <DropdownMenuLabel>Gerenciar</DropdownMenuLabel>
                                                <DropdownMenuItem className="cursor-pointer">Editar Dados</DropdownMenuItem>
                                                {isAdmin && (
                                                    <DropdownMenuItem className="cursor-pointer">Resetar Senha</DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className={`cursor-pointer ${user.isActive ? "text-red-600 focus:text-red-600 focus:bg-red-50" : "text-green-600 focus:text-green-600 focus:bg-green-50"}`}>
                                                    {user.isActive ? "Desativar Acesso" : "Reativar Acesso"}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}