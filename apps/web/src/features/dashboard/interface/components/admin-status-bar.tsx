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
  let healthTone = "border-emerald-500/20 bg-emerald-500/10 text-emerald-500";
  let HealthIcon = CheckCircle2;

  if (summary.sefazHealth === "offline") {
    healthLabel = "Crítico (SEFAZ offline)";
    healthTone = "border-red-500/20 bg-red-500/10 text-red-500";
    HealthIcon = ShieldAlert;
  } else if (waitingTickets > 5 || summary.sefazHealth === "unstable") {
    healthLabel = "Atenção requerida";
    healthTone = "border-amber-500/20 bg-amber-500/10 text-amber-500";
    HealthIcon = ShieldAlert;
  }

  return (
    <div className="sticky top-0 z-30 shrink-0 -mx-4 flex flex-wrap items-center justify-between gap-4 border-b border-border/50 bg-background/95 px-4 py-3 shadow-xs backdrop-blur-md transition-all duration-300 sm:-mx-6 sm:px-6">
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
            {" | "}
            {summary.sefazRoutesCount} rota{summary.sefazRoutesCount !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="hidden h-3.5 w-px bg-border/60 sm:block" />
        <div className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", healthTone)}>
          <HealthIcon className="h-3 w-3" />
          <span>Saude: {healthLabel}</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3 sm:ml-0">
        <span className="mr-2 hidden text-[10px] capitalize text-muted-foreground xl:inline-block">{today}</span>

        <Button variant="outline" size="sm" className="h-7 gap-1 px-2.5 text-[11px] font-medium" asChild>
          <Link href="/portal/tickets/novo">
            <Plus className="h-3 w-3" />
            <Ticket className="h-3 w-3 text-muted-foreground" />
            Novo Ticket
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="h-7 gap-1 px-2.5 text-[11px] font-medium" asChild>
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
