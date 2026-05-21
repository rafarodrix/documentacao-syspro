import { Card, CardContent, CardHeader, CardTitle, Badge } from "@dosc-syspro/ui";
import { Headset, ArrowUpRight, Clock, AlertTriangle, CheckCircle2, Inbox } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatRelativeDate } from "@/lib/date";
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
  return formatRelativeDate(iso, "N/D");
}

export function TicketsSummary({ tickets }: TicketsSummaryProps) {
  return (
    <Card className="h-full w-full border-border/60 bg-card/70 shadow-sm">
      <CardHeader className="px-5 pb-3 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">Chamados recentes</CardTitle>
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
          <div className="min-h-[336px] space-y-1.5">
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
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", statusCfg.bg)}>
                    <StatusIcon className={cn("h-4 w-4", statusCfg.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium leading-tight">{ticket.subject}</span>
                      {isLatest ? (
                        <Badge
                          variant="outline"
                          className="h-4 shrink-0 border-emerald-500/20 bg-emerald-500/10 px-1.5 text-[10px] text-emerald-600"
                        >
                          Mais recente
                        </Badge>
                      ) : null}
                      <Badge variant="outline" className={cn("h-4 shrink-0 border px-1.5 text-[10px]", priorityCfg.class)}>
                        {ticket.priority}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">#{ticket.number}</span>
                      <span className="text-muted-foreground/30">.</span>
                      <span className={cn("text-[11px]", statusCfg.color)}>{statusCfg.label}</span>
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{formatDate(ticket.lastUpdate)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
