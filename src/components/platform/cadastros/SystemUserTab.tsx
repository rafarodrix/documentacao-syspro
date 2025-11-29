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
    Search, MoreHorizontal, ShieldAlert, Code2, Headset, UserX, UserCheck
} from "lucide-react"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"

import { CreateUserDialog } from "./CreateUserDialog"

interface SystemUserTabProps {
    data: any[]
    companies: any[]
}

export function SystemUserTab({ data, companies }: SystemUserTabProps) {
    const [searchTerm, setSearchTerm] = useState("")

    const filteredData = data.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-4">

            {/* --- TOPO --- */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
                <div className="relative w-full sm:w-72 group">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Buscar membro..."
                        className="pl-9 bg-background border-border focus-visible:ring-primary/20"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Modal de Criação (Contexto SYSTEM) */}
                <CreateUserDialog companies={companies} isAdmin={true} context="SYSTEM" />
            </div>

            {/* --- TABELA --- */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="w-[350px]">Membro da Equipe</TableHead>
                            <TableHead>Nível de Acesso</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            // EMPTY STATE
                            <TableRow>
                                <TableCell colSpan={4} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                        <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-2">
                                            <ShieldAlert className="h-6 w-6 opacity-50" />
                                        </div>
                                        <p className="text-base font-medium text-foreground">Nenhum administrador encontrado</p>
                                        <p className="text-sm">
                                            {searchTerm ? "Tente buscar por outro termo." : "Adicione membros à equipe interna do sistema."}
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((user) => (
                                <TableRow key={user.id} className="hover:bg-muted/30 transition-colors cursor-default">

                                    {/* Coluna 1: Identificação */}
                                    <TableCell className="py-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border border-purple-200/50">
                                                <AvatarImage src={user.image} />
                                                <AvatarFallback className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-bold text-xs">
                                                    {user.name?.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm text-foreground">{user.name}</span>
                                                <span className="text-xs text-muted-foreground">{user.email}</span>
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Coluna 2: Role Badge */}
                                    <TableCell>
                                        <RoleBadge role={user.role} />
                                    </TableCell>

                                    {/* Coluna 3: Status */}
                                    <TableCell>
                                        <StatusBadge isActive={user.isActive} />
                                    </TableCell>

                                    {/* Coluna 4: Ações */}
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted data-[state=open]:bg-muted">
                                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-[160px]">
                                                <DropdownMenuLabel>Gerenciar</DropdownMenuLabel>
                                                <DropdownMenuItem className="cursor-pointer">Editar Dados</DropdownMenuItem>
                                                <DropdownMenuItem className="cursor-pointer">Resetar Senha</DropdownMenuItem>
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

// Componentes Helper (Estilizados)

function RoleBadge({ role }: { role: string }) {
    if (role === 'DEVELOPER') {
        return (
            <Badge variant="outline" className="border-blue-500/30 text-blue-600 bg-blue-500/10 gap-1.5 px-2 py-0.5 font-normal">
                <Code2 className="w-3 h-3" /> Developer
            </Badge>
        )
    }
    if (role === 'SUPORTE') {
        return (
            <Badge variant="outline" className="border-orange-500/30 text-orange-600 bg-orange-500/10 gap-1.5 px-2 py-0.5 font-normal">
                <Headset className="w-3 h-3" /> Suporte
            </Badge>
        )
    }
    return (
        <Badge variant="default" className="bg-purple-600/90 hover:bg-purple-700 border-transparent gap-1.5 px-2 py-0.5 shadow-sm shadow-purple-500/20">
            <ShieldAlert className="w-3 h-3" /> Super Admin
        </Badge>
    )
}

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