"use client"

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Role } from "@prisma/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  removeUserFromCompanyAction,
  linkUserToCompanyAction,
  updateMembershipRoleAction,
} from "@/actions/admin/user-actions"
import {
  Trash2,
  Building2,
  Plus,
  Save,
  Loader2,
  User,
  X,
  AlertCircle,
} from "lucide-react"

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Company {
  id: string
  nomeFantasia: string | null
  razaoSocial: string
  cnpj: string
}

export interface Membership {
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

// ─── Constantes ───────────────────────────────────────────────────────────────

const CLIENT_ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: Role.CLIENTE_USER, label: "Colaborador" },
  { value: Role.CLIENTE_ADMIN, label: "Gestor da Unidade" },
]

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function EmptyMemberships() {
  return (
    <div className="flex flex-col items-center justify-center py-8 rounded-lg border border-dashed bg-background/50">
      <User className="w-7 h-7 text-muted-foreground/30 mb-2" />
      <p className="text-xs text-muted-foreground italic">
        Nenhuma empresa vinculada a este usuário.
      </p>
    </div>
  )
}

interface MembershipRowProps {
  membership: Membership
  isRoleLoading: boolean
  isRemoveLoading: boolean
  onRoleChange: (companyId: string, role: Role) => void
  onRemove: (companyId: string) => void
}

