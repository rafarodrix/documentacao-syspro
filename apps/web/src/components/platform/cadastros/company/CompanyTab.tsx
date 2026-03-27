"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CompanySegment, CompanyStatus } from "@prisma/client"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, MoreHorizontal, Building2, Users, X, CircleAlert, Plus, Pencil } from "lucide-react"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { ConfirmActionDialog } from "../shared/ConfirmActionDialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getCompanySegmentLabel } from "@/features/company/domain/company-segments"
import type { CompanyListItem } from "@/features/company/domain/model"

import { deleteCompanyAction, updateCompanyStatusAction } from "@/features/company/application/actions"

interface CompanyTabProps {
  data: CompanyListItem[]
  canCreate: boolean
  canEdit: boolean
  canToggleStatus: boolean
  canDelete: boolean
}

const formatCNPJ = (cnpj: string) => cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")

const STATUS_CONFIG: Record<CompanyStatus, { label: string; dot: string; badge: string }> = {
  ACTIVE: {
    label: "Ativo",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  INACTIVE: {
    label: "Inativo",
    dot: "bg-zinc-400",
    badge: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
  },
  SUSPENDED: {
    label: "Suspenso",
    dot: "bg-red-500",
    badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  PENDING_DOCS: {
    label: "Pendente",
    dot: "bg-amber-400",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
}

function StatusBadge({ status }: { status: CompanyStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.INACTIVE
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border tracking-wide", config.badge)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  )
}

function CompanyActionsMenu({
  company,
  canEdit,
  canToggleStatus,
  canDelete,
  isLoading,
  onToggleStatus,
  onDelete,
}: {
  company: CompanyListItem
  canEdit: boolean
  canToggleStatus: boolean
  canDelete: boolean
  isLoading: boolean
  onToggleStatus: () => void
  onDelete: () => void
}) {
  if (!canEdit && !canToggleStatus && !canDelete) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 rounded-md transition-all",
            "text-muted-foreground hover:text-foreground",
            "border border-transparent hover:border-border/50 hover:bg-muted",
            "opacity-0 group-hover:opacity-100 focus:opacity-100",
          )}
          disabled={isLoading}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Acoes da empresa</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {company.nomeFantasia || company.razaoSocial}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {canEdit && (
          <DropdownMenuItem asChild className="gap-2.5 cursor-pointer focus:bg-primary/5 rounded-md">
            <Link href={`/portal/cadastros/empresa/${company.id}/editar`}>
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">Editar empresa</span>
            </Link>
          </DropdownMenuItem>
        )}

        {canToggleStatus && (
          <DropdownMenuItem className="gap-2.5 cursor-pointer focus:bg-primary/5 rounded-md" onClick={onToggleStatus}>
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{company.status === "INACTIVE" ? "Reativar empresa" : "Inativar empresa"}</span>
          </DropdownMenuItem>
        )}

        {canDelete && (
          <>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="gap-2.5 cursor-pointer rounded-md text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
              onClick={onDelete}
            >
              <X className="h-3.5 w-3.5" />
              <span className="text-sm font-medium">Excluir empresa</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function CompanyTab({ data, canCreate, canEdit, canToggleStatus, canDelete }: CompanyTabProps) {
  const [items, setItems] = useState(data)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<CompanyStatus | "ALL">("ALL")
  const [filterBlocked, setFilterBlocked] = useState<"ALL" | "BLOCKED">("ALL")
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<
    | { type: "delete" | "status"; company: CompanyListItem }
    | null
  >(null)

  useEffect(() => {
    setItems(data)
  }, [data])

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase()
    const cnpjRaw = searchTerm.replace(/\D/g, "")

    return items.filter((company) => {
      const matchesSearch =
        !term ||
        company.razaoSocial.toLowerCase().includes(term) ||
        company.nomeFantasia?.toLowerCase().includes(term) ||
        company.cnpj.includes(cnpjRaw)

      const matchesStatus = filterStatus === "ALL" || company.status === filterStatus
      const matchesBlocked = filterBlocked === "ALL" || company.isBlockedByContract
      return matchesSearch && matchesStatus && matchesBlocked
    })
  }, [items, searchTerm, filterStatus, filterBlocked])

  const blockedCount = useMemo(
    () => items.filter((company) => company.isBlockedByContract).length,
    [items],
  )

  const statusCounts = useMemo(
    () => {
      return items.reduce(
        (acc, c) => {
          acc[c.status] = (acc[c.status] ?? 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )
    },
    [items],
  );

  const handleToggleStatus = async (company: CompanyListItem) => {
    setLoadingId(company.id)
    try {
      const nextStatus = company.status === "INACTIVE" ? CompanyStatus.ACTIVE : CompanyStatus.INACTIVE
      const result = await updateCompanyStatusAction(company.id, nextStatus)
      if (result.success) {
        toast.success(result.message ?? "Status atualizado")
        setFeedback({ type: "success", message: result.message ?? "Status atualizado com sucesso." })
        setItems((prev) =>
          prev.map((c) =>
            c.id === company.id
              ? { ...c, status: nextStatus }
              : c,
          ),
        )
      } else {
        toast.error(result.message ?? "Falha ao atualizar status")
        setFeedback({ type: "error", message: result.message ?? "Falha ao atualizar status." })
      }
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (company: CompanyListItem) => {
    setLoadingId(company.id)
    try {
      const result = await deleteCompanyAction(company.id)
      if (result.success) {
        toast.success(result.message ?? "Empresa excluida")
        setFeedback({ type: "success", message: result.message ?? "Empresa excluida com sucesso." })
        setItems((prev) => prev.filter((c) => c.id !== company.id))
      } else {
        toast.error(result.message ?? "Falha ao excluir")
        setFeedback({ type: "error", message: result.message ?? "Falha ao excluir empresa." })
      }
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <>
      <ConfirmActionDialog
        open={!!confirmDialog}
        onOpenChange={(open) => (!open ? setConfirmDialog(null) : undefined)}
        title={
          confirmDialog?.type === "delete"
            ? "Confirmar exclusao da empresa"
            : "Confirmar alteracao de status"
        }
        description={
          confirmDialog
            ? confirmDialog.type === "delete"
              ? `Deseja excluir a empresa ${confirmDialog.company.nomeFantasia || confirmDialog.company.razaoSocial}? Essa acao e irreversivel.`
              : confirmDialog.company.status === "INACTIVE"
                ? `Deseja reativar a empresa ${confirmDialog.company.nomeFantasia || confirmDialog.company.razaoSocial}?`
                : `Deseja inativar a empresa ${confirmDialog.company.nomeFantasia || confirmDialog.company.razaoSocial}? ${confirmDialog.company._count?.memberships ?? confirmDialog.company.usersCount ?? 0} usuarios poderao perder acesso.`
            : ""
        }
        confirmLabel={confirmDialog?.type === "delete" ? "Excluir empresa" : "Confirmar"}
        isLoading={!!confirmDialog?.company && loadingId === confirmDialog.company.id}
        variant={confirmDialog?.type === "delete" ? "danger" : "default"}
        onConfirm={async () => {
          if (!confirmDialog) return
          if (confirmDialog.type === "delete") {
            await handleDelete(confirmDialog.company)
          } else {
            await handleToggleStatus(confirmDialog.company)
          }
          setConfirmDialog(null)
        }}
      />

      <div className="space-y-4">
        {feedback && (
          <div
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              feedback.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
            )}
          >
            {feedback.message}
          </div>
        )}
        <div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Razao social, fantasia ou CNPJ..."
              className="pl-9 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 p-1 rounded-lg border border-border/50 bg-muted/20">
              <button
                onClick={() => setFilterStatus("ALL")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                  filterStatus === "ALL" ? "bg-background shadow-sm text-foreground border border-border/50" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Todas <span className="ml-1.5 text-[10px] text-muted-foreground">{items.length}</span>
              </button>
              {(Object.keys(STATUS_CONFIG) as CompanyStatus[]).map((status) => {
                const cfg = STATUS_CONFIG[status]
                const count = statusCounts[status] ?? 0
                if (count === 0) return null
                return (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                      filterStatus === status ? "bg-background shadow-sm text-foreground border border-border/50" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {cfg.label} <span className="ml-1.5 text-[10px] text-muted-foreground">{count}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded-lg border border-border/50 bg-muted/20">
              <button
                onClick={() => setFilterBlocked("ALL")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                  filterBlocked === "ALL" ? "bg-background shadow-sm text-foreground border border-border/50" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterBlocked("BLOCKED")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                  filterBlocked === "BLOCKED" ? "bg-background shadow-sm text-foreground border border-border/50" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Bloqueadas <span className="ml-1.5 text-[10px] text-muted-foreground">{blockedCount}</span>
              </button>
            </div>

            {canCreate && (
              <Link href="/portal/cadastros/empresa/novo">
                <Button
                  type="button"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md py-2 text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground px-4 shadow-sm hover:bg-primary/90 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Nova Empresa
                </Button>
              </Link>
            )}
          </div>
        </div>

        <Card className="group relative overflow-hidden border-border/60 shadow-lg bg-background/50 backdrop-blur-xl">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-linear-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow className="hover:bg-transparent border-b border-border/60">
                <TableHead className="py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Organizacao</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CNPJ</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Segmento</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Membros</TableHead>
                <TableHead className="text-right px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acoes</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground animate-in fade-in zoom-in-95 duration-500">
                      <div className="rounded-full bg-muted/30 p-4">
                        <Building2 className="h-8 w-8 opacity-40" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">Nenhuma empresa encontrada</p>
                        <p className="text-xs">Ajuste os filtros ou cadastre uma nova empresa.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((company, index) => {
                  const memberCount = company._count?.memberships ?? company.usersCount ?? 0

                  return (
                    <TableRow
                      key={company.id}
                      className="group/row hover:bg-muted/40 transition-all duration-300 border-border/40"
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/8 dark:bg-primary/10 flex items-center justify-center shrink-0 transition-all group-hover/row:scale-105">
                            <Building2 className="h-4 w-4 text-primary/70" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground leading-tight truncate max-w-55">{company.razaoSocial}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-55">
                              {company.nomeFantasia || <span className="italic opacity-50">Nome fantasia nao informado</span>}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <code className="text-[11px] font-mono bg-muted/50 px-2 py-1 rounded-md text-muted-foreground border border-border/30 whitespace-nowrap">
                          {formatCNPJ(company.cnpj)}
                        </code>
                      </TableCell>

                      <TableCell>
                        <span className="inline-flex items-center rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {getCompanySegmentLabel(company.segment)}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <StatusBadge status={company.status} />
                          {company.isBlockedByContract && (
                            <span className="inline-flex items-center rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                              Bloqueada por contrato
                            </span>
                          )}
                          {company.contractBlockReasonLabel && (
                            <div className="space-y-1">
                              <div className="hidden md:flex items-center gap-1 text-[10px] text-muted-foreground">
                                <span className="max-w-47.5 truncate">{company.contractBlockReasonLabel}</span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        className="inline-flex items-center justify-center rounded text-muted-foreground/80 hover:text-foreground"
                                        aria-label="Ver motivo completo do bloqueio"
                                      >
                                        <CircleAlert className="h-3.5 w-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-70 whitespace-normal text-left">
                                      {company.contractBlockReasonLabel}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <p className="md:hidden text-[10px] text-muted-foreground leading-4">
                                {company.contractBlockReasonLabel}
                              </p>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Users className="w-3.5 h-3.5" />
                          <span className="font-medium tabular-nums">{memberCount}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right px-6">
                        <CompanyActionsMenu
                          company={company}
                          canEdit={canEdit}
                          canToggleStatus={canToggleStatus}
                          canDelete={canDelete}
                          isLoading={loadingId === company.id}
                          onToggleStatus={() => setConfirmDialog({ type: "status", company })}
                          onDelete={() => setConfirmDialog({ type: "delete", company })}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </>
  )
}



