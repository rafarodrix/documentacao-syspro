"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Link2, Trash2, RefreshCw, Search, CheckCircle } from "lucide-react"

export default function ContatosPendentesPage() {
  const [unlinkedContacts, setUnlinkedContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState("")
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null)
  const [companies, setCompanies] = useState<any[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<Record<string, string>>({})

  const loadUnlinkedContacts = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/contacts/unlinked`)
      if (res.ok) {
        const data = await res.json()
        setUnlinkedContacts(data)
      }
    } catch (error) {
      console.error("Erro ao buscar contatos", error)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadUnlinkedContacts()
  }, [])

  useEffect(() => {
    const searchCompanies = async () => {
      if (searchQuery.length < 2) return setCompanies([])
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/companies/search?q=${searchQuery}`)
        if (res.ok) {
          const data = await res.json()
          setCompanies(data)
        }
      } catch {}
    }
    const delay = setTimeout(searchCompanies, 300)
    return () => clearTimeout(delay)
  }, [searchQuery])

  const handleLink = async (contactId: string, companyId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/contacts/${contactId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId })
      })
      if (!res.ok) throw new Error("Falha ao vincular na API")
      setUnlinkedContacts(prev => prev.filter(c => c.id !== contactId))
    } catch {
      alert("Erro ao vincular contato.")
    }
  }

  const handleDelete = async (contactId: string) => {
    if (!confirm("Deseja realmente excluir este contato? Esta acao nao pode ser desfeita.")) return
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/contacts/${contactId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error("Falha ao excluir na API")
      setUnlinkedContacts(prev => prev.filter(c => c.id !== contactId))
    } catch {
      alert("Erro ao excluir contato.")
    }
  }

  const handleSync = async () => {
    setLoading(true)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/contacts/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
    } finally {
      await loadUnlinkedContacts()
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tratamento de Contatos</h1>
          <p className="text-muted-foreground text-sm">Vincule os contatos orfaos as suas respectivas empresas.</p>
        </div>
        <Button onClick={handleSync} variant="outline" size="sm" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Sincronizar contatos
        </Button>
      </div>

      <div className="bg-card border rounded-lg shadow-sm">
        <div className="p-4 border-b flex justify-between items-center bg-muted/30">
          <Badge variant="secondary" className="font-normal">
            {unlinkedContacts.length} contatos pendentes
          </Badge>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : unlinkedContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <CheckCircle className="w-12 h-12 opacity-20 mb-4" />
            <p>Parabens! Todos os contatos estao vinculados a empresas.</p>
          </div>
        ) : (
          <div className="divide-y">
            {unlinkedContacts.map(contact => (
              <div key={contact.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {contact.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{contact.name || "Sem Nome"}</p>
                    <p className="text-xs text-muted-foreground font-mono">{contact.whatsapp}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9 h-9 text-xs"
                      placeholder="Buscar empresa..."
                    onChange={(e) => {
                      setActiveSearchId(contact.id)
                      setSearchQuery(e.target.value)
                      setSelectedCompanyId(prev => ({ ...prev, [contact.id]: "" }))
                    }}
                    />
                  {companies.length > 0 && searchQuery && activeSearchId === contact.id && (
                      <select
                      value={selectedCompanyId[contact.id] || ""}
                        className="absolute top-10 left-0 w-full p-2 text-xs border rounded bg-white shadow-lg z-10"
                      onChange={(e) => setSelectedCompanyId(prev => ({ ...prev, [contact.id]: e.target.value }))}
                      >
                        <option value="">Selecione uma empresa...</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name || c.razaoSocial || c.id}</option>)}
                      </select>
                    )}
                  </div>

                  <Button size="sm" onClick={() => handleLink(contact.id, selectedCompanyId[contact.id])} disabled={!selectedCompanyId[contact.id]} title="Vincular">
                    <Link2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(contact.id)} title="Excluir Contato">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