function MembershipRow({
  membership: m,
  isRoleLoading,
  isRemoveLoading,
  onRoleChange,
  onRemove,
}: MembershipRowProps) {
  return (
    <div className="flex items-center justify-between bg-background px-3 py-2.5 rounded-lg border border-border/50 shadow-sm hover:border-primary/20 transition-all group">
      {/* Info da empresa */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="p-1.5 rounded-md bg-primary/8 dark:bg-primary/10 flex-shrink-0">
          <Building2 className="w-3.5 h-3.5 text-primary/70" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate leading-tight">
            {m.company.nomeFantasia || m.company.razaoSocial}
          </p>
          <code className="text-[10px] text-muted-foreground/70 font-mono">
            {m.company.cnpj}
          </code>
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Select
          defaultValue={m.role}
          disabled={isRoleLoading}
          onValueChange={(val) => onRoleChange(m.companyId, val as Role)}
        >
          <SelectTrigger
            className={cn(
              "h-8 w-[140px] text-[11px] font-medium border-border/40",
              "bg-muted/30 group-hover:bg-muted transition-colors",
            )}
          >
            {isRoleLoading ? (
              <Loader2 className="w-3 h-3 animate-spin mx-auto" />
            ) : (
              <SelectValue />
            )}
          </SelectTrigger>
          <SelectContent>
            {CLIENT_ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 flex-shrink-0 transition-colors",
            "text-muted-foreground hover:text-red-600",
            "hover:bg-red-50 dark:hover:bg-red-950/20",
            "opacity-0 group-hover:opacity-100 focus:opacity-100",
          )}
          onClick={() => onRemove(m.companyId)}
          disabled={isRemoveLoading}
          title="Remover acesso"
        >
          {isRemoveLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>
    </div>
  )
}

interface AddMembershipFormProps {
  availableCompanies: Company[]
  isLoading: boolean
  onConfirm: (companyId: string, role: Role) => void
  onCancel: () => void
}

function AddMembershipForm({
  availableCompanies,
  isLoading,
  onConfirm,
  onCancel,
}: AddMembershipFormProps) {
  const [companyId, setCompanyId] = useState("")
  const [role, setRole] = useState<Role>(Role.CLIENTE_USER)

  return (
    <div className="flex flex-col gap-4 p-4 rounded-lg border border-primary/20 border-dashed bg-primary/5 animate-in slide-in-from-top-2 duration-200">
      <p className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
        <Plus className="w-3 h-3" /> Configurar Novo Acesso
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Empresa */}
        <div className="sm:col-span-2">
          <Select onValueChange={setCompanyId} value={companyId}>
            <SelectTrigger className="h-9 text-xs bg-background">
              <SelectValue placeholder="Selecionar empresa..." />
            </SelectTrigger>
            <SelectContent>
              {availableCompanies.length === 0 ? (
                <div className="px-4 py-3 text-xs text-muted-foreground text-center italic">
                  Todas as empresas já estão vinculadas
                </div>
              ) : (
                availableCompanies.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.nomeFantasia || c.razaoSocial}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Role */}
        <Select
          value={role}
          onValueChange={(val) => setRole(val as Role)}
        >
          <SelectTrigger className="h-9 text-xs bg-background font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CLIENT_ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Aviso se não há empresa selecionada */}
      {!companyId && availableCompanies.length > 0 && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3" />
          Selecione uma empresa para habilitar o vínculo
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="w-3.5 h-3.5" /> Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs gap-1.5 font-semibold px-4"
          onClick={() => onConfirm(companyId, role)}
          disabled={!companyId || isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <><Save className="w-3.5 h-3.5" /> Confirmar Vínculo</>
          )}
        </Button>
      </div>
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function UserMembershipsList({
  userId,
  userEmail,
  memberships,
  companies,
}: UserMembershipsListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const availableCompanies = useMemo(
    () => companies.filter((c) => !memberships.some((m) => m.companyId === c.id)),
    [companies, memberships],
  )

  const handleAdd = useCallback(
    async (companyId: string, role: Role) => {
      setLoadingId("add")
      try {
        const result = await linkUserToCompanyAction({
          email: userEmail,
          companyId,
          role,
        })
        if (result.success) {
          toast.success(result.message ?? "Acesso concedido com sucesso!")
          setIsAdding(false)
        } else {
          toast.error(result.message ?? "Erro ao vincular empresa.")
        }
      } catch {
        toast.error("Erro interno ao processar vínculo.")
      } finally {
        setLoadingId(null)
      }
    },
    [userEmail],
  )

  const handleRemove = useCallback(
    async (companyId: string) => {
      const confirmed = window.confirm(
        "Remover o acesso deste usuário a esta empresa?",
      )
      if (!confirmed) return

      setLoadingId(companyId)
      try {
        const result = await removeUserFromCompanyAction(userId, companyId)
        if (result.success) {
          toast.success(result.message ?? "Acesso removido.")
        } else {
          toast.error(result.message ?? "Erro ao remover vínculo.")
        }
      } catch {
        toast.error("Erro ao remover vínculo.")
      } finally {
        setLoadingId(null)
      }
    },
    [userId],
  )

  const handleRoleChange = useCallback(
    async (companyId: string, role: Role) => {
      setLoadingId(`${companyId}-role`)
      try {
        const result = await updateMembershipRoleAction(userId, companyId, role)
        if (result.success) {
          toast.success("Permissão atualizada!")
        } else {
          toast.error(result.message ?? "Erro ao atualizar permissão.")
        }
      } catch {
        toast.error("Erro ao atualizar cargo.")
      } finally {
        setLoadingId(null)
      }
    },
    [userId],
  )

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Empresas Vinculadas
          </h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Gerencie quais empresas este usuário pode acessar e com qual nível.
          </p>
        </div>

        {!isAdding && availableCompanies.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setIsAdding(true)}
            className="h-8 text-xs gap-1.5 font-semibold flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar
          </Button>
        )}
      </div>

      {/* ── Lista de vínculos ───────────────────────────────────────── */}
      <div className="space-y-2">
        {memberships.length === 0 && !isAdding && <EmptyMemberships />}

        {memberships.map((m) => (
          <MembershipRow
            key={m.companyId}
            membership={m}
            isRoleLoading={loadingId === `${m.companyId}-role`}
            isRemoveLoading={loadingId === m.companyId}
            onRoleChange={handleRoleChange}
            onRemove={handleRemove}
          />
        ))}
      </div>

      {/* ── Formulário inline de adição ─────────────────────────────── */}
      {isAdding && (
        <AddMembershipForm
          availableCompanies={availableCompanies}
          isLoading={loadingId === "add"}
          onConfirm={handleAdd}
          onCancel={() => setIsAdding(false)}
        />
      )}
    </div>
  )
}