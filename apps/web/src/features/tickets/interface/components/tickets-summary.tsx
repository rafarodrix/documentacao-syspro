import { Card, CardContent, CardHeader, CardTitle, Badge } from "@dosc-syspro/ui";
import { Headset, ArrowUpRight, Clock, AlertTriangle, CheckCircle2, Inbox } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatRelativeDate } from "@/lib/date";
import { StaticEmptyState } from "@/components/patterns";
import type { TicketSummaryItem } from "@/features/tickets/domain/ticket-model";

import type { TicketModulePriority, TicketModuleStatus } from "@dosc-syspro/contracts/ticket";

interface TicketsSummaryProps {
  tickets: TicketSummaryItem[];
}

const STATUS_CONFIG: Record<TicketModuleStatus, { icon: any; color: string; bg: string; label: string }> = {
  NEW: { icon: Inbox, color: "text-accent-blue", bg: "bg-accent-blue/10", label: "Novo" },
  UNASSIGNED: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted", label: "Sem dono" },
  TRIAGE: { icon: Clock, color: "text-accent-amber", bg: "bg-accent-amber/10", label: "Em triagem" },
  IN_PROGRESS: { icon: Clock, color: "text-accent-blue", bg: "bg-accent-blue/10", label: "Em andamento" },
  WAITING_CUSTOMER: { icon: AlertTriangle, color: "text-accent-orange", bg: "bg-accent-orange/10", label: "Aguardando cliente" },
  WAITING_INTERNAL: { icon: AlertTriangle, color: "text-accent-yellow", bg: "bg-accent-yellow/10", label: "Aguardando interno" },
  TESTING: { icon: Clock, color: "text-accent-violet", bg: "bg-accent-violet/10", label: "Em testes" },
  RESOLVED: { icon: CheckCircle2, color: "text-accent-emerald", bg: "bg-accent-emerald/10", label: "Resolvido" },
  ARCHIVED: { icon: CheckCircle2, color: "text-muted-foreground", bg: "bg-muted", label: "Arquivado" },
} as const;

const PRIORITY_CONFIG: Record<TicketModulePriority, { class: string; label: string }> = {
  CRITICAL: { class: "bg-accent-red/15 text-accent-red border-accent-red/30 font-bold", label: "Crítica" },
  HIGH: { class: "bg-accent-red/10 text-accent-red border-accent-red/20", label: "Alta" },
  NORMAL: { class: "bg-accent-amber/10 text-accent-amber border-accent-amber/20", label: "Média" },
  LOW: { class: "bg-muted text-muted-foreground border-border", label: "Baixa" },
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
          <StaticEmptyState icon={Headset} title="Sem chamados abertos" description="Tudo resolvido por aqui" className="min-h-[320px]" />
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
                          className="h-4 shrink-0 border-accent-emerald/20 bg-accent-emerald/10 px-1.5 text-[10px] text-accent-emerald"
                        >
                          Mais recente
                        </Badge>
                      ) : null}
                      <Badge variant="outline" className={cn("h-4 shrink-0 border px-1.5 text-[10px]", priorityCfg.class)}>
                        {priorityCfg.label}
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
