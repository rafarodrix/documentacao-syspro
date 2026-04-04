"use client"

import React, { useState, useEffect, useRef } from "react"
import { 
  getConversations, 
  getConversationMessages, 
  sendConversationMessage, 
  resolveConversation, 
  linkConversationToCompany,
  searchCompanies
} from "@/features/conversations/application/conversation-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, Send, CheckCircle, Search, Link2, Building, MessageSquare } from "lucide-react"

export default function ConversasOmnichannelPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [activeConv, setActiveConv] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  
  const [loadingList, setLoadingList] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  
  const [textInput, setTextInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  // Vinculo States
  const [matchQuery, setMatchQuery] = useState("")
  const [matchResults, setMatchResults] = useState<any[]>([])
  const [linking, setLinking] = useState(false)
  const [matchDialogOpen, setMatchDialogOpen] = useState(false)

  const loadList = async () => {
    const res = await getConversations()
    if (res.data) setConversations(res.data)
    setLoadingList(false)
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
    loadList()
    const int = setInterval(loadList, 10000)
    return () => clearInterval(int)
  }, [])

  const handleSelectConv = (conv: any) => {
    setActiveConv(conv)
    loadMessages(conv.id)
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
    await loadList()
    setSendingMessage(false)
  }

  const handleResolve = async () => {
    if (!activeConv) return
    if(confirm("Deseja realmente finalizar este atendimento?")) {
      await resolveConversation(activeConv.id)
      setActiveConv(null)
      loadList()
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
    loadList()
    
    setActiveConv((prev: any) => ({ ...prev, companyId }))
  }

  return (
    <div className="flex h-[calc(100vh-80px)] w-full">
      {/* Coluna Esquerda - Lista de Conversas */}
      <div className="w-[350px] border-r bg-slate-50 overflow-y-auto flex flex-col">
        <div className="p-4 border-b bg-white sticky top-0 z-10 flex items-center justify-between">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Caixa de Entrada
          </h2>
          {loadingList && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
        
        <div className="flex-1 p-2 space-y-1">
          {conversations.length === 0 && !loadingList && (
            <p className="p-4 text-center text-sm text-muted-foreground">Nenhuma conversa pendente.</p>
          )}
          {conversations.map(conv => (
            <button 
              key={conv.id}
              onClick={() => handleSelectConv(conv)}
              className={`w-full text-left p-3 rounded-lg transition-colors border ${activeConv?.id === conv.id ? "bg-primary/5 border-primary/20" : "bg-white hover:bg-slate-100 border-transparent shadow-sm"}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-sm truncate">
                  {conv.contactNameSnapshot || conv.contactWhatsappSnapshot || "Desconhecido"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(conv.lastMessageAt || conv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex gap-2 items-center mb-1">
                {conv.companyId ? (
                  <Badge variant="secondary" className="text-[10px] w-fit flex gap-1 bg-green-100 text-green-800 hover:bg-green-100"><Building className="w-3 h-3"/> VINCULADO</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] w-fit text-amber-600 border-amber-300 bg-amber-50">NÃO IDENTIFICADO</Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">
                {conv.lastMessagePreview || "Iniciou uma conversa..."}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Coluna Direita - Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {activeConv ? (
          <>
            {/* Header do Chat */}
            <header className="h-16 border-b px-6 flex items-center justify-between bg-white shrink-0">
              <div className="flex flex-col">
                <h3 className="font-semibold">{activeConv.contactNameSnapshot || activeConv.contactWhatsappSnapshot}</h3>
                <span className="text-xs text-muted-foreground">{activeConv.contactWhatsappSnapshot}</span>
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
                        <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
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
