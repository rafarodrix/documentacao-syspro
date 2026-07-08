import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDateLong } from "@/lib/date";
import { Button } from "@dosc-syspro/ui";
import { Plus, Ticket, Building2, ShieldAlert, CheckCircle2 } from "lucide-react";
import type { AdminOperacionalData } from "@dosc-syspro/contracts/dashboard";

type SefazHealth = "online" | "unstable" | "offline" | "unknown";

const sefazDot: Record<SefazHealth, string> = {
  online: "bg-emerald-500",
  unstable: "animate-pulse bg-amber-500",
  offline: "animate-pulse bg-red-500",
  unknown: "bg-muted-foreground/40",
};

const sefazLabel: Record<SefazHealth, string> = {
  online: "Operacional",
  unstable: "Instável",
  offline: "Offline",
  unknown: "Sem dados",
};

const sefazColor: Record<SefazHealth, string> = {
  online: "text-emerald-500",
  unstable: "text-amber-500",
  offline: "text-red-500",
  unknown: "text-muted-foreground",
};

export function AdminStatusBar({
  summary,
}: {
  summary: Pick<AdminOperacionalData, "ticketCounts" | "sefazHealth" | "sefazRoutesCount">;
}) {
  const today = formatDateLong(new Date());

  const waitingTickets = summary.ticketCounts.waiting;
  
  let healthLabel = "Excelente";
  let healthTone = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  let HealthIcon = CheckCircle2;

  if (summary.sefazHealth === "offline") {
    healthLabel = "Crítico (SEFAZ Offline)";
    healthTone = "bg-red-500/10 text-red-500 border-red-500/20";
    HealthIcon = ShieldAlert;
  } else if (waitingTickets > 5 || summary.sefazHealth === "unstable") {
    healthLabel = "Atenção Requerida";
    healthTone = "bg-amber-500/10 text-amber-500 border-amber-500/20";
    HealthIcon = ShieldAlert;
  }

  return (
    <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 border-b border-border/50 bg-background/80 backdrop-blur-md -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 shadow-xs transition-all duration-300">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Visão</span>
          <span className="font-semibold text-foreground">Operação interna</span>
        </div>

        <div className="hidden h-3.5 w-px bg-border/60 sm:block" />
        <div className="flex items-center gap-1.5 text-xs">
          <span className="tabular-nums font-semibold text-foreground">{summary.ticketCounts.total}</span>
          <span className="text-muted-foreground">tickets abertos</span>
          {waitingTickets > 0 ? (
            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">
              {waitingTickets} aguardando
            </span>
          ) : null}
        </div>

        <div className="hidden h-3.5 w-px bg-border/60 sm:block" />
        <div className="flex items-center gap-1.5 text-xs">
          <span className={cn("h-1.5 w-1.5 rounded-full", sefazDot[summary.sefazHealth as SefazHealth])} />
          <span className={cn("font-medium", sefazColor[summary.sefazHealth as SefazHealth])}>
            SEFAZ {sefazLabel[summary.sefazHealth as SefazHealth]}
          </span>
          <span className="text-muted-foreground">
            · {summary.sefazRoutesCount} rota{summary.sefazRoutesCount !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="hidden h-3.5 w-px bg-border/60 sm:block" />
        <div className={cn("flex items-center gap-1 border px-2 py-0.5 rounded-full text-[10px] font-medium", healthTone)}>
          <HealthIcon className="h-3 w-3" />
          <span>Saúde: {healthLabel}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto sm:ml-0">
        <span className="hidden capitalize text-[10px] text-muted-foreground xl:inline-block mr-2">{today}</span>
        
        <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] font-medium gap-1" asChild>
          <Link href="/portal/tickets/novo">
            <Plus className="h-3 w-3" />
            <Ticket className="h-3 w-3 text-muted-foreground" />
            Novo Ticket
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] font-medium gap-1" asChild>
          <Link href="/portal/cadastros/empresa/novo">
            <Plus className="h-3 w-3" />
            <Building2 className="h-3 w-3 text-muted-foreground" />
            Nova Empresa
          </Link>
        </Button>
      </div>
    </div>
  );
}
