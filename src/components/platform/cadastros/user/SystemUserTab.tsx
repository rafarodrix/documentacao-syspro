"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import { toggleUserStatusAction } from "@/actions/admin/user-actions"
import { Role } from "@prisma/client"

import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Search, MoreHorizontal, ShieldAlert, Code2, Headset, UserX, UserCheck, Loader2, Mail, Briefcase, Fingerprint
} from "lucide-react"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"

// Modais
import { CreateUserDialog } from "./CreateUserDialog"
import { EditUserDialog } from "./EditUserDialog"

// Utilitário para CPF
const formatCPF = (cpf: string | null) => {
    if (!cpf) return "---"
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

interface SystemUserWithRelations {
    id: string
    name: string | null
    email: string
    image: string | null
    role: Role
    isActive: boolean
    jobTitle: string | null
    cpf: string | null
    [key: string]: any
}

interface SystemUserTabProps {
    data: SystemUserWithRelations[]
    companies: any[]
}

export function SystemUserTab({ data, companies }: SystemUserTabProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [userToEdit, setUserToEdit] = useState<SystemUserWithRelations | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [loadingId, setLoadingId] = useState<string | null>(null)

    // Filtro Memoizado (Nome, Email, CPF ou Cargo)
    const filteredData = useMemo(() => {
        const lowerTerm = searchTerm.toLowerCase()
        const cleanTerm = searchTerm.replace(/\D/g, "")

        return data.filter(user =>
            user.name?.toLowerCase().includes(lowerTerm) ||
            user.email?.toLowerCase().includes(lowerTerm) ||
            user.jobTitle?.toLowerCase().includes(lowerTerm) ||
            (user.cpf && user.cpf.includes(cleanTerm))
        )
    }, [data, searchTerm])

    async function handleToggleStatus(userId: string, currentStatus: boolean) {
        setLoadingId(userId)
        try {
            const result = await toggleUserStatusAction(userId, currentStatus)
            if (result.success) toast.success(result.message)
            else toast.error(result.message || "Erro ao alterar status")
        } catch (error) {
            toast.error("Erro de conexão com o servidor.")
        } finally {
            setLoadingId(null)
        }
    }

    return (
        <div className="space-y-4">
            <EditUserDialog
                open={isEditOpen}
                onOpenChange={(open) => {
                    setIsEditOpen(open)
                    if (!open) setUserToEdit(null)
                }}
                user={userToEdit}
                companies={companies}
                isAdmin={true}
            />

            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
                <div className="relative w-full sm:w-80 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Buscar na equipe interna..."
                        className="pl-10 h-10 bg-background border-border/60 focus-visible:ring-primary/20"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <CreateUserDialog companies={companies} isAdmin={true} context="SYSTEM" />
            </div>

            <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead className="py-4 px-6 font-semibold">Membro da Equipe</TableHead>
                            <TableHead className="font-semibold">Cargo / Identificação</TableHead>
                            <TableHead className="font-semibold">Nível de Acesso</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="text-right px-6 font-semibold">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center">
                                    <EmptyState isSearching={!!searchTerm} />
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((user) => (
                                <TableRow key={user.id} className="hover:bg-muted/10 transition-colors group">
                                    <TableCell className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 border-2 border-purple-100 dark:border-purple-900/30">
                                                <AvatarImage src={user.image || undefined} />
                                                <AvatarFallback className="bg-purple-50 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 font-bold text-xs">
                                                    {user.name?.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-sm text-foreground">{user.name}</span>
                                                <span className="text-xs text-muted-foreground">{user.email}</span>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Briefcase className="w-3 h-3 opacity-60" />
                                                {user.jobTitle || "Especialista"}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 font-mono">
                                                <Fingerprint className="w-3 h-3 opacity-50" />
                                                {formatCPF(user.cpf)}
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <RoleBadge role={user.role} />
                                    </TableCell>

                                    <TableCell>
                                        <StatusBadge isActive={user.isActive} />
                                    </TableCell>

                                    <TableCell className="text-right px-6">
                                        <SystemActions
                                            user={user}
                                            loadingId={loadingId}
                                            onEdit={() => { setUserToEdit(user); setIsEditOpen(true); }}
                                            onToggleStatus={() => handleToggleStatus(user.id, user.isActive)}
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

/** * Auxiliares Visuais
 */

function RoleBadge({ role }: { role: Role }) {
    const config = {
        DEVELOPER: { label: "Developer", icon: Code2, class: "border-blue-500/30 text-blue-600 bg-blue-500/10" },
        SUPORTE: { label: "Suporte", icon: Headset, class: "border-orange-500/30 text-orange-600 bg-orange-500/10" },
        ADMIN: { label: "Super Admin", icon: ShieldAlert, class: "bg-purple-600 text-white border-transparent shadow-sm shadow-purple-500/20" }
    }

    const item = config[role as keyof typeof config] || config.SUPORTE
    const Icon = item.icon

    return (
        <Badge variant={role === 'ADMIN' ? 'default' : 'outline'} className={`gap-1.5 px-2 py-0.5 font-medium uppercase text-[10px] tracking-wider ${item.class}`}>
            <Icon className="w-3 h-3" /> {item.label}
        </Badge>
    )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
    return (
        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border w-fit ${isActive ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : "bg-zinc-500/10 text-zinc-600 border-zinc-500/20"
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
                <ShieldAlert className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <h4 className="text-base font-semibold text-foreground">Equipe Interna</h4>
            <p className="text-sm text-muted-foreground mt-1">
                {isSearching ? "Nenhum membro corresponde à busca." : "Nenhum membro administrativo cadastrado."}
            </p>
        </div>
    )
}

function SystemActions({ user, loadingId, onEdit, onToggleStatus }: any) {
    if (loadingId === user.id) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/80 rounded-md">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1.5">
                <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-1.5">Ações Internas</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={onEdit}>
                    <UserCheck className="w-4 h-4 text-muted-foreground" /> <span>Editar Acesso</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer">
                    <Mail className="w-4 h-4 text-muted-foreground" /> <span>Enviar Mensagem</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className={`gap-2 cursor-pointer ${user.isActive ? "text-red-600 focus:text-red-600" : "text-emerald-600"}`}
                    onClick={onToggleStatus}
                >
                    {user.isActive ? <><UserX className="w-4 h-4" /> Suspender</> : <><UserCheck className="w-4 h-4" /> Reativar</>}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}