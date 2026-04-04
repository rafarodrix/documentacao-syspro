"use client"

import React, { useState, useEffect, useRef } from "react"
import { 
  getConversations, 
  getConversationMessages, 
  sendConversationMessage, 
  resolveConversation, 
  linkConversationToCompany,
  searchCompanies,
  searchSystemContacts,
  startOutboundConversation
} from "@/features/conversations/application/conversation-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Loader2, Send, CheckCircle, Search, Link2, Building, MessageSquare, Paperclip, UserPlus } from "lucide-react"

type TabType = "ATENDENDO" | "ESPERA" | "CONTATOS"

export default function ConversasOmnichannelPage() {
  const [activeTab, setActiveTab] = useState<TabType>("ATENDENDO")

  const [activeConv, setActiveConv] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  
  // Lists
  const [atendendoList, setAtendendoList] = useState<any[]>([])
  const [esperaList, setEsperaList] = useState<any[]>([])
  const [contatosList, setContatosList] = useState<any[]>([])
  const [contatosQuery, setContatosQuery] = useState("")

  const [loadingList, setLoadingList] = useState(true)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  
  const [textInput, setTextInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Vinculo States
  const [matchQuery, setMatchQuery] = useState("")
  const [matchResults, setMatchResults] = useState<any[]>([])
  const [linking, setLinking] = useState(false)
  const [matchDialogOpen, setMatchDialogOpen] = useState(false)

  const loadConversations = async () => {
    // Carrega Atendendo e Espera ao mesmo tempo
    const [atendendoRes, esperaRes] = await Promise.all([
      getConversations("ATENDENDO"),
      getConversations("ESPERA")
    ])
    if (atendendoRes.data) setAtendendoList(atendendoRes.data)
    if (esperaRes.data) setEsperaList(esperaRes.data)
    setLoadingList(false)
  }

  const loadContacts = async () => {
    setLoadingContacts(true)
    const res = await searchSystemContacts(contatosQuery)
    if (res.data) setContatosList(res.data)
    setLoadingContacts(false)
  }

  const loadMessages = async (convId: string) => {
    setLoadingMessages(true)
    const res = await getConversationMessages(convId)
    if (res.data) setMessages(res.data)
    setLoadingMessages(false)
    setTimeout(() => {
      scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
    }, 100)
  }

  useEffect(() => {
    loadConversations()
    const int = setInterval(loadConversations, 10000)
    return () => clearInterval(int)
  }, [])

  useEffect(() => {
    if (activeTab === "CONTATOS") {
      loadContacts()
    }
  }, [activeTab]) // Dispara a primeira busca ao abrir a aba contatos

  const handleSelectConv = (conv: any) => {
    setActiveConv(conv)
    loadMessages(conv.id)
  }

  const handleStartOutbound = async (contact: any) => {
    const res = await startOutboundConversation(contact.id);
    if (!res.error && res.data) {
      // Força a mudança para aba Atendendo
      setActiveTab("ATENDENDO");
      setActiveConv(res.data);
      await loadConversations(); // Recarrega listas
      loadMessages(res.data.id);
    } else {
      alert("Falha ao iniciar conversa com contato.");
    }
  }

  const handleSend = async () => {
    if (!textInput.trim() || !activeConv) return
    setSendingMessage(true)
    const txt = textInput
    setTextInput("")
    
    // Otimista
    setMessages(prev => [...prev, { id: "temp", body: txt, direction: "OUTBOUND", authorKind: "USER" }])
    setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100)

    await sendConversationMessage(activeConv.id, txt)
    await loadMessages(activeConv.id)
    await loadConversations()
    setSendingMessage(false)
  }

  const handleResolve = async () => {
    if (!activeConv) return
    if(confirm("Deseja realmente finalizar este atendimento?")) {
      await resolveConversation(activeConv.id)
      setActiveConv(null)
      loadConversations()
    }
  }

  const searchComps = async () => {
    const res = await searchCompanies(matchQuery)
    if(res.data) setMatchResults(res.data)
  }

  const handleLinkCompany = async (companyId: string) => {
    if (!activeConv) return
    setLinking(true)
    const name = prompt("Qual o nome ou setor do contato (ex: Financeiro, Joao)?")
    await linkConversationToCompany(activeConv.id, companyId, name || "Contato")
    setLinking(false)
    setMatchDialogOpen(false)
    loadConversations()
    
    setActiveConv((prev: any) => ({ ...prev, companyId }))
  }

  const renderConversationItem = (conv: any) => (
    <button 
      key={conv.id}
      onClick={() => handleSelectConv(conv)}
      className={`w-full text-left p-3 rounded-lg transition-colors border ${activeConv?.id === conv.id ? "bg-primary/5 border-primary/20" : "bg-white hover:bg-slate-100 border-transparent shadow-sm"}`}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="font-medium text-sm truncate flex-1">
          {conv.contactNameSnapshot || conv.contactWhatsappSnapshot || "Desconhecido"}
        </span>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
          {new Date(conv.lastMessageAt || conv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className="flex gap-2 items-center mb-1">
        {conv.companyId ? (
          <Badge variant="secondary" className="text-[9px] px-1 py-0 w-fit flex gap-1 bg-green-100 text-green-800 hover:bg-green-100"><Building className="w-2 h-2"/> {conv.company?.nomeFantasia?.substring(0, 10)}...</Badge>
        ) : (
          <Badge variant="outline" className="text-[9px] px-1 py-0 w-fit text-amber-600 border-amber-300 bg-amber-50">S/ VÍNCULO</Badge>
        )}
      </div>
      <p className="text-xs text-slate-500 line-clamp-1 mt-1">
        {conv.lastMessagePreview || "Iniciou uma conversa..."}
      </p>
    </button>
  );

  return (
    <div className="flex h-[calc(100vh-80px)] w-full">
      {/* Coluna Esquerda - Lista de Conversas / Contatos */}
      <div className="w-[350px] border-r bg-slate-50 flex flex-col shrink-0">
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="flex-1 flex flex-col w-full h-full">
          <div className="p-3 border-b bg-white sticky top-0 z-10 space-y-3">
            <h2 className="font-bold text-lg flex items-center gap-2 tracking-tight">
              <MessageSquare className="w-5 h-5 text-primary" />
              Chat Omnichannel
            </h2>
            <TabsList className="grid grid-cols-3 w-full h-9 bg-slate-100/80">
              <TabsTrigger value="ATENDENDO" className="text-xs">Atendendo</TabsTrigger>
              <TabsTrigger value="ESPERA" className="text-xs flex gap-1">Espera {esperaList.length > 0 && <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[9px]">{esperaList.length}</span>}</TabsTrigger>
              <TabsTrigger value="CONTATOS" className="text-xs">Contatos</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2">
            <TabsContent value="ATENDENDO" className="m-0 h-full flex flex-col space-y-1">
              {atendendoList.length === 0 && !loadingList && (
                <div className="flex flex-col items-center justify-center p-8 text-slate-400 gap-2 h-full">
                  <CheckCircle className="w-8 h-8 opacity-20" />
                  <p className="text-xs text-center">Nenhum atendimento em andamento no momento.</p>
                </div>
              )}
              {atendendoList.map(renderConversationItem)}
            </TabsContent>

            <TabsContent value="ESPERA" className="m-0 h-full flex flex-col space-y-1">
              {esperaList.length === 0 && !loadingList && (
                <div className="flex flex-col items-center justify-center p-8 text-slate-400 gap-2 h-full">
                  <CheckCircle className="w-8 h-8 opacity-20" />
                  <p className="text-xs text-center">Ninguém aguardando na fila.</p>
                </div>
              )}
              {esperaList.map(renderConversationItem)}
            </TabsContent>

            <TabsContent value="CONTATOS" className="m-0 h-full flex flex-col space-y-2">
              <div className="flex gap-2">
                <Input 
                  placeholder="Buscar contato ou número..." 
                  className="bg-white text-xs h-8"
                  value={contatosQuery}
                  onChange={e => setContatosQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") loadContacts() }}
                />
                <Button size="icon" onClick={loadContacts} className="h-8 w-8 shrink-0">
                  <Search className="w-3 h-3" />
                </Button>
              </div>

              <div className="flex-1 space-y-1 mt-2">
                {loadingContacts ? (
                  <div className="flex justify-center p-4"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>
                ) : contatosList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center p-4">Nenhum contato encontrado.</p>
                ) : (
                  contatosList.map(c => (
                    <div key={c.id} className="p-3 bg-white border rounded-lg shadow-sm flex flex-col gap-2 hover:border-primary/30 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.whatsapp}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[9px] text-slate-500 bg-slate-50 border-slate-200">
                          {c.company?.nomeFantasia || "Sem Empresa"}
                        </Badge>
                        <Button size="sm" variant="secondary" className="h-7 text-xs bg-primary/10 text-primary hover:bg-primary/20" onClick={() => handleStartOutbound(c)}>
                          <UserPlus className="w-3 h-3 mr-1" />
                          Iniciar
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Coluna Direita - Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {activeConv ? (
          <>
            {/* Header do Chat */}
            <header className="h-[73px] border-b px-6 flex items-center justify-between bg-white shrink-0 shadow-sm z-10 relative">
              <div className="flex flex-col">
                <h3 className="font-bold text-lg tracking-tight">{activeConv.contactNameSnapshot || activeConv.contactWhatsappSnapshot}</h3>
                <span className="text-xs text-muted-foreground">{activeConv.contactWhatsappSnapshot} <Badge variant="secondary" className="ml-2 font-normal text-[10px] uppercase border-none">{activeConv.status}</Badge></span>
              </div>
              
              <div className="flex gap-2">
                {!activeConv.companyId && (
                  <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">
                        <Link2 className="w-4 h-4 mr-2" />
                        Vincular Empresa
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Vincular a uma Empresa do Portal</DialogTitle>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        <div className="flex gap-2">
                          <Input placeholder="Buscar por Nome ou CNPJ..." value={matchQuery} onChange={e => setMatchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchComps()}/>
                          <Button onClick={searchComps}><Search className="w-4 h-4"/></Button>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto space-y-2">
                          {matchResults.map(c => (
                            <div key={c.id} className="p-3 border rounded-md flex justify-between items-center">
                              <div>
                                <p className="font-medium text-sm">{c.nomeFantasia || c.razaoSocial}</p>
                                <p className="text-xs text-muted-foreground">{c.cnpj}</p>
                              </div>
                              <Button size="sm" variant="secondary" onClick={() => handleLinkCompany(c.id)} disabled={linking}>Vincular</Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                <Button variant="default" size="sm" onClick={handleResolve} className="bg-slate-800">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Finalizar
                </Button>
              </div>
            </header>

            {/* Mensagens */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 bg-[#efeae2] space-y-4">
              {loadingMessages ? (
                <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-slate-400"/></div>
              ) : (
                messages.map(msg => {
                  const isOut = msg.direction === "OUTBOUND"
                  return (
                    <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-lg p-3 ${isOut ? "bg-[#d9fdd3] text-slate-800 rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none shadow-sm"}`}>
                        
                        {msg.type === "IMAGE" && msg.mediaUrl && (
                          <img src={msg.mediaUrl} alt="Imagem recebida" className="max-w-[250px] rounded mb-2 object-cover" />
                        )}
                        {msg.type === "AUDIO" && msg.mediaUrl && (
                          <audio controls src={msg.mediaUrl} className="max-w-[250px] h-10 mb-2" />
                        )}
                        {msg.type === "DOCUMENT" && msg.mediaUrl && (
                          <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-slate-100 p-2 rounded-md mb-2 text-xs text-blue-600 hover:underline">
                            📎 Visualizar Documento
                          </a>
                        )}

                        {msg.body && <p className="text-sm whitespace-pre-wrap">{msg.body}</p>}
                        
                        <div className="text-[10px] text-right mt-1 opacity-60">
                          {new Date(msg.createdAt || msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Input Área */}
            <div className="p-4 bg-white border-t flex gap-2 items-center">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    alert('Envio de arquivo visual: ' + file.name + ' (Aguardando endpoint da API Evolution)');
                  }
                }} 
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-slate-400 hover:text-primary shrink-0" 
                onClick={() => fileInputRef.current?.click()}
                disabled={sendingMessage}
                title="Anexar arquivo ou mídia"
              >
                <Paperclip className="w-5 h-5" />
              </Button>
              <Input 
                placeholder="Digite sua mensagem para o cliente..." 
                className="flex-1"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSend() }}
                disabled={sendingMessage}
              />
              <Button onClick={handleSend} disabled={!textInput.trim() || sendingMessage} size="icon">
                {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <p>Selecione uma conversa na lateral esquerda.</p>
          </div>
        )}
      </div>
    </div>
  )
}
