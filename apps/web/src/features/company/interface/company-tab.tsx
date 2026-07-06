"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  COMPANY_STATUS_VALUES,
  type CompanyInactivationReasonValue,
  type CompanyListResponse,
  type CompanyStatusValue,
} from "@dosc-syspro/contracts/company"
import {
  DEFAULT_COMPANY_INACTIVATION_REASON_OPTIONS,
  type CompanyInactivationReasonOption,
} from "@dosc-syspro/contracts/settings"
import { toast } from "sonner"
import { type ColumnDef } from "@tanstack/react-table"
import { Button, DataTable, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, DropdownMenuCheckboxItem } from "@dosc-syspro/ui";
import { MoreHorizontal, Building2, Users, X, CircleAlert, Plus, Pencil, SlidersHorizontal, PanelsTopLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { ConfirmActionDialog } from "@/components/platform/cadastros/shared/confirm-action-dialog"
import { getCompanySegmentLabel } from "@/features/company/domain/company-segments"
import type { CompanyListItem } from "@/features/company/application/company-view.types"
import { stopRecordClick } from "@/components/platform/shared/clickable-record"
import { PageHeader } from "@/components/patterns"
import {
  RegistryFeedback,
  RegistryFilterGroup,
  RegistryPagination,
  RegistryToolbar,
  type RegistryPaginationState,
} from "@/components/platform/shared/registry-list-scaffold"

import { deleteCompanyAction, updateCompanyStatusAction } from "@/features/company/application/company-write.actions"
import { fetchSettingsPreferences } from "@/features/settings/application/preferences"
import { trpc } from "@/lib/api/trpc-client"
import { formatCNPJ } from "@/lib/formatters"

interface CompanyTabProps {
  data: CompanyListItem[]
  initialPagination?: RegistryPaginationState
  initialSearchTerm?: string
  initialStatusFilter?: CompanyStatusValue | "ALL"
  canCreate: boolean
  canEdit: boolean
  canOpenCockpit: boolean
  canToggleStatus: boolean
  canDelete: boolean
}

const COMPANY_NAME_COLLATOR = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true })
const COMPANIES_PAGE_SIZE = 50
const DEFAULT_INACTIVATION_REASON: CompanyInactivationReasonValue =
  DEFAULT_COMPANY_INACTIVATION_REASON_OPTIONS[0]?.key ?? "SOLICITACAO_CLIENTE"

function companyHasKnownLinks(company: CompanyListItem) {
  return (
    (company._count?.memberships ?? company.usersCount ?? 0) > 0 ||
    (company._count?.contactLinks ?? company.contactsCount ?? 0) > 0 ||
    (company._count?.contracts ?? 0) > 0 ||
    (company._count?.branches ?? 0) > 0 ||
    (company._count?.accountingClients ?? 0) > 0
  )
}

