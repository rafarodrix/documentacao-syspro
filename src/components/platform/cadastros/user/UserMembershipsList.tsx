"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, Building2, Plus, Save, Loader2, ShieldCheck, User } from "lucide-react"
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

// Interfaces para melhor tipagem
interface Company {
    id: string
    nomeFantasia: string | null
    razaoSocial: string
    cnpj: string
}

interface Membership {
    companyId: string
    role: Role
    company: Company
}

interface UserMembershipsListProps {
    userId: string
    userEmail: string
    memberships: Membership[]
    companies: Company[]
}

export function UserMembershipsList({ userId, userEmail, memberships, companies }: UserMembershipsListProps) {
    const [isAdding, setIsAdding] = useState(false)
    const [loadingId, setLoadingId] = useState<string | null>(null)

    // Estados para o formulário de novo vínculo
    const [newCompanyId, setNewCompanyId] = useState<string>("")
    const [newRole, setNewRole] = useState<Role>(Role.CLIENTE_USER)

    // Filtra empresas disponíveis usando useMemo para evitar cálculos desnecessários
    const availableCompanies = useMemo(() => {
        return companies.filter(c => !memberships.some(m => m.companyId === c.id))
    }, [companies, memberships])

    // --- AÇÃO: ADICIONAR VÍNCULO ---
    async function handleAdd() {
        if (!newCompanyId) return
        setLoadingId("add")

        try {
            const result = await linkUserToCompanyAction({
                email: userEmail,
                companyId: newCompanyId,
                role: newRole
            })

            if (result.success) {
                toast.success(result.message || "Acesso concedido com sucesso!")
                setIsAdding(false)
                setNewCompanyId("")
            } else {
                toast.error(result.message || "Erro ao vincular empresa.")
            }
        } catch (error) {
            toast.error("Erro interno ao processar vínculo.")
        } finally {
            setLoadingId(null)
        }
    }

    async function handleRemove(companyId: string) {
        if (!confirm("Tem certeza que deseja remover o acesso deste usuário a esta empresa?")) return

        setLoadingId(companyId)
        try {
            const result = await removeUserFromCompanyAction(userId, companyId)
            if (result.success) {
                toast.success(result.message || "Acesso removido.")
            } else {
                toast.error(result.message)
            }
        } catch (error) {
            toast.error("Erro ao remover vínculo.")
        } finally {
            setLoadingId(null)
        }
    }

    // --- AÇÃO: ATUALIZAR CARGO ---
    async function handleRoleChange(companyId: string, role: Role) {
        setLoadingId(`${companyId}-role`)
        try {
            const result = await updateMembershipRoleAction(userId, companyId, role)
            if (result.success) toast.success("Permissão atualizada!")
            else toast.error(result.message)
        } catch (error) {
            toast.error("Erro ao atualizar cargo.")
        } finally {
            setLoadingId(null)
        }
    }

    return (
        <div className="space-y-4 border rounded-xl p-5 bg-muted/20 shadow-inner">
            <div className="flex items-center justify-between border-b pb-3 border-border/50">
                <div className="flex flex-col gap-0.5">
                    <h4 className="text-sm font-bold flex items-center gap-2 text-foreground">
                        <Building2 className="w-4 h-4 text-primary" /> Empresas e Unidades
                    </h4>
                    <p className="text-[11px] text-muted-foreground">Gerencie quais empresas este usuário pode acessar.</p>
                </div>
                {!isAdding && (
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setIsAdding(true)}
                        className="h-8 text-xs gap-1.5 font-semibold shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" /> Adicionar Unidade
                    </Button>
                )}
            </div>

            {/* LISTA DE VÍNCULOS */}
            <div className="space-y-3">
                {memberships.length === 0 && !isAdding && (
                    <div className="flex flex-col items-center justify-center py-6 text-center bg-background/50 rounded-lg border border-dashed">
                        <User className="w-8 h-8 text-muted-foreground/30 mb-2" />
                        <p className="text-xs text-muted-foreground italic">Este usuário não possui acessos vinculados.</p>
                    </div>
                )}

                {memberships.map((m) => (
                    <div key={m.companyId} className="flex items-center justify-between bg-background p-3 rounded-lg border shadow-sm transition-all hover:border-primary/20 group">
                        <div className="flex flex-col gap-0.5 overflow-hidden">
                            <span className="text-sm font-semibold truncate">
                                {m.company.nomeFantasia || m.company.razaoSocial}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded w-fit">
                                CNPJ: {m.company.cnpj}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Select
                                defaultValue={m.role}
                                disabled={loadingId === `${m.companyId}-role`}
                                onValueChange={(val) => handleRoleChange(m.companyId, val as Role)}
                            >
                                <SelectTrigger className="h-8 w-[120px] text-[11px] font-medium bg-muted/30 border-none group-hover:bg-muted transition-colors">
                                    {loadingId === `${m.companyId}-role` ? (
                                        <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                                    ) : (
                                        <SelectValue />
                                    )}
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={Role.CLIENTE_USER} className="text-xs">Colaborador</SelectItem>
                                    <SelectItem value={Role.CLIENTE_ADMIN} className="text-xs">Gestor Unidade</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                                onClick={() => handleRemove(m.companyId)}
                                disabled={loadingId === m.companyId}
                            >
                                {loadingId === m.companyId ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* FORMULÁRIO INLINE PARA ADICIONAR */}
            {isAdding && (
                <div className="flex flex-col gap-4 p-4 bg-primary/5 rounded-lg border border-primary/10 border-dashed animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-wider">
                        <Plus className="w-3 h-3" /> Configurar Novo Acesso
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                            <Select onValueChange={setNewCompanyId}>
                                <SelectTrigger className="h-9 text-xs bg-background">
                                    <SelectValue placeholder="Selecione a empresa alvo..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableCompanies.length === 0 ? (
                                        <div className="p-4 text-xs text-muted-foreground text-center italic">Todas as empresas já vinculadas</div>
                                    ) : (
                                        availableCompanies.map(c => (
                                            <SelectItem key={c.id} value={c.id} className="text-xs">
                                                {c.nomeFantasia || c.razaoSocial}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <Select onValueChange={(val) => setNewRole(val as Role)} defaultValue={Role.CLIENTE_USER}>
                            <SelectTrigger className="h-9 text-xs bg-background font-medium">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={Role.CLIENTE_USER} className="text-xs">Colaborador</SelectItem>
                                <SelectItem value={Role.CLIENTE_ADMIN} className="text-xs">Gestor Unidade</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)} className="h-8 text-xs">
                            Desistir
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleAdd}
                            disabled={!newCompanyId || loadingId === 'add'}
                            className="h-8 text-xs gap-1.5 font-bold px-4"
                        >
                            {loadingId === 'add' ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <><Save className="w-3.5 h-3.5" /> Confirmar Vínculo</>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}