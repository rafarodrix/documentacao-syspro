import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Headset, ArrowUpRight, Clock, AlertTriangle, CheckCircle2, Inbox } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TicketSummaryItem } from "@/features/tickets/domain/ticket-model";

interface TicketsSummaryProps {
  tickets: TicketSummaryItem[];
  totalOpen: number;
}

const STATUS_CONFIG = {
  Aberto: { icon: Inbox, color: "text-blue-500", bg: "bg-blue-500/10", label: "Aberto" },
  "Em Análise": { icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", label: "Em Análise" },
  Pendente: { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10", label: "Pendente" },
  Resolvido: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Resolvido" },
} as const;

const PRIORITY_CONFIG = {
  Alta: { class: "bg-red-500/10 text-red-600 border-red-500/20" },
  Média: { class: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  Baixa: { class: "bg-muted text-muted-foreground border-border" },
} as const;

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
  if (diff < 60) return `${diff}min atras`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h atras`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function TicketsSummary({ tickets, totalOpen }: TicketsSummaryProps) {
  return (
    <Card className="h-full w-full border-border/50 bg-card/70">
      <CardHeader className="pb-3 px-5 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Chamados Recentes</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {totalOpen > 0 ? (
                <>
                  <span className="text-foreground font-medium">{totalOpen}</span> em aberto
                </>
              ) : (
                "Nenhum chamado em aberto"
              )}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" asChild>
            <Link href="/portal/tickets">
              Ver todos
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5">
        {tickets.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center border border-border">
              <Headset className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-sm font-medium">Sem chamados abertos</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tudo resolvido por aqui</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {tickets.map((ticket) => {
              const statusCfg = STATUS_CONFIG[ticket.status];
              const priorityCfg = PRIORITY_CONFIG[ticket.priority];
              const StatusIcon = statusCfg.icon;

              return (
                <Link
                  key={ticket.id}
                  href={`/portal/tickets/${ticket.id}`}
                  className="group flex items-center gap-3 rounded-xl border border-border/40 bg-background/35 px-3 py-3 transition-colors hover:border-border/70 hover:bg-muted/40"
                >
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", statusCfg.bg)}>
                    <StatusIcon className={cn("h-4 w-4", statusCfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate leading-tight">{ticket.subject}</span>
                      <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 shrink-0 border", priorityCfg.class)}>
                        {ticket.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground font-mono">#{ticket.number}</span>
                      <span className="text-muted-foreground/30">.</span>
                      <span className={cn("text-[11px]", statusCfg.color)}>{statusCfg.label}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">{formatDate(ticket.lastUpdate)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