const STATUS_CONFIG: Record<CompanyStatusValue, { label: string; dot: string; badge: string }> = {
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

function StatusBadge({ status }: { status: CompanyStatusValue }) {
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
  canOpenCockpit,
  canToggleStatus,
  canDelete,
  isLoading,
  returnHref,
  onToggleStatus,
  onDelete,
}: {
  company: CompanyListItem
  canEdit: boolean
  canOpenCockpit: boolean
  canToggleStatus: boolean
  canDelete: boolean
  isLoading: boolean
  returnHref: string
  onToggleStatus: () => void
  onDelete: () => void
}) {
  const router = useRouter()
  const [isNavigating, startNavigation] = useTransition()
  const editHref = `/portal/cadastros/empresa/${company.id}/editar?returnTo=${encodeURIComponent(returnHref)}`
  const cockpitHref = `/portal/cadastros/empresa/${company.id}/360?returnTo=${encodeURIComponent(returnHref)}`

  if (!canEdit && !canOpenCockpit && !canToggleStatus && !canDelete) return null

  return (
    <div onClick={stopRecordClick}>
      <DropdownMenu
        onOpenChange={(open) => {
          if (open) {
            if (canEdit) {
              router.prefetch(editHref)
            }
            if (canOpenCockpit) {
              router.prefetch(cockpitHref)
            }
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-md transition-all",
              "text-muted-foreground hover:text-foreground",
              "border border-transparent hover:border-border/50 hover:bg-muted",
              "opacity-100 focus:opacity-100",
            )}
            disabled={isLoading}
            onClick={stopRecordClick}
            onPointerDown={stopRecordClick}
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
            <DropdownMenuItem
              className="gap-2.5 cursor-pointer focus:bg-primary/5 rounded-md"
              onPointerEnter={() => router.prefetch(editHref)}
              onSelect={(event) => {
                event.preventDefault()
                stopRecordClick(event)
                startNavigation(() => {
                  router.push(editHref)
                })
              }}
              disabled={isNavigating}
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">Editar empresa</span>
            </DropdownMenuItem>
          )}

          {canOpenCockpit && (
            <DropdownMenuItem
              className="gap-2.5 cursor-pointer focus:bg-primary/5 rounded-md"
              onPointerEnter={() => router.prefetch(cockpitHref)}
              onSelect={(event) => {
                event.preventDefault()
                stopRecordClick(event)
                startNavigation(() => {
                  router.push(cockpitHref)
                })
              }}
              disabled={isNavigating}
            >
              <PanelsTopLeft className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">Abrir Empresa 360</span>
            </DropdownMenuItem>
          )}

          {canToggleStatus && (
            <DropdownMenuItem
              className="gap-2.5 cursor-pointer focus:bg-primary/5 rounded-md"
              onSelect={(event) => {
                event.preventDefault()
                stopRecordClick(event)
                onToggleStatus()
              }}
            >
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">{company.status === "INACTIVE" ? "Reativar empresa" : "Inativar empresa"}</span>
            </DropdownMenuItem>
          )}

          {canDelete && (
            <>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="gap-2.5 cursor-pointer rounded-md text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                onSelect={(event) => {
                  event.preventDefault()
                  stopRecordClick(event)
                  onDelete()
                }}
              >
                <X className="h-3.5 w-3.5" />
                <span className="text-sm font-medium">Excluir empresa</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function CompanyTab({
  data,
  initialPagination,
  initialSearchTerm = "",
  initialStatusFilter = "ALL",
  canCreate,
  canEdit,
  canOpenCockpit,
  canToggleStatus,
  canDelete,
}: CompanyTabProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [items, setItems] = useState(data)
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm)
  const [filterStatus, setFilterStatus] = useState<CompanyStatusValue | "ALL">(initialStatusFilter)
  const [filterBlocked, setFilterBlocked] = useState<"ALL" | "BLOCKED">("ALL")
  const [page, setPage] = useState(initialPagination?.page ?? 1)
  const [pagination, setPagination] = useState<RegistryPaginationState>(
    initialPagination ?? {
      page: 1,
      pageSize: COMPANIES_PAGE_SIZE,
      total: data.length,
      totalPages: Math.max(1, Math.ceil(data.length / COMPANIES_PAGE_SIZE)),
      hasPreviousPage: false,
      hasNextPage: false,
    },
  )
  const [loadingList, setLoadingList] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<
    | { type: "delete" | "status"; company: CompanyListItem }
    | null
  >(null)
  const [inactivationReason, setInactivationReason] = useState<CompanyInactivationReasonValue>(DEFAULT_INACTIVATION_REASON)
  const [inactivationDetails, setInactivationDetails] = useState("")
  const [companyReasonOptions, setCompanyReasonOptions] = useState<CompanyInactivationReasonOption[]>(
    DEFAULT_COMPANY_INACTIVATION_REASON_OPTIONS,
  )

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    cnpj: true,
    segment: true,
    status: true,
    members: true,
  });

  useEffect(() => {
    setItems(data)
  }, [data])

  useEffect(() => {
    if (initialPagination) {
      setPagination(initialPagination)
    }
  }, [initialPagination])

  useEffect(() => {
    setSearchTerm(initialSearchTerm)
  }, [initialSearchTerm])

  useEffect(() => {
    setFilterStatus(initialStatusFilter)
  }, [initialStatusFilter])

  useEffect(() => {
    let active = true

    async function loadSettingsPreferences() {
      const preferences = await fetchSettingsPreferences()
      if (!active || !preferences) return

      const activeReasons = preferences.companyInactivationReasons.filter((item) => item.isActive)
      if (activeReasons.length) {
        setCompanyReasonOptions(activeReasons)
        setInactivationReason((current) =>
          activeReasons.some((item) => item.key === current) ? current : activeReasons[0].key,
        )
      }
    }

    void loadSettingsPreferences()
    return () => {
      active = false
    }
  }, [])

  const filteredData = useMemo(() => {
    const filtered = items.filter((company) => {
      const matchesBlocked = filterBlocked === "ALL" || company.isBlockedByContract
      return matchesBlocked
    })

    return filtered.sort((a, b) => {
      const aName = a.nomeFantasia?.trim() || a.razaoSocial.trim()
      const bName = b.nomeFantasia?.trim() || b.razaoSocial.trim()
      return COMPANY_NAME_COLLATOR.compare(aName, bName)
    })
  }, [items, filterBlocked])

  const totalPages = Math.max(1, pagination.totalPages ?? Math.ceil(pagination.total / pagination.pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedData = filteredData

  useEffect(() => {
    setPage(1)
  }, [searchTerm, filterStatus, filterBlocked])

  useEffect(() => {
    let active = true

    async function loadCompanies() {
      setLoadingList(true)
      try {
        const response = (await trpc.companies.list.query({
          search: searchTerm.trim() || undefined,
          status: filterStatus !== "ALL" ? filterStatus : undefined,
          page: String(page),
          pageSize: String(COMPANIES_PAGE_SIZE),
        })) as CompanyListResponse;

        if (!active) return

        setItems(response.items)
        setPagination({
          page: response.pagination.page,
          pageSize: response.pagination.pageSize,
          total: response.pagination.total,
          totalPages: Math.max(1, Math.ceil(response.pagination.total / response.pagination.pageSize)),
          hasPreviousPage: response.pagination.hasPreviousPage,
          hasNextPage: response.pagination.hasNextPage,
        })
      } catch (error) {
        if (!active) return
        const message = error instanceof Error ? error.message : "Falha ao carregar empresas."
        toast.error(message)
        setItems([])
      } finally {
        if (active) setLoadingList(false)
      }
    }

    void loadCompanies()

    return () => {
      active = false
    }
  }, [page, searchTerm, filterStatus])

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

  const currentListHref = useMemo(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "")

    if (searchTerm.trim()) {
      params.set("empresa", searchTerm.trim())
    } else {
      params.delete("empresa")
    }

    if (filterStatus !== "ALL") {
      params.set("status", filterStatus)
    } else {
      params.delete("status")
    }

    if (page > 1) {
      params.set("page", String(page))
    } else {
      params.delete("page")
    }

    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }, [filterStatus, page, pathname, searchParams, searchTerm])

  const handleToggleStatus = async (company: CompanyListItem) => {
    setLoadingId(company.id)
    try {
      const nextStatus: CompanyStatusValue =
        company.status === "INACTIVE" ? COMPANY_STATUS_VALUES[0] : COMPANY_STATUS_VALUES[1]
      const result = await updateCompanyStatusAction(
        company.id,
        nextStatus,
        nextStatus === "INACTIVE" ? inactivationReason : null,
        nextStatus === "INACTIVE" ? inactivationDetails : null,
      )
      if (result.success) {
        toast.success(result.message ?? "Status atualizado")
        setFeedback({ type: "success", message: result.message ?? "Status atualizado com sucesso." })
        setItems((prev) => prev.map((c) => (c.id === company.id ? { ...c, status: nextStatus } : c)))
        setInactivationReason(companyReasonOptions[0]?.key ?? DEFAULT_INACTIVATION_REASON)
        setInactivationDetails("")
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
        setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }))
      } else {
        toast.error(result.message ?? "Falha ao excluir")
        setFeedback({ type: "error", message: result.message ?? "Falha ao excluir empresa." })
      }
    } finally {
      setLoadingId(null)
    }
  }

  const openEdit = useCallback((company: CompanyListItem) => {
    if (!canEdit) return
    router.push(`/portal/cadastros/empresa/${company.id}/editar?returnTo=${encodeURIComponent(currentListHref)}`)
  }, [canEdit, currentListHref, router])

  const columns = useMemo<ColumnDef<CompanyListItem>[]>(() => [
    {
      id: "organization",
      header: "Organizacao",
      meta: { className: "px-6" },
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary/70 transition-all group-hover/row:scale-105 dark:bg-primary/10">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="max-w-55 truncate text-sm font-semibold leading-tight text-foreground">
              {row.original.razaoSocial}
            </p>
            <p className="mt-0.5 max-w-55 truncate text-xs text-muted-foreground">
              {row.original.nomeFantasia || <span className="italic opacity-50">Nome fantasia nao informado</span>}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "cnpj",
      header: "CNPJ",
      cell: ({ row }) => (
        <code className="whitespace-nowrap rounded-md border border-border/30 bg-muted/50 px-2 py-1 text-[11px] font-mono text-muted-foreground">
          {formatCNPJ(row.original.cnpj)}
        </code>
      ),
    },
    {
      id: "segment",
      header: "Segmento",
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {getCompanySegmentLabel(row.original.segment)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="space-y-1">
          <StatusBadge status={row.original.status} />
          {row.original.isBlockedByContract && (
            <span className="inline-flex items-center rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
              Bloqueada por contrato
            </span>
          )}
          {row.original.contractBlockReasonLabel && (
            <div className="space-y-1">
              <div className="hidden items-center gap-1 text-[10px] text-muted-foreground md:flex">
                <span className="max-w-47.5 truncate">{row.original.contractBlockReasonLabel}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded text-muted-foreground/80 hover:text-foreground"
                        aria-label="Ver motivo completo do bloqueio"
                        onClick={stopRecordClick}
                      >
                        <CircleAlert className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-70 whitespace-normal text-left">
                      {row.original.contractBlockReasonLabel}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-[10px] leading-4 text-muted-foreground md:hidden">
                {row.original.contractBlockReasonLabel}
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "members",
      header: "Membros",
      cell: ({ row }) => {
        const memberCount = row.original._count?.contactLinks ?? row.original.contactsCount ?? 0
        return (
          <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span className="font-medium tabular-nums">{memberCount}</span>
          </div>
        )
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Acoes</div>,
      meta: { className: "px-6 text-right" },
      cell: ({ row }) => (
        <CompanyActionsMenu
          company={row.original}
          canEdit={canEdit}
          canOpenCockpit={canOpenCockpit}
          canToggleStatus={canToggleStatus}
          canDelete={canDelete && !companyHasKnownLinks(row.original)}
          isLoading={loadingId === row.original.id}
          returnHref={currentListHref}
          onToggleStatus={() => {
            setInactivationReason(companyReasonOptions[0]?.key ?? DEFAULT_INACTIVATION_REASON)
            setInactivationDetails("")
            setConfirmDialog({ type: "status", company: row.original })
          }}
          onDelete={() => setConfirmDialog({ type: "delete", company: row.original })}
        />
      ),
    },
  ], [canDelete, canEdit, canOpenCockpit, canToggleStatus, companyReasonOptions, currentListHref, loadingId])

  const renderMobileItem = useCallback((company: CompanyListItem) => {
    const memberCount = company._count?.contactLinks ?? company.contactsCount ?? 0
    return (
      <div
        className={cn("space-y-3 p-4 transition-colors", canEdit ? "cursor-pointer hover:bg-muted/10" : "")}
        onClick={() => openEdit(company)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{company.nomeFantasia || company.razaoSocial}</p>
            <p className="truncate text-xs text-muted-foreground">{company.razaoSocial}</p>
          </div>
          <CompanyActionsMenu
            company={company}
            canEdit={canEdit}
            canOpenCockpit={canOpenCockpit}
            canToggleStatus={canToggleStatus}
            canDelete={canDelete && !companyHasKnownLinks(company)}
            isLoading={loadingId === company.id}
            returnHref={currentListHref}
            onToggleStatus={() => {
              setInactivationReason(companyReasonOptions[0]?.key ?? DEFAULT_INACTIVATION_REASON)
              setInactivationDetails("")
              setConfirmDialog({ type: "status", company })
            }}
            onDelete={() => setConfirmDialog({ type: "delete", company })}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <code className="rounded-md border border-border/30 bg-muted/50 px-2 py-1 text-[11px] font-mono text-muted-foreground">
            {formatCNPJ(company.cnpj)}
          </code>
          <span className="inline-flex items-center rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {getCompanySegmentLabel(company.segment)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={company.status} />
          <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span className="font-medium tabular-nums">{memberCount}</span>
          </div>
        </div>
        {company.isBlockedByContract && (
          <span className="inline-flex items-center rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
            Bloqueada por contrato
          </span>
        )}
      </div>
    )
  }, [canDelete, canEdit, canOpenCockpit, canToggleStatus, companyReasonOptions, currentListHref, loadingId, openEdit])

  const selectedInactivationReason = companyReasonOptions.find((item) => item.key === inactivationReason) ?? null
  const requiresInactivationDetails = selectedInactivationReason?.requiresDetails ?? false

  return (
    <>
      <ConfirmActionDialog
        open={confirmDialog?.type === "delete"}
        onOpenChange={(open) => (!open ? setConfirmDialog(null) : undefined)}
        title="Confirmar exclusao da empresa"
        description={
          confirmDialog?.type === "delete"
            ? `Deseja excluir a empresa ${confirmDialog.company.nomeFantasia || confirmDialog.company.razaoSocial}? Essa acao e irreversivel.`
            : ""
        }
        confirmLabel="Excluir empresa"
        isLoading={confirmDialog?.type === "delete" ? loadingId === confirmDialog.company.id : false}
        variant="danger"
        onConfirm={async () => {
          if (!confirmDialog || confirmDialog.type !== "delete") return
          await handleDelete(confirmDialog.company)
          setConfirmDialog(null)
        }}
      />

      <Dialog
        open={confirmDialog?.type === "status"}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog(null)
            setInactivationReason(companyReasonOptions[0]?.key ?? DEFAULT_INACTIVATION_REASON)
            setInactivationDetails("")
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.type === "status" && confirmDialog.company.status === "INACTIVE"
                ? "Reativar empresa"
                : "Inativar empresa"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.type === "status"
                ? confirmDialog.company.status === "INACTIVE"
                  ? `A reativacao pode restaurar contratos, contatos e usuarios que foram inativados exclusivamente por esta empresa.`
                  : `A inativacao da empresa sera aplicada em cascata: contratos serao suspensos, contatos exclusivos serao arquivados e usuarios exclusivos serao desativados.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {confirmDialog?.type === "status" && confirmDialog.company.status !== "INACTIVE" ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-sm text-muted-foreground">
                Empresa: <span className="font-medium text-foreground">{confirmDialog.company.nomeFantasia || confirmDialog.company.razaoSocial}</span>
                <br />
                Usuarios vinculados: <span className="font-medium text-foreground">{confirmDialog.company._count?.memberships ?? confirmDialog.company.usersCount ?? 0}</span>
                <br />
                Contatos vinculados: <span className="font-medium text-foreground">{confirmDialog.company._count?.contactLinks ?? confirmDialog.company.contactsCount ?? 0}</span>
                <br />
                Contratos vinculados: <span className="font-medium text-foreground">{confirmDialog.company._count?.contracts ?? 0}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-inactivation-reason">Motivo global da inativacao</Label>
                <Select
                  value={inactivationReason}
                  onValueChange={(value) => setInactivationReason(value as CompanyInactivationReasonValue)}
                >
                  <SelectTrigger id="company-inactivation-reason">
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {companyReasonOptions.map((reason) => (
                      <SelectItem key={reason.key} value={reason.key}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-inactivation-details">
                  {requiresInactivationDetails ? "Detalhes obrigatorios" : "Detalhes adicionais"}
                </Label>
                <Input
                  id="company-inactivation-details"
                  value={inactivationDetails}
                  onChange={(event) => setInactivationDetails(event.target.value)}
                  placeholder="Descreva o contexto da inativacao"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-sm text-muted-foreground">
              {confirmDialog?.type === "status"
                ? `Deseja reativar a empresa ${confirmDialog.company.nomeFantasia || confirmDialog.company.razaoSocial}?`
                : ""}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setConfirmDialog(null)
                setInactivationReason(companyReasonOptions[0]?.key ?? DEFAULT_INACTIVATION_REASON)
                setInactivationDetails("")
              }}
              disabled={confirmDialog?.type === "status" ? loadingId === confirmDialog.company.id : false}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!confirmDialog || confirmDialog.type !== "status") return
                if (confirmDialog.company.status !== "INACTIVE" && !inactivationReason) {
                  toast.error("Informe o motivo da inativacao.")
                  return
                }
                if (confirmDialog.company.status !== "INACTIVE" && requiresInactivationDetails && !inactivationDetails.trim()) {
                  toast.error("Descreva o motivo da inativacao.")
                  return
                }
                await handleToggleStatus(confirmDialog.company)
                setConfirmDialog(null)
              }}
              disabled={confirmDialog?.type === "status" ? loadingId === confirmDialog.company.id : false}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {feedback ? <RegistryFeedback type={feedback.type} message={feedback.message} /> : null}

        <RegistryToolbar
          searchValue={searchTerm}
          searchPlaceholder="Razao social, fantasia ou CNPJ..."
          onSearchChange={setSearchTerm}
          onClearSearch={() => setSearchTerm("")}
          resultLabel={`${pagination.total} filtradas`}
          filters={
            <>
              <RegistryFilterGroup
                value={filterStatus}
                onChange={setFilterStatus}
                options={[
                  { value: "ALL", label: "Todas", count: items.length },
                  ...(Object.keys(STATUS_CONFIG) as CompanyStatusValue[])
                    .filter((status) => (statusCounts[status] ?? 0) > 0)
                    .map((status) => ({
                      value: status,
                      label: STATUS_CONFIG[status].label,
                      count: statusCounts[status] ?? 0,
                    })),
                ]}
              />
              <RegistryFilterGroup
                value={filterBlocked}
                onChange={setFilterBlocked}
                options={[
                  { value: "ALL", label: "Todos" },
                  { value: "BLOCKED", label: "Bloqueadas", count: blockedCount },
                ]}
              />
            </>
          }

        />

        <div className="space-y-3">
          {/* Barra de Ferramentas da Tabela: Exibição & Colunas (Coesão de Layout Premium) */}
          <div className="flex items-center justify-between px-0.5">
            <div className="text-xs text-muted-foreground font-medium">
              {pagination.total > 0 && paginatedData.length > 0 && (
                <span>
                  Exibindo{" "}
                  <span className="font-semibold text-foreground">
                    {(currentPage - 1) * COMPANIES_PAGE_SIZE + 1}–
                    {Math.min(currentPage * COMPANIES_PAGE_SIZE, pagination.total)}
                  </span>{" "}
                  de{" "}
                  <span className="font-semibold text-foreground">{pagination.total}</span>{" "}
                  {pagination.total === 1 ? "empresa" : "empresas"}
                </span>
              )}
            </div>
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 border-border/60 bg-background/50 hover:bg-muted/50 text-xs shadow-sm transition-all duration-200"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                    <span>Colunas</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 bg-card/95 backdrop-blur-md border border-border/40 shadow-xl animate-in fade-in duration-200">
                  <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-2.5 py-1.5">
                    Exibir Colunas
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border/40 mx-1" />
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.cnpj}
                    onCheckedChange={(checked) =>
                      setColumnVisibility((prev) => ({ ...prev, cnpj: !!checked }))
                    }
                    className="text-xs focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer"
                  >
                    CNPJ
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.segment}
                    onCheckedChange={(checked) =>
                      setColumnVisibility((prev) => ({ ...prev, segment: !!checked }))
                    }
                    className="text-xs focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer"
                  >
                    Segmento
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.status}
                    onCheckedChange={(checked) =>
                      setColumnVisibility((prev) => ({ ...prev, status: !!checked }))
                    }
                    className="text-xs focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer"
                  >
                    Status
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.members}
                    onCheckedChange={(checked) =>
                      setColumnVisibility((prev) => ({ ...prev, members: !!checked }))
                    }
                    className="text-xs focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer"
                  >
                    Membros
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={paginatedData}
            flexible={true}
            loading={loadingList}
            loadingLabel="Carregando empresas..."
            minWidthClassName="min-w-[1120px]"
            emptyState={{
              title: "Nenhuma empresa encontrada",
              description: "Ajuste os filtros ou cadastre uma nova empresa.",
              icon: Building2,
            }}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            rowClassName="border-border/40 hover:bg-muted/40 transition-all duration-300"
            onRowClick={canEdit ? openEdit : undefined}
            renderMobileItem={renderMobileItem}
          />

          <RegistryPagination
            pagination={{
              page: currentPage,
              pageSize: COMPANIES_PAGE_SIZE,
              total: pagination.total,
              totalPages,
              hasPreviousPage: pagination.hasPreviousPage,
              hasNextPage: pagination.hasNextPage,
            }}
            itemLabel={{ singular: "empresa", plural: "empresas" }}
            isLoading={loadingList}
            onPageChange={setPage}
          />

          <div className="px-1 text-xs text-muted-foreground">
            Itens nesta pagina: <span className="font-medium tabular-nums text-foreground">{paginatedData.length}</span>
          </div>
        </div>
      </div>
    </>
  )
}
