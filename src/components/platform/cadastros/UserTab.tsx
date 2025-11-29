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
    UserPlus, Search, MoreHorizontal, Shield, Mail, Building
} from "lucide-react"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"

interface UserTabProps {
    data: any[]
    companies: any[]
    isAdmin: boolean
}

export function UserTab({ data, companies, isAdmin }: UserTabProps) {
    const [searchTerm, setSearchTerm] = useState("")

    const filteredData = data.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-4">
            {/* --- TOPO --- */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar usuário..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Button className="w-full sm:w-auto gap-2">
                    <UserPlus className="h-4 w-4" />
                    {isAdmin ? "Criar Usuário" : "Convidar Membro"}
                </Button>
            </div>

            {/* --- TABELA --- */}
            <div className="rounded-md border bg-white shadow-sm">
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
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    Nenhum usuário encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((user) => (
                                <TableRow key={user.id} className="hover:bg-muted/50">

                                    {/* Avatar + Nome */}
                                    <TableCell className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9 border">
                                            <AvatarImage src={user.image} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                {user.name?.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm text-gray-900">{user.name}</span>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                {user.email}
                                            </span>
                                        </div>
                                    </TableCell>

                                    {/* Role Global */}
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            {user.role === 'ADMIN' || user.role === 'DEVELOPER' ? (
                                                <Badge variant="default" className="text-[10px] bg-purple-600 hover:bg-purple-700">
                                                    <Shield className="w-3 h-3 mr-1" /> Global Admin
                                                </Badge>
                                            ) : (
                                                <span className="text-sm text-gray-600">Usuário</span>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Vínculos (Multi-tenant) */}
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                                            {user.memberships.map((m: any) => (
                                                <Badge
                                                    key={m.company.id}
                                                    variant="outline"
                                                    className="text-[10px] gap-1 font-normal bg-gray-50/50"
                                                >
                                                    <Building className="w-3 h-3 text-gray-400" />
                                                    {m.company.nomeFantasia || m.company.razaoSocial}
                                                    {m.role === 'ADMIN' && <span className="text-amber-600 font-bold ml-0.5" title="Admin da Empresa">*</span>}
                                                </Badge>
                                            ))}
                                            {user.memberships.length === 0 && (
                                                <span className="text-xs text-red-400 italic">Sem vínculo</span>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell>
                                        <div className={`flex items-center gap-1.5 text-xs font-medium ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                            <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                                            {user.isActive ? "Ativo" : "Inativo"}
                                        </div>
                                    </TableCell>

                                    {/* Menu */}
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                <DropdownMenuItem>Editar Perfil</DropdownMenuItem>
                                                {isAdmin && <DropdownMenuItem>Alterar Senha</DropdownMenuItem>}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className={user.isActive ? "text-red-600" : "text-green-600"}>
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