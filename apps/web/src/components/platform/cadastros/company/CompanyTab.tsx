"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CompanyStatus } from "@prisma/client"
import {
  companyListResponseSchema,
  type CompanyInactivationReasonValue,
  type CompanyListResponse,
} from "@dosc-syspro/contracts/company"
import {
  DEFAULT_COMPANY_INACTIVATION_REASON_OPTIONS,
  type CompanyInactivationReasonOption,
} from "@dosc-syspro/contracts/settings"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MoreHorizontal, Building2, Users, X, CircleAlert, Plus, Pencil } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getCompanySegmentLabel } from "@/features/company/domain/company-segments"
import type { CompanyListItem } from "@/features/company/application/types"
import { ClickableCard, ClickableTableRow, stopRecordClick } from "@/components/platform/shared/ClickableRecord"
import {
  RegistryEmptyState,
  RegistryFeedback,
  RegistryFilterGroup,
  RegistryMetricCard,
  RegistryMetrics,
  RegistryPagination,
  RegistryTableCard,
  RegistryToolbar,
  type RegistryPaginationState,
} from "@/components/platform/shared/RegistryListScaffold"

import { deleteCompanyAction, updateCompanyStatusAction } from "@/features/company/application/actions"
import { fetchSettingsPreferences } from "@/features/settings/application/preferences"

interface CompanyTabProps {
  data: CompanyListItem[]
  initialPagination?: RegistryPaginationState
  initialSearchTerm?: string
  initialStatusFilter?: CompanyStatus | "ALL"
  canCreate: boolean
  canEdit: boolean
  canToggleStatus: boolean
  canDelete: boolean
}

const formatCNPJ = (cnpj: string) => cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
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
  returnHref,
  onToggleStatus,
  onDelete,
}: {
  company: CompanyListItem
  canEdit: boolean
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

  if (!canEdit && !canToggleStatus && !canDelete) return null

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && canEdit) {
          router.prefetch(editHref)
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
            "opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100",
          )}
          disabled={isLoading}
          onClick={stopRecordClick}
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
            onSelect={() => {
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

        {canToggleStatus && (
          <DropdownMenuItem
            className="gap-2.5 cursor-pointer focus:bg-primary/5 rounded-md"
            onSelect={(event) => {
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
  )
}

export function CompanyTab({
  data,
  initialPagination,
  initialSearchTerm = "",
  initialStatusFilter = "ALL",
  canCreate,
  canEdit,
  canToggleStatus,
  canDelete,
}: CompanyTabProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [items, setItems] = useState(data)
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm)
  const [filterStatus, setFilterStatus] = useState<CompanyStatus | "ALL">(initialStatusFilter)
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
        const params = new URLSearchParams()
        if (searchTerm.trim()) params.set("search", searchTerm.trim())
        if (filterStatus !== "ALL") params.set("status", filterStatus)
        params.set("page", String(page))
        params.set("pageSize", String(COMPANIES_PAGE_SIZE))

        const response = await fetch(`/api/companies?${params.toString()}`, { cache: "no-store" })
        if (!response.ok) throw new Error(`Falha ao carregar empresas (${response.status})`)

        const payload = companyListResponseSchema.parse(await response.json()) as CompanyListResponse
        if (!active) return

        setItems(payload.items)
        setPagination({
          page: payload.pagination.page,
          pageSize: payload.pagination.pageSize,
          total: payload.pagination.total,
          totalPages: Math.max(1, Math.ceil(payload.pagination.total / payload.pagination.pageSize)),
          hasPreviousPage: payload.pagination.hasPreviousPage,
          hasNextPage: payload.pagination.hasNextPage,
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
      const nextStatus = company.status === "INACTIVE" ? CompanyStatus.ACTIVE : CompanyStatus.INACTIVE
      const result = await updateCompanyStatusAction(
        company.id,
        nextStatus,
        nextStatus === CompanyStatus.INACTIVE ? inactivationReason : null,
        nextStatus === CompanyStatus.INACTIVE ? inactivationDetails : null,
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

  const openEdit = (company: CompanyListItem) => {
    if (!canEdit) return
    router.push(`/portal/cadastros/empresa/${company.id}/editar?returnTo=${encodeURIComponent(currentListHref)}`)
  }

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

        <RegistryMetrics>
          <RegistryMetricCard title="Total" value={pagination.total} description="Empresas cadastradas" icon={Building2} tone="info" />
          <RegistryMetricCard title="Ativas" value={statusCounts.ACTIVE ?? 0} description="Disponiveis para operacao" icon={Users} tone="success" />
          <RegistryMetricCard title="Bloqueadas" value={blockedCount} description="Com restricao contratual" icon={CircleAlert} tone={blockedCount > 0 ? "warning" : "neutral"} />
        </RegistryMetrics>

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
                  ...(Object.keys(STATUS_CONFIG) as CompanyStatus[])
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
          actions={
            canCreate ? (
              <Button asChild size="sm" className="h-9 gap-2">
                <Link href={`/portal/cadastros/empresa/novo?returnTo=${encodeURIComponent(currentListHref)}`}>
                  <Plus className="h-4 w-4" />
                  Nova empresa
                </Link>
              </Button>
            ) : null
          }
        />

        <RegistryTableCard>
          <div className="md:hidden divide-y">
            {loadingList ? (
              <div className="p-6 text-sm text-muted-foreground">Carregando empresas...</div>
            ) : paginatedData.length === 0 ? (
              <RegistryEmptyState
                icon={Building2}
                title="Nenhuma empresa encontrada"
                description="Ajuste os filtros ou cadastre uma nova empresa."
                searchTerm={searchTerm}
                onClear={() => setSearchTerm("")}
              />
            ) : (
              paginatedData.map((company) => {
                const memberCount = company._count?.contactLinks ?? company.contactsCount ?? 0
                return (
                  <ClickableCard
                    key={company.id}
                    enabled={canEdit}
                    onOpen={() => openEdit(company)}
                    className="p-4 space-y-3"
                    title="Clique para editar"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{company.nomeFantasia || company.razaoSocial}</p>
                        <p className="text-xs text-muted-foreground truncate">{company.razaoSocial}</p>
                      </div>
                      <CompanyActionsMenu
                        company={company}
                        canEdit={canEdit}
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
                      <code className="text-[11px] font-mono bg-muted/50 px-2 py-1 rounded-md text-muted-foreground border border-border/30">
                        {formatCNPJ(company.cnpj)}
                      </code>
                      <span className="inline-flex items-center rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {getCompanySegmentLabel(company.segment)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={company.status} />
                      <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span className="font-medium tabular-nums">{memberCount}</span>
                      </div>
                    </div>
                    {company.isBlockedByContract && (
                      <span className="inline-flex items-center rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                        Bloqueada por contrato
                      </span>
                    )}
                  </ClickableCard>
                )
              })
            )}
          </div>

          <div className="hidden md:block w-full overflow-x-auto">
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
              {loadingList ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                    Carregando empresas...
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <RegistryEmptyState
                      icon={Building2}
                      title="Nenhuma empresa encontrada"
                      description="Ajuste os filtros ou cadastre uma nova empresa."
                      searchTerm={searchTerm}
                      onClear={() => setSearchTerm("")}
                      compact
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((company, index) => {
                  const memberCount = company._count?.contactLinks ?? company.contactsCount ?? 0

                  return (
                    <ClickableTableRow
                      key={company.id}
                      enabled={canEdit}
                      onOpen={() => openEdit(company)}
                      className="group/row hover:bg-muted/40 transition-all duration-300 border-border/40"
                      style={{ animationDelay: `${index * 40}ms` }}
                      title="Clique para editar"
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
                                        onClick={stopRecordClick}
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
                      </TableCell>
                    </ClickableTableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
          </div>
        </RegistryTableCard>

        <div className="flex flex-col gap-2">
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



