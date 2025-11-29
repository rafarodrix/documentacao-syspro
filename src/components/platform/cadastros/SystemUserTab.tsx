"use client"

import { useState } from "react"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button" // <--- Import Adicionado
import {
    Search, MoreHorizontal, ShieldAlert, Code2, Headset
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
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar membro da equipe..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Modal de Criação com Contexto de SISTEMA */}
                <CreateUserDialog companies={companies} isAdmin={true} context="SYSTEM" />
            </div>

            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead>Membro da Equipe</TableHead>
                            <TableHead>Nível de Acesso</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                    Nenhum administrador encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((user) => (
                                <TableRow key={user.id} className="hover:bg-muted/30">
                                    <TableCell className="flex items-center gap-3 py-3">
                                        <Avatar className="h-9 w-9 border border-purple-200">
                                            <AvatarImage src={user.image} />
                                            <AvatarFallback className="bg-purple-100 text-purple-700 font-bold text-xs">
                                                {user.name?.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm text-foreground">{user.name}</span>
                                            <span className="text-xs text-muted-foreground">{user.email}</span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <RoleBadge role={user.role} />
                                    </TableCell>

                                    <TableCell>
                                        <div className={`flex items-center gap-1.5 text-xs font-medium ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                            <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                                            {user.isActive ? "Ativo" : "Inativo"}
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Gerenciar</DropdownMenuLabel>
                                                <DropdownMenuItem className="cursor-pointer">Editar Dados</DropdownMenuItem>
                                                <DropdownMenuItem className="cursor-pointer">Resetar Senha</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-red-600 cursor-pointer">Desativar Acesso</DropdownMenuItem>
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

function RoleBadge({ role }: { role: string }) {
    if (role === 'DEVELOPER') {
        return <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50 gap-1"><Code2 className="w-3 h-3" /> Developer</Badge>
    }
    if (role === 'SUPORTE') {
        return <Badge variant="outline" className="border-orange-500 text-orange-600 bg-orange-50 gap-1"><Headset className="w-3 h-3" /> Suporte</Badge>
    }
    return <Badge variant="default" className="bg-purple-600 gap-1 hover:bg-purple-700"><ShieldAlert className="w-3 h-3" /> Super Admin</Badge>
}