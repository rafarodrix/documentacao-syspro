"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
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
import { ConfirmActionDialog } from "@/components/platform/cadastros/shared/ConfirmActionDialog"
import {
  Building2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Unlink,
  Users,
  X,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────
type ContactItem = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  notes?: string | null
  companyId?: string | null
  companyIds?: string[]
  createdAt: string
  updatedAt: string
  company?: {
    id: string
    razaoSocial: string
    nomeFantasia?: string | null
  } | null
  companies?: Array<{
    id: string
    razaoSocial: string
    nomeFantasia?: string | null
  }>
}

type ScopeFilter = "all" | "linked" | "unlinked"

interface ContactsTabProps {
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

const SCOPE_CONFIG: Record<ScopeFilter, { label: string }> = {
  all: { label: "Todos" },
  linked: { label: "Vinculados" },
  unlinked: { label: "Sem empresa" },
}

function getCompanyNames(contact: ContactItem): string {
  if (contact.companies && contact.companies.length > 0) {
    return contact.companies
      .map((c) => c.nomeFantasia || c.razaoSocial)
      .join(", ")
  }
  if (contact.company) {
    return contact.company.nomeFantasia || contact.company.razaoSocial
  }
  return ""
}

function LinkedBadge({ count }: { count: number }) {
  if (count > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border tracking-wide bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        {count} {count === 1 ? "empresa" : "empresas"}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border tracking-wide bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
      Sem empresa
    </span>
  )
}

// ─── Actions Menu ────────────────────────────────────────────────────────────
function ContactActionsMenu({
  contact,
  canEdit,
  canDelete,
  isLoading,
  onUnlink,
  onDelete,
}: {
  contact: ContactItem
  canEdit: boolean
  canDelete: boolean
  isLoading: boolean
  onUnlink: () => void
  onDelete: () => void
}) {
  if (!canEdit && !canDelete) return null

  const linkedCount = contact.companyIds?.length ?? (contact.company ? 1 : 0)

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
            "opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100",
          )}
          disabled={isLoading}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Acoes do contato</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {contact.name || "Contato"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {canEdit && (
          <DropdownMenuItem asChild className="gap-2.5 cursor-pointer focus:bg-primary/5 rounded-md">
            <Link href={`/portal/contatos/${contact.id}/editar`}>
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">Editar contato</span>
            </Link>
          </DropdownMenuItem>
        )}

        {canEdit && linkedCount > 0 && (
          <DropdownMenuItem className="gap-2.5 cursor-pointer focus:bg-primary/5 rounded-md" onClick={onUnlink}>
            <Unlink className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">Desvincular empresas</span>
          </DropdownMenuItem>
        )}

        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2.5 cursor-pointer rounded-md text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="text-sm font-medium">Excluir contato</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export function ContactsTab({ canCreate, canEdit, canDelete }: ContactsTabProps) {
  const [contacts, setContacts] = useState<ContactItem[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [scope, setScope] = useState<ScopeFilter>("all")
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<
    | { type: "delete" | "unlink"; contact: ContactItem }
    | null
  >(null)

  // ── Load contacts ──────────────────────────────────────────────────────
  const loadContacts = async () => {
    setLoadingList(true)
    try {
      const params = new URLSearchParams()
      if (scope === "unlinked") params.set("unlinked", "true")
      if (scope === "linked") params.set("unlinked", "false")
      params.set("limit", "200")

      const response = await fetch(`/api/contacts?${params.toString()}`, { cache: "no-store" })
      if (!response.ok) throw new Error(`Falha ao carregar contatos (${response.status})`)
      const data = (await response.json()) as ContactItem[]
      setContacts(data)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao carregar contatos"
      toast.error(message)
      setContacts([])
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    void loadContacts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope])

  // ── Filter local ───────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    const term = normalizeSearch(searchTerm)

    const filtered = contacts.filter((contact) => {
      if (!term) return true
      const normalizedName = normalizeSearch(contact.name ?? "")
      const normalizedEmail = normalizeSearch(contact.email ?? "")
      const normalizedWhatsapp = normalizeSearch(contact.whatsapp ?? "")
      const normalizedPhone = normalizeSearch(contact.phone ?? "")
      const companyName = normalizeSearch(getCompanyNames(contact))
      return (
        normalizedName.includes(term) ||
        normalizedEmail.includes(term) ||
        normalizedWhatsapp.includes(term) ||
        normalizedPhone.includes(term) ||
        companyName.includes(term)
      )
    })

    return filtered.sort((a, b) => {
      const aName = a.name?.trim() ?? ""
      const bName = b.name?.trim() ?? ""
      return aName.localeCompare(bName, "pt-BR", { sensitivity: "base", numeric: true })
    })
  }, [contacts, searchTerm])

  // ── Scope counts ───────────────────────────────────────────────────────
  const scopeCounts = useMemo(() => {
    const linked = contacts.filter(
      (c) => (c.companyIds?.length ?? 0) > 0 || !!c.company,
    ).length
    return {
      all: contacts.length,
      linked,
      unlinked: contacts.length - linked,
    }
  }, [contacts])

  // ── Actions ────────────────────────────────────────────────────────────
  const handleUnlink = async (contact: ContactItem) => {
    setLoadingId(contact.id)
    try {
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyIds: [] }),
      })
      if (!response.ok) throw new Error(`Falha ao desvincular (${response.status})`)
      const updated = (await response.json()) as ContactItem
      setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      toast.success("Empresas desvinculadas com sucesso.")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao desvincular"
      toast.error(message)
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (contact: ContactItem) => {
    setLoadingId(contact.id)
    try {
      const response = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" })
      if (!response.ok) throw new Error(`Falha ao excluir contato (${response.status})`)
      setContacts((prev) => prev.filter((c) => c.id !== contact.id))
      toast.success("Contato excluido com sucesso.")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao excluir contato"
      toast.error(message)
    } finally {
      setLoadingId(null)
    }
  }

  const handleEvolutionSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch(`/api/contacts/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || `Falha ao sincronizar contatos (${response.status})`)
      }
      toast.success(payload?.message || "Sincronizacao concluida.")
      await loadContacts()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao sincronizar contatos"
      toast.error(message)
    } finally {
      setSyncing(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <ConfirmActionDialog
        open={!!confirmDialog}
        onOpenChange={(open) => (!open ? setConfirmDialog(null) : undefined)}
        title={
          confirmDialog?.type === "delete"
            ? "Confirmar exclusao do contato"
            : "Confirmar desvinculacao"
        }
        description={
          confirmDialog
            ? confirmDialog.type === "delete"
              ? `Deseja excluir o contato "${confirmDialog.contact.name}"? Essa acao e irreversivel.`
              : `Deseja desvincular todas as empresas do contato "${confirmDialog.contact.name}"?`
            : ""
        }
        confirmLabel={confirmDialog?.type === "delete" ? "Excluir contato" : "Confirmar"}
        isLoading={!!confirmDialog?.contact && loadingId === confirmDialog.contact.id}
        variant={confirmDialog?.type === "delete" ? "danger" : "default"}
        onConfirm={async () => {
          if (!confirmDialog) return
          if (confirmDialog.type === "delete") {
            await handleDelete(confirmDialog.contact)
          } else {
            await handleUnlink(confirmDialog.contact)
          }
          setConfirmDialog(null)
        }}
      />

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nome, email, whatsapp, empresa..."
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

          <div className="w-full sm:w-auto space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="inline-flex min-w-max items-center gap-1.5 p-1 rounded-lg border border-border/50 bg-muted/20">
                {(Object.keys(SCOPE_CONFIG) as ScopeFilter[]).map((key) => {
                  const count = scopeCounts[key]
                  return (
                    <button
                      key={key}
                      onClick={() => setScope(key)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                        scope === key
                          ? "bg-background shadow-sm text-foreground border border-border/50"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {SCOPE_CONFIG[key].label}{" "}
                      <span className="ml-1.5 text-[10px] text-muted-foreground">{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadContacts()}
                disabled={loadingList}
                className="gap-2"
              >
                {loadingList ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Atualizar</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleEvolutionSync}
                disabled={syncing}
                className="gap-2"
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Sincronizar</span>
              </Button>

              {canCreate && (
                <Link href="/portal/contatos/novo" className="block w-full sm:w-auto">
                  <Button
                    type="button"
                    className="inline-flex w-full sm:w-auto items-center justify-center whitespace-nowrap rounded-md py-2 text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground px-4 shadow-sm hover:bg-primary/90 gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Novo Contato
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── Table card ────────────────────────────────────────────────── */}
        <Card className="group relative overflow-hidden border-border/60 shadow-lg bg-background/50 backdrop-blur-xl">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-linear-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          {/* Mobile view */}
          <div className="md:hidden divide-y">
            {loadingList ? (
              <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando contatos...
              </div>
            ) : filteredData.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p className="font-medium text-foreground">Nenhum contato encontrado</p>
                <p className="text-xs mt-1">Ajuste os filtros ou cadastre um novo contato.</p>
              </div>
            ) : (
              filteredData.map((contact) => {
                const linkedCount = contact.companyIds?.length ?? (contact.company ? 1 : 0)
                return (
                  <div key={contact.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{contact.name || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.whatsapp || contact.phone || "Sem telefone"}
                        </p>
                      </div>
                      <ContactActionsMenu
                        contact={contact}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        isLoading={loadingId === contact.id}
                        onUnlink={() => setConfirmDialog({ type: "unlink", contact })}
                        onDelete={() => setConfirmDialog({ type: "delete", contact })}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      {contact.email && (
                        <code className="text-[11px] font-mono bg-muted/50 px-2 py-1 rounded-md text-muted-foreground border border-border/30 truncate max-w-[200px]">
                          {contact.email}
                        </code>
                      )}
                      <LinkedBadge count={linkedCount} />
                    </div>
                    {linkedCount > 0 && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        <Building2 className="inline h-3 w-3 mr-1 opacity-60" />
                        {getCompanyNames(contact)}
                      </p>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Desktop view */}
          <div className="hidden md:block w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/20">
                <TableRow className="hover:bg-transparent border-b border-border/60">
                  <TableHead className="py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Contato
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    WhatsApp / Telefone
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Empresas
                  </TableHead>
                  <TableHead className="text-right px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Acoes
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loadingList ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground animate-in fade-in zoom-in-95 duration-500">
                        <Loader2 className="h-6 w-6 animate-spin opacity-40" />
                        <p className="text-sm">Carregando contatos...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground animate-in fade-in zoom-in-95 duration-500">
                        <div className="rounded-full bg-muted/30 p-4">
                          <Users className="h-8 w-8 opacity-40" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">Nenhum contato encontrado</p>
                          <p className="text-xs">Ajuste os filtros ou cadastre um novo contato.</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((contact, index) => {
                    const linkedCount = contact.companyIds?.length ?? (contact.company ? 1 : 0)
                    const companyNames = getCompanyNames(contact)

                    return (
                      <TableRow
                        key={contact.id}
                        className="group/row hover:bg-muted/40 transition-all duration-300 border-border/40"
                        style={{ animationDelay: `${index * 40}ms` }}
                      >
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/8 dark:bg-primary/10 flex items-center justify-center shrink-0 transition-all group-hover/row:scale-105">
                              <Users className="h-4 w-4 text-primary/70" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground leading-tight truncate max-w-55">
                                {contact.name || "Sem nome"}
                              </p>
                              {contact.notes && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-55">
                                  {contact.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <code className="text-[11px] font-mono bg-muted/50 px-2 py-1 rounded-md text-muted-foreground border border-border/30 whitespace-nowrap">
                            {contact.whatsapp || contact.phone || "—"}
                          </code>
                        </TableCell>

                        <TableCell>
                          <span className="text-sm text-muted-foreground truncate block max-w-40">
                            {contact.email || <span className="italic opacity-50">Nao informado</span>}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <LinkedBadge count={linkedCount} />
                            {companyNames && (
                              <p className="text-[10px] text-muted-foreground truncate max-w-40 leading-4">
                                {companyNames}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right px-6">
                          <ContactActionsMenu
                            contact={contact}
                            canEdit={canEdit}
                            canDelete={canDelete}
                            isLoading={loadingId === contact.id}
                            onUnlink={() => setConfirmDialog({ type: "unlink", contact })}
                            onDelete={() => setConfirmDialog({ type: "delete", contact })}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </>
  )
}
