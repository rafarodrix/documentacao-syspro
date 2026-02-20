// src/components/platform/app/dashboard/TicketsSummary.tsx
// Server Component — chamados reais via Zammad Gateway

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Headset, ArrowUpRight, Clock, AlertTriangle, CheckCircle2, Inbox } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface TicketSummaryItem {
  id: string
  number: string
  subject: string
  status: "Aberto" | "Em Análise" | "Pendente" | "Resolvido"
  priority: "Alta" | "Média" | "Baixa"
  lastUpdate: string // ISO string
}

interface TicketsSummaryProps {
  tickets: TicketSummaryItem[]
  /** Para admins: contagem global. Para clientes: chamados do usuário */
  totalOpen: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  "Aberto":     { icon: Inbox,        color: "text-blue-500",    bg: "bg-blue-500/10",   label: "Aberto" },
  "Em Análise": { icon: Clock,        color: "text-amber-500",   bg: "bg-amber-500/10",  label: "Em Análise" },
  "Pendente":   { icon: AlertTriangle,color: "text-orange-500",  bg: "bg-orange-500/10", label: "Pendente" },
  "Resolvido":  { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10",label: "Resolvido" },
}

const PRIORITY_CONFIG = {
  "Alta":  { class: "bg-red-500/10 text-red-600 border-red-500/20" },
  "Média": { class: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  "Baixa": { class: "bg-muted text-muted-foreground border-border" },
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60)
  if (diff < 60) return `${diff}min atrás`
  if (diff < 1440) return `${Math.floor(diff / 60)}h atrás`
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function TicketsSummary({ tickets, totalOpen }: TicketsSummaryProps) {
  return (
    <Card className="col-span-4 border-border/50">
      <CardHeader className="pb-3 px-5 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Chamados Recentes</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {totalOpen > 0
                ? <><span className="text-foreground font-medium">{totalOpen}</span> em aberto</>
                : "Nenhum chamado em aberto"
              }
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" asChild>
            <Link href="/app/chamados">
              Ver todos
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[120px] gap-3 text-center">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center border border-border">
              <Headset className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-sm font-medium">Sem chamados abertos</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tudo resolvido por aqui 🎉</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {tickets.map((ticket) => {
              const statusCfg = STATUS_CONFIG[ticket.status]
              const priorityCfg = PRIORITY_CONFIG[ticket.priority]
              const StatusIcon = statusCfg.icon

              return (
                <Link
                  key={ticket.id}
                  href={`/app/chamados/${ticket.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 -mx-1 rounded-lg hover:bg-muted/60 transition-colors group"
                >
                  {/* Status icon */}
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0", statusCfg.bg)}>
                    <StatusIcon className={cn("h-4 w-4", statusCfg.color)} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate leading-tight">
                        {ticket.subject}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 flex-shrink-0 border", priorityCfg.class)}>
                        {ticket.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground font-mono">#{ticket.number}</span>
                      <span className="text-muted-foreground/30">·</span>
                      <span className={cn("text-[11px]", statusCfg.color)}>{statusCfg.label}</span>
                    </div>
                  </div>

                  <span className="text-[11px] text-muted-foreground flex-shrink-0">
                    {formatDate(ticket.lastUpdate)}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
