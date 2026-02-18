"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import { toggleUserStatusAction } from "@/actions/admin/user-actions"
import { Role } from "@prisma/client"

import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
    Search, MoreHorizontal, Shield, Building, UserX, Mail, UserCheck, Loader2, Briefcase, Fingerprint
} from "lucide-react"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"

// Modais e Utilitários
import { CreateUserDialog } from "./CreateUserDialog"
import { EditUserDialog } from "./EditUserDialog"

// Utilitário simples para máscara de CPF (pode ser movido para @/lib/utils)
const formatCPF = (cpf: string | null) => {
    if (!cpf) return "---"
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

interface UserWithRelations {
    id: string
    name: string | null
    email: string
    image: string | null
    role: Role
    isActive: boolean
    jobTitle: string | null
    cpf: string | null
    memberships: any[]
    [key: string]: any
}

interface UserTabProps {
    data: UserWithRelations[]
    companies: any[]
    isAdmin: boolean
}

export function UserTab({ data, companies, isAdmin }: UserTabProps) {
    const [searchTerm, setSearchTerm] = useState("")

    // --- ESTADOS ---
    const [userToEdit, setUserToEdit] = useState<UserWithRelations | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [loadingId, setLoadingId] = useState<string | null>(null)

    // Filtro Otimizado (Memoizado)
    const filteredData = useMemo(() => {
        const lowerTerm = searchTerm.toLowerCase()
        const cleanTerm = searchTerm.replace(/\D/g, "")

        return data.filter(user =>
            user.name?.toLowerCase().includes(lowerTerm) ||
            user.email?.toLowerCase().includes(lowerTerm) ||
            (user.cpf && user.cpf.includes(cleanTerm))
        )
    }, [data, searchTerm])

    // --- AÇÕES ---

    function handleEdit(user: UserWithRelations) {
        setUserToEdit(user)
        setIsEditOpen(true)
    }

    async function handleToggleStatus(userId: string, currentStatus: boolean) {
        setLoadingId(userId)
        try {
            const result = await toggleUserStatusAction(userId, currentStatus)
            if (result.success) {
                toast.success(result.message)
            } else {
                toast.error(result.message || "Erro ao alterar status")
            }
        } catch (error) {
            toast.error("Erro na comunicação com o servidor.")
        } finally {
            setLoadingId(null)
        }
    }

    return (
        <div className="space-y-4">
            {/* Modal de Edição */}
            <EditUserDialog
                open={isEditOpen}
                onOpenChange={(open) => {
                    setIsEditOpen(open)
                    if (!open) setUserToEdit(null)
                }}
                user={userToEdit}
                companies={companies}
                isAdmin={isAdmin}
            />

            {/* Barra de Busca e Cadastro */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
                <div className="relative w-full sm:w-80 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Nome, e-mail ou CPF..."
                        className="pl-10 h-10 bg-background border-border/60 focus-visible:ring-primary/20"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <CreateUserDialog companies={companies} isAdmin={isAdmin} context="CLIENT" />
            </div>

            {/* Container da Tabela */}
            <div className="rounded-lg border border-border/50 bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead className="py-4 px-6 font-semibold">Identificação</TableHead>
                            <TableHead className="font-semibold">Cargo / CPF</TableHead>
                            <TableHead className="font-semibold">Acesso / Empresas</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="text-right px-6 font-semibold">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-72 text-center">
                                    <EmptyState isSearching={!!searchTerm} />
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((user) => (
                                <TableRow key={user.id} className="hover:bg-muted/10 transition-colors group">

                                    {/* Identificação: Avatar + Nome + Email */}
                                    <TableCell className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 border border-border/40 shadow-sm">
                                                <AvatarImage src={user.image || undefined} />
                                                <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                                                    {user.name?.substring(0, 2).toUpperCase() || "??"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-foreground text-sm leading-tight">
                                                    {user.name || "Sem Nome"}
                                                </span>
                                                <span className="text-xs text-muted-foreground mt-0.5">
                                                    {user.email}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Cargo e CPF */}
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                                <Briefcase className="w-3 h-3 opacity-60" />
                                                {user.jobTitle || "Não informado"}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 font-mono">
                                                <Fingerprint className="w-3 h-3 opacity-50" />
                                                {formatCPF(user.cpf)}
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Função (Role) e Vínculos */}
                                    <TableCell>
                                        <div className="flex flex-col gap-2">
                                            <RoleBadge role={user.role} />
                                            <div className="flex flex-wrap gap-1">
                                                {user.memberships?.map((m) => (
                                                    <Badge key={m.company.id} variant="outline" className="text-[10px] bg-background font-normal border-border/50 text-muted-foreground px-1.5 h-5 gap-1">
                                                        <Building className="w-2.5 h-2.5 opacity-60" />
                                                        {m.company.nomeFantasia || m.company.razaoSocial}
                                                    </Badge>
                                                )) || <span className="text-[10px] text-muted-foreground italic">Sem vínculos</span>}
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell>
                                        <StatusBadge isActive={user.isActive} />
                                    </TableCell>

                                    {/* Ações */}
                                    <TableCell className="text-right px-6">
                                        <UserActions
                                            user={user}
                                            loadingId={loadingId}
                                            onEdit={() => handleEdit(user)}
                                            onToggleStatus={() => handleToggleStatus(user.id, user.isActive)}
                                            isAdmin={isAdmin}
                                        />
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

/** * Componentes Auxiliares
 */

function RoleBadge({ role }: { role: Role }) {
    const isAdmin = role === 'ADMIN' || role === 'DEVELOPER'
    return (
        <Badge
            variant={isAdmin ? "default" : "secondary"}
            className={`text-[10px] px-2 h-5 font-bold uppercase tracking-wider ${isAdmin ? "bg-purple-500/10 text-purple-700 border-purple-500/20 hover:bg-purple-500/15 dark:text-purple-300" : ""
                }`}
        >
            {isAdmin && <Shield className="w-2.5 h-2.5 mr-1" />}
            {role.replace("CLIENTE_", "")}
        </Badge>
    )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
    return (
        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border w-fit ${isActive
                ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400"
                : "bg-zinc-500/10 text-zinc-600 border-zinc-500/20"
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"}`} />
            {isActive ? "ATIVO" : "INATIVO"}
        </div>
    )
}

function EmptyState({ isSearching }: { isSearching: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center py-10 animate-in fade-in duration-500">
            <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center mb-4 ring-1 ring-border/50">
                <UserX className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <h4 className="text-base font-semibold text-foreground">
                {isSearching ? "Sem correspondências" : "Nenhum membro na equipe"}
            </h4>
            <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
                {isSearching ? "Tente buscar por outro nome ou documento." : "Convide novos membros para colaborar no sistema."}
            </p>
        </div>
    )
}

function UserActions({ user, loadingId, onEdit, onToggleStatus, isAdmin }: any) {
    if (loadingId === user.id) {
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto mr-2" />
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/80 rounded-md transition-all">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1.5">
                <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-1.5">
                    Gerenciamento
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 focus:bg-primary/5 cursor-pointer" onClick={onEdit}>
                    <UserCheck className="w-4 h-4 text-muted-foreground" />
                    <span>Editar Perfil</span>
                </DropdownMenuItem>
                {isAdmin && (
                    <DropdownMenuItem className="gap-2 focus:bg-primary/5 cursor-pointer">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>Reenviar Convite</span>
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className={`gap-2 cursor-pointer focus:bg-red-500/5 ${user.isActive ? "text-red-600 focus:text-red-600" : "text-emerald-600 focus:text-emerald-600"}`}
                    onClick={onToggleStatus}
                >
                    {user.isActive ? (
                        <><UserX className="w-4 h-4" /> <span>Suspender Acesso</span></>
                    ) : (
                        <><UserCheck className="w-4 h-4" /> <span>Ativar Acesso</span></>
                    )}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}