"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Building2, Loader2, Plus, RefreshCw, Save, Search, Trash2, Unlink, X } from "lucide-react"

type CompanyOption = {
  id: string
  razaoSocial: string
  nomeFantasia?: string | null
}

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

type ContactForm = {
  name: string
  email: string
  phone: string
  whatsapp: string
  notes: string
  companyIds: string[]
}

function toForm(contact: ContactItem | null): ContactForm {
  if (!contact) {
    return {
      name: "",
      email: "",
      phone: "",
      whatsapp: "",
      notes: "",
      companyIds: [],
    }
  }

  return {
    name: contact.name ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    whatsapp: contact.whatsapp ?? "",
    notes: contact.notes ?? "",
    companyIds: contact.companyIds ?? (contact.companyId ? [contact.companyId] : []),
  }
}

function formatDate(value?: string) {
  if (!value) return "N/A"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "N/A"
  return date.toLocaleString("pt-BR")
}

export function ContactsHubPage() {
  const [contacts, setContacts] = useState<ContactItem[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [search, setSearch] = useState("")
  const [scope, setScope] = useState<"all" | "linked" | "unlinked">("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [selectedContact, setSelectedContact] = useState<ContactItem | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ContactForm>(toForm(null))

  const [companyQuery, setCompanyQuery] = useState("")
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([])
  const [searchingCompanies, setSearchingCompanies] = useState(false)

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  const selectedCompanies = useMemo(() => {
    const ids = form.companyIds
    return ids
      .map((id) =>
        selectedContact?.companies?.find((company) => company.id === id) ??
        companyOptions.find((company) => company.id === id)
      )
      .filter(Boolean) as CompanyOption[]
  }, [companyOptions, form.companyIds, selectedContact])

  const loadContacts = async () => {
    setLoadingList(true)
    setErrorMessage(null)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("q", search.trim())
      if (scope === "unlinked") params.set("unlinked", "true")
      if (scope === "linked") params.set("unlinked", "false")
      params.set("limit", "100")

      const response = await fetch(`/api/contacts?${params.toString()}`, { cache: "no-store" })
      if (!response.ok) throw new Error(`Falha ao carregar contatos (${response.status})`)
      const data = (await response.json()) as ContactItem[]
      setContacts(data)

      setSelectedId((current) => {
        if (current && data.some((item) => item.id === current)) return current
        return data[0]?.id ?? null
      })
    } catch (error: any) {
      setErrorMessage(error?.message || "Erro ao carregar contatos")
      setContacts([])
      setSelectedId(null)
    } finally {
      setLoadingList(false)
    }
  }

  const loadContactDetails = async (contactId: string) => {
    setLoadingDetails(true)
    setErrorMessage(null)
    try {
      const response = await fetch(`/api/contacts/${contactId}`, { cache: "no-store" })
      if (!response.ok) throw new Error(`Falha ao carregar contato (${response.status})`)
      const data = (await response.json()) as ContactItem
      setSelectedContact(data)
      setForm(toForm(data))
    } catch (error: any) {
      setErrorMessage(error?.message || "Erro ao carregar detalhes do contato")
      setSelectedContact(null)
      setForm(toForm(null))
    } finally {
      setLoadingDetails(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadContacts()
    }, 250)
    return () => clearTimeout(timer)
  }, [search, scope])

  useEffect(() => {
    if (!selectedId) {
      setSelectedContact(null)
      setForm(toForm(null))
      return
    }
    void loadContactDetails(selectedId)
  }, [selectedId])

  useEffect(() => {
    const query = companyQuery.trim()
    if (query.length < 2) {
      setCompanyOptions([])
      return
    }

    const timer = setTimeout(async () => {
      setSearchingCompanies(true)
      try {
        const response = await fetch(`/api/companies/search?q=${encodeURIComponent(query)}`, { cache: "no-store" })
        if (!response.ok) throw new Error("Falha na busca de empresas")
        const companies = (await response.json()) as CompanyOption[]
        setCompanyOptions(companies)
      } catch {
        setCompanyOptions([])
      } finally {
        setSearchingCompanies(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [companyQuery])

  const patchContact = async (payload: Partial<ContactForm>) => {
    if (!selectedContact) return

    setSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const response = await fetch(`/api/contacts/${selectedContact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => "")
        throw new Error(errorText || `Falha ao atualizar contato (${response.status})`)
      }

      const updated = (await response.json()) as ContactItem
      setSelectedContact(updated)
      setForm(toForm(updated))
      setContacts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setSuccessMessage("Contato atualizado com sucesso.")
    } catch (error: any) {
      setErrorMessage(error?.message || "Falha ao atualizar contato")
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (!selectedContact) return
    await patchContact({
      name: form.name,
      email: form.email,
      phone: form.phone,
      whatsapp: form.whatsapp,
      notes: form.notes,
      companyIds: form.companyIds,
    })
  }

  const handleUnlink = async () => {
    await patchContact({ companyIds: [] })
  }

  const handleDelete = async () => {
    if (!selectedContact) return
    if (!confirm(`Excluir o contato "${selectedContact.name}"?`)) return

    setSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const response = await fetch(`/api/contacts/${selectedContact.id}`, { method: "DELETE" })
      if (!response.ok) throw new Error(`Falha ao excluir contato (${response.status})`)

      const removedId = selectedContact.id
      const remaining = contacts.filter((item) => item.id !== removedId)
      setContacts(remaining)
      setSelectedId((current) => {
        if (current !== removedId) return current
        return remaining[0]?.id ?? null
      })

      setSuccessMessage("Contato excluido com sucesso.")
    } catch (error: any) {
      setErrorMessage(error?.message || "Falha ao excluir contato")
    } finally {
      setSaving(false)
    }
  }

  const handleEvolutionSync = async () => {
    setSyncing(true)
    setErrorMessage(null)
    setSuccessMessage(null)
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

      setSuccessMessage(payload?.message || "Sincronizacao concluida.")
      await loadContacts()
    } catch (error: any) {
      setErrorMessage(error?.message || "Falha ao sincronizar contatos")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contatos</h1>
          <p className="text-sm text-muted-foreground">Contatos concentram os dados principais; usuarios so reutilizam esse cadastro para acesso.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadContacts()} disabled={loadingList}>
            {loadingList ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleEvolutionSync} disabled={syncing}>
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sincronizar contatos
          </Button>
          <Button asChild size="sm">
            <Link href="/portal/contatos/novo">
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar contato
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <section className="rounded-lg border bg-card p-3">
          <div className="mb-3 space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, email, whatsapp..."
                className="pl-8"
              />
            </div>
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value as "all" | "linked" | "unlinked")}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Todos</option>
              <option value="linked">Vinculados</option>
              <option value="unlinked">Nao vinculados</option>
            </select>
          </div>

          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{contacts.length} contatos</span>
          </div>

          <div className="max-h-[65vh] space-y-1 overflow-y-auto pr-1">
            {loadingList && (
              <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </div>
            )}

            {!loadingList && contacts.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">Nenhum contato encontrado.</p>
            )}

            {!loadingList &&
              contacts.map((contact) => {
                const active = selectedId === contact.id
                return (
                  <button
                    key={contact.id}
                    className={cn(
                      "w-full rounded-md border px-3 py-2 text-left transition-colors",
                      active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedId(contact.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{contact.name || "Sem nome"}</p>
                      {(contact.companyIds?.length ?? 0) > 0 ? (
                        <Badge variant="secondary" className="text-[10px]">Vinculado</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Sem empresa</Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{contact.whatsapp || contact.phone || "Sem telefone"}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {contact.companies?.map((company) => company.nomeFantasia || company.razaoSocial).join(", ") || contact.company?.nomeFantasia || contact.company?.razaoSocial || "Sem empresa"}
                    </p>
                  </button>
                )
              })}
          </div>
        </section>

        <section className="rounded-lg border bg-card p-4 md:p-5">
          {!selectedId && <p className="text-sm text-muted-foreground">Selecione um contato para editar.</p>}

          {selectedId && loadingDetails && (
            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando contato...
            </div>
          )}

          {selectedId && !loadingDetails && selectedContact && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{selectedContact.name || "Contato"}</h2>
                  <p className="text-xs text-muted-foreground">
                    Criado em {formatDate(selectedContact.createdAt)} • Atualizado em {formatDate(selectedContact.updatedAt)}
                  </p>
                </div>
                <Badge variant={(selectedContact.companyIds?.length ?? 0) > 0 ? "secondary" : "outline"}>
                  {(selectedContact.companyIds?.length ?? 0) > 0 ? "Vinculado" : "Sem empresa"}
                </Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Nome</label>
                  <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <Input
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="email@empresa.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Telefone</label>
                  <Input
                    value={form.phone}
                    onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">WhatsApp</label>
                  <Input
                    value={form.whatsapp}
                    onChange={(event) => setForm((prev) => ({ ...prev, whatsapp: event.target.value }))}
                    placeholder="5500000000000"
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4" />
                  Empresas vinculadas
                </div>

                <p className="text-xs text-muted-foreground">
                  Atual: {selectedCompanies.length ? selectedCompanies.map((company) => company.nomeFantasia || company.razaoSocial).join(", ") : "Nenhuma empresa vinculada"}
                </p>

                <div className="space-y-2">
                  <Input
                    value={companyQuery}
                    onChange={(event) => setCompanyQuery(event.target.value)}
                    placeholder="Buscar empresa por nome/cnpj..."
                  />
                  <div className="flex flex-wrap gap-2">
                    {selectedCompanies.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Nenhuma empresa vinculada.</span>
                    ) : (
                      selectedCompanies.map((company) => (
                        <button
                          key={company.id}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, companyIds: prev.companyIds.filter((id) => id !== company.id) }))
                          }
                          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-3 py-1 text-xs"
                        >
                          {company.nomeFantasia || company.razaoSocial}
                          <X className="h-3 w-3" />
                        </button>
                      ))
                    )}
                  </div>
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-input bg-background p-2">
                    {companyOptions.map((company) => {
                      const selected = form.companyIds.includes(company.id)
                      return (
                        <button
                          key={company.id}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              companyIds: selected
                                ? prev.companyIds.filter((id) => id !== company.id)
                                : [...prev.companyIds, company.id],
                            }))
                          }
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                            selected ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                          )}
                        >
                          <span>{company.nomeFantasia || company.razaoSocial}</span>
                          <span className="text-[11px]">{selected ? "Selecionada" : "Selecionar"}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                {searchingCompanies && <p className="text-xs text-muted-foreground">Buscando empresas...</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Observacoes</label>
                <Textarea
                  rows={5}
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Informacoes adicionais do contato"
                />
              </div>

              {errorMessage && <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>}
              {successMessage && <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p>}

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar alteracoes
                </Button>
                <Button variant="outline" onClick={handleUnlink} disabled={saving || (selectedContact.companyIds?.length ?? 0) === 0}>
                  <Unlink className="mr-2 h-4 w-4" />
                  Remover empresas
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir contato
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
