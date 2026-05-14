import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from "@dosc-syspro/ui";
import { Headset, ArrowUpRight, Clock, AlertTriangle, CheckCircle2, Inbox } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/patterns";
import type { TicketSummaryItem } from "@/features/tickets/domain/ticket-model";

interface TicketsSummaryProps {
  tickets: TicketSummaryItem[];
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

export function TicketsSummary({ tickets }: TicketsSummaryProps) {
  const visibleCount = tickets.length;

  return (
    <Card className="h-full w-full border-border/60 bg-card/70 shadow-sm">
      <CardHeader className="px-5 pb-3 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Chamados recentes</CardTitle>
            {visibleCount > 0 ? (
              <CardDescription className="text-sm">Mostrando os {visibleCount} registros mais recentes.</CardDescription>
            ) : null}
          </div>
          <Link
            href="/portal/tickets"
            className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            Ver todos
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5">
        {tickets.length === 0 ? (
          <EmptyState icon={Headset} title="Sem chamados abertos" description="Tudo resolvido por aqui" className="min-h-[320px]" />
        ) : (
          <div className="space-y-1.5 min-h-[336px]">
            {tickets.map((ticket) => {
              const statusCfg = STATUS_CONFIG[ticket.status];
              const priorityCfg = PRIORITY_CONFIG[ticket.priority];
              const StatusIcon = statusCfg.icon;
              const isLatest = ticket.id === tickets[0]?.id;

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
                      {isLatest ? (
                        <Badge
                          variant="outline"
                          className="h-4 shrink-0 border-emerald-500/20 bg-emerald-500/10 px-1.5 text-[10px] text-emerald-600"
                        >
                          Mais recente
                        </Badge>
                      ) : null}
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
