"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, Building2, Plus, Save, Loader2 } from "lucide-react"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Role } from "@prisma/client"
import { toast } from "sonner"
import {
    removeUserFromCompanyAction,
    linkUserToCompanyAction,
    updateMembershipRoleAction
} from "@/actions/admin/user-actions"

interface UserMembershipsListProps {
    userId: string
    userEmail: string
    memberships: any[] // Lista atual de vínculos vinda do banco
    companies: any[]   // Todas as empresas disponíveis para adicionar
}

export function UserMembershipsList({ userId, userEmail, memberships, companies }: UserMembershipsListProps) {
    const [isAdding, setIsAdding] = useState(false)
    const [loadingId, setLoadingId] = useState<string | null>(null)

    // Estados para o formulário de adicionar
    const [newCompanyId, setNewCompanyId] = useState("")
    const [newRole, setNewRole] = useState<Role>(Role.CLIENTE_USER)

    // Filtra empresas que o usuário AINDA NÃO TEM para o dropdown
    const availableCompanies = companies.filter(c => !memberships.some(m => m.companyId === c.id))

    // --- AÇÃO: ADICIONAR VÍNCULO ---
    async function handleAdd() {
        if (!newCompanyId) return
        setLoadingId("add")

        const result = await linkUserToCompanyAction({
            email: userEmail,
            companyId: newCompanyId,
            role: newRole
        })

        if (result.success) {
            toast.success("Acesso concedido!")
            setIsAdding(false)
            setNewCompanyId("")
        } else {
            toast.error(result.error || "Erro ao vincular")
        }
        setLoadingId(null)
    }

    // --- AÇÃO: REMOVER VÍNCULO ---
    async function handleRemove(companyId: string) {
        if (!confirm("Tem certeza que deseja remover o acesso a esta empresa?")) return;

        setLoadingId(companyId)
        const result = await removeUserFromCompanyAction(userId, companyId)

        if (result.success) {
            toast.success("Acesso removido.")
        } else {
            toast.error(result.error)
        }
        setLoadingId(null)
    }

    // --- AÇÃO: ATUALIZAR CARGO ---
    async function handleRoleChange(companyId: string, newRole: Role) {
        const result = await updateMembershipRoleAction(userId, companyId, newRole)
        if (result.success) toast.success("Permissão atualizada.")
        else toast.error(result.error)
    }

    return (
        <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2 text-foreground">
                    <Building2 className="w-4 h-4 text-muted-foreground" /> Empresas Vinculadas
                </h4>
                {!isAdding && (
                    <Button size="sm" variant="outline" onClick={() => setIsAdding(true)} className="h-7 text-xs gap-1">
                        <Plus className="w-3 h-3" /> Adicionar Acesso
                    </Button>
                )}
            </div>

            {/* LISTA DE VÍNCULOS EXISTENTES */}
            <div className="space-y-2">
                {memberships.length === 0 && !isAdding && (
                    <p className="text-xs text-muted-foreground italic py-2">Nenhuma empresa vinculada.</p>
                )}

                {memberships.map((m) => (
                    <div key={m.companyId} className="flex items-center justify-between bg-background p-3 rounded-md border shadow-sm">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">{m.company.nomeFantasia || m.company.razaoSocial}</span>
                            <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">CNPJ: {m.company.cnpj}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Seletor de Role Inline */}
                            <Select
                                defaultValue={m.role}
                                onValueChange={(val) => handleRoleChange(m.companyId, val as Role)}
                            >
                                <SelectTrigger className="h-7 w-[130px] text-xs border-dashed hover:border-solid">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={Role.CLIENTE_USER}>Usuário</SelectItem>
                                    <SelectItem value={Role.CLIENTE_ADMIN}>Gestor</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleRemove(m.companyId)}
                                disabled={loadingId === m.companyId}
                            >
                                {loadingId === m.companyId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* FORMULÁRIO DE ADICIONAR NOVA EMPRESA (Inline) */}
            {isAdding && (
                <div className="flex flex-col gap-3 pt-3 border-t border-dashed mt-2 animate-in slide-in-from-top-2">
                    <span className="text-xs font-semibold text-primary">Novo Vínculo:</span>

                    <div className="flex gap-2">
                        <Select onValueChange={setNewCompanyId}>
                            <SelectTrigger className="flex-1 h-9 text-xs">
                                <SelectValue placeholder="Selecione a empresa..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableCompanies.length === 0 ? (
                                    <div className="p-2 text-xs text-muted-foreground text-center">Sem empresas disponíveis</div>
                                ) : (
                                    availableCompanies.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>

                        <Select onValueChange={(val) => setNewRole(val as Role)} defaultValue={Role.CLIENTE_USER}>
                            <SelectTrigger className="w-[110px] h-9 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={Role.CLIENTE_USER}>Usuário</SelectItem>
                                <SelectItem value={Role.CLIENTE_ADMIN}>Gestor</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)} className="h-7 text-xs">Cancelar</Button>
                        <Button size="sm" onClick={handleAdd} disabled={!newCompanyId || loadingId === 'add'} className="h-7 text-xs gap-1">
                            {loadingId === 'add' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            Vincular
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}