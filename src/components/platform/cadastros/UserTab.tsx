"use client"

import { useState } from "react"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Search, MoreHorizontal, Shield, Building, UserX, Mail, UserCheck
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
                {/* Barra de Busca com Ícone e Focus State */}
                <div className="relative w-full sm:w-72 group">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Buscar membro..."
                        className="pl-9 bg-background border-border focus-visible:ring-primary/20"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Modal de Criação Integrado */}
                <CreateUserDialog companies={companies} isAdmin={isAdmin} context="CLIENT" />
            </div>

            {/* --- TABELA (Visual Moderno) --- */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="w-[300px]">Usuário</TableHead>
                            <TableHead>Função</TableHead>
                            <TableHead>Vínculos</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            // --- EMPTY STATE MELHORADO ---
                            <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                        <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-2">
                                            <UserX className="h-6 w-6 opacity-50" />
                                        </div>
                                        <p className="text-base font-medium text-foreground">Nenhum usuário encontrado</p>
                                        <p className="text-sm">
                                            {searchTerm ? "Tente buscar por outro termo." : "Convide membros para compor sua equipe."}
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((user) => (
                                <TableRow key={user.id} className="hover:bg-muted/30 transition-colors cursor-default">

                                    {/* Coluna 1: Avatar e Identificação */}
                                    <TableCell className="py-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border border-border/50">
                                                <AvatarImage src={user.image} />
                                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                                    {user.name ? user.name.substring(0, 2).toUpperCase() : "??"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm text-foreground">{user.name}</span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    {user.email}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Coluna 2: Role Global */}
                                    <TableCell>
                                        {user.role === 'ADMIN' || user.role === 'DEVELOPER' ? (
                                            <Badge variant="default" className="text-[10px] bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/20 gap-1 px-2 hover:bg-purple-500/25">
                                                <Shield className="w-3 h-3" /> Global Admin
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="font-normal text-muted-foreground bg-muted/50">
                                                {user.role === 'CLIENTE_ADMIN' ? 'Gestor' : 'Colaborador'}
                                            </Badge>
                                        )}
                                    </TableCell>

                                    {/* Coluna 3: Vínculos (Multi-tenant) */}
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                                            {user.memberships && user.memberships.length > 0 ? (
                                                user.memberships.map((m: any) => (
                                                    <Badge
                                                        key={m.company.id}
                                                        variant="outline"
                                                        className="text-[10px] gap-1 font-normal bg-background border-border/60 text-muted-foreground"
                                                    >
                                                        <Building className="w-3 h-3 opacity-70" />
                                                        {m.company.nomeFantasia || m.company.razaoSocial}
                                                        {m.role === 'ADMIN' && (
                                                            <span className="text-amber-500 font-bold ml-0.5" title="Admin da Empresa">*</span>
                                                        )}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-xs text-muted-foreground/50 italic">Sem vínculo</span>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Coluna 4: Status */}
                                    <TableCell>
                                        <StatusBadge isActive={user.isActive} />
                                    </TableCell>

                                    {/* Coluna 5: Ações */}
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted data-[state=open]:bg-muted">
                                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-[180px]">
                                                <DropdownMenuLabel>Gerenciar</DropdownMenuLabel>
                                                <DropdownMenuItem className="cursor-pointer gap-2">
                                                    <UserCheck className="w-4 h-4" /> Editar Dados
                                                </DropdownMenuItem>
                                                {isAdmin && (
                                                    <DropdownMenuItem className="cursor-pointer gap-2">
                                                        <Mail className="w-4 h-4" /> Reenviar Convite
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className={`cursor-pointer gap-2 ${user.isActive ? "text-red-600 focus:text-red-600 focus:bg-red-50" : "text-green-600 focus:text-green-600 focus:bg-green-50"}`}>
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

// Helper Visual para Status (Estilo Moderno)
function StatusBadge({ isActive }: { isActive: boolean }) {
    if (isActive) {
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium border w-fit bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Ativo
            </div>
        )
    }
    return (
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium border w-fit bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            Inativo
        </div>
    )
}