// src/components/platform/cadastros/company/CompanyTab.tsx
"use client"

import { useState, useMemo } from "react"
import { CompanyStatus } from "@prisma/client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Search,
  MoreHorizontal,
  Settings,
  FileText,
  Building2,
  ExternalLink,
  Users,
  X,
  SlidersHorizontal,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { CreateCompanyDialog } from "./CreateCompanyDialog"
import { EditCompanyDialog } from "./EditCompanyDialog"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CompanyWithRelations {
  id: string
  cnpj: string
  razaoSocial: string
  nomeFantasia: string | null
  status: CompanyStatus
  usersCount?: number
  _count?: { memberships: number }
  [key: string]: any
}

interface CompanyTabProps {
  data: CompanyWithRelations[]
  isAdmin: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCNPJ = (cnpj: string) =>
  cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")

const STATUS_CONFIG: Record<
  CompanyStatus,
  { label: string; dot: string; badge: string }
> = {
  ACTIVE: {
    label: "Ativo",
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
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
    badge:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CompanyStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.INACTIVE

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
        "text-[11px] font-semibold border tracking-wide",
        config.badge,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", config.dot)} />
      {config.label}
    </span>
  )
}

function MembershipCount({ count }: { count: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Users className="w-3.5 h-3.5" />
      <span className="font-medium tabular-nums">{count}</span>
    </div>
  )
}

function CompanyActionsMenu({
  company,
  onEdit,
}: {
  company: CompanyWithRelations
  onEdit: () => void
}) {
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
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Ações da empresa</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52 p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {company.nomeFantasia || company.razaoSocial}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="gap-2.5 cursor-pointer focus:bg-primary/5 rounded-md"
          onClick={onEdit}
        >
          <Settings className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">Editar Cadastro</span>
        </DropdownMenuItem>

        <DropdownMenuItem className="gap-2.5 cursor-pointer focus:bg-primary/5 rounded-md">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">Contratos e Planos</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="gap-2.5 cursor-pointer focus:bg-primary/5 rounded-md text-primary">
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="text-sm font-medium">Ir para Dashboard</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function EmptyState({ isSearching, searchTerm, onClear }: {
  isSearching: boolean
  searchTerm: string
  onClear: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-in fade-in zoom-in-95 duration-300">
      <div className="h-14 w-14 rounded-2xl bg-muted/40 flex items-center justify-center mb-4 ring-1 ring-border/40">
        <Building2 className="h-7 w-7 text-muted-foreground/40" />
      </div>
      <p className="text-sm font-semibold text-foreground">
        {isSearching ? `Sem resultados para "${searchTerm}"` : "Nenhuma empresa cadastrada"}
      </p>
      <p className="text-xs text-muted-foreground mt-1 max-w-[260px] text-center">
        {isSearching
          ? "Tente outros termos ou limpe o filtro para ver todas as empresas."
          : "Comece adicionando a primeira organização ao sistema."}
      </p>
      {isSearching && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 gap-1.5 text-xs"
          onClick={onClear}
        >
          <X className="w-3.5 h-3.5" />
          Limpar filtro
        </Button>
      )}
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function CompanyTab({ data, isAdmin }: CompanyTabProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<CompanyStatus | "ALL">("ALL")
  const [companyToEdit, setCompanyToEdit] = useState<CompanyWithRelations | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)


  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase()
    const cnpjRaw = searchTerm.replace(/\D/g, "")

    return data.filter((company) => {
      const matchesSearch =
        !term ||
        company.razaoSocial.toLowerCase().includes(term) ||
        (company.nomeFantasia?.toLowerCase().includes(term)) ||
        company.cnpj.includes(cnpjRaw)

      const matchesStatus =
        filterStatus === "ALL" || company.status === filterStatus

      return matchesSearch && matchesStatus
    })
  }, [data, searchTerm, filterStatus])

  const handleEditClick = (company: CompanyWithRelations) => {
    setCompanyToEdit(company)
    setIsEditOpen(true)
  }

  const handleEditClose = (open: boolean) => {
    setIsEditOpen(open)
    if (!open) setCompanyToEdit(null)
  }

  // Contagem por status para os filtros
  const statusCounts = useMemo(
    () =>
      data.reduce(
        (acc, c) => {
          acc[c.status] = (acc[c.status] ?? 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
    [data],
  )

  return (
    <>
      {/* Modal de Edição — só monta quando há empresa selecionada */}
      {companyToEdit && (
        <EditCompanyDialog
          open={isEditOpen}
          onOpenChange={handleEditClose}
          company={companyToEdit}
        />
      )}

      <div className="space-y-4">
        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
          {/* Busca */}
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Razão Social, Fantasia ou CNPJ..."
              className="pl-9 h-9 bg-background border-border/60 focus-visible:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Filtro de status */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg border border-border/50 bg-muted/20">
              <button
                onClick={() => setFilterStatus("ALL")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                  filterStatus === "ALL"
                    ? "bg-background shadow-sm text-foreground border border-border/50"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Todas
                <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
                  {data.length}
                </span>
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
                      filterStatus === status
                        ? "bg-background shadow-sm text-foreground border border-border/50"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {cfg.label}
                    <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {isAdmin && <CreateCompanyDialog />}
          </div>
        </div>

        {/* ── Tabela ───────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/40">
                <TableHead className="py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Organização
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  CNPJ
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Membros
                </TableHead>
                <TableHead className="text-right px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState
                      isSearching={!!searchTerm || filterStatus !== "ALL"}
                      searchTerm={searchTerm}
                      onClear={() => { setSearchTerm(""); setFilterStatus("ALL") }}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((company) => {
                  const memberCount =
                    company._count?.memberships ?? company.usersCount ?? 0

                  return (
                    <TableRow
                      key={company.id}
                      className="group hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0"
                    >
                      {/* Organização */}
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/8 dark:bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-4 w-4 text-primary/70" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground leading-tight truncate max-w-[220px]">
                              {company.razaoSocial}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[220px]">
                              {company.nomeFantasia || (
                                <span className="italic opacity-50">Nome fantasia não informado</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* CNPJ */}
                      <TableCell>
                        <code className="text-[11px] font-mono bg-muted/50 px-2 py-1 rounded-md text-muted-foreground border border-border/30 whitespace-nowrap">
                          {formatCNPJ(company.cnpj)}
                        </code>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <StatusBadge status={company.status} />
                      </TableCell>

                      {/* Membros */}
                      <TableCell>
                        <MembershipCount count={memberCount} />
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="text-right px-6">
                        <CompanyActionsMenu
                          company={company}
                          onEdit={() => handleEditClick(company)}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Rodapé com contagem ───────────────────────────────────────── */}
        {filteredData.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-muted-foreground">
              Exibindo{" "}
              <span className="font-medium text-foreground tabular-nums">
                {filteredData.length}
              </span>{" "}
              de{" "}
              <span className="font-medium text-foreground tabular-nums">
                {data.length}
              </span>{" "}
              {data.length === 1 ? "empresa" : "empresas"}
            </p>

            {(searchTerm || filterStatus !== "ALL") && (
              <button
                onClick={() => { setSearchTerm(""); setFilterStatus("ALL") }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" />
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}