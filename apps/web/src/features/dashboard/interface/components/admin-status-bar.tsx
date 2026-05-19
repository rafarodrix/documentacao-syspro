import { cn } from "@/lib/utils";
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
  unstable: "Instavel",
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
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 bg-card px-4 py-2.5 text-xs">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Visao</span>
          <span className="font-semibold text-foreground">Operacao interna</span>
        </div>

        <div className="h-3.5 w-px bg-border/60" />
        <div className="flex items-center gap-1.5">
          <span className="tabular-nums font-semibold text-foreground">{summary.ticketCounts.total}</span>
          <span className="text-muted-foreground">tickets abertos</span>
          {summary.ticketCounts.waiting > 0 ? (
            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">
              {summary.ticketCounts.waiting} aguardando
            </span>
          ) : null}
        </div>

        <div className="h-3.5 w-px bg-border/60" />
        <div className="flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", sefazDot[summary.sefazHealth as SefazHealth])} />
          <span className={cn("font-medium", sefazColor[summary.sefazHealth as SefazHealth])}>
            SEFAZ {sefazLabel[summary.sefazHealth as SefazHealth]}
          </span>
          <span className="text-muted-foreground">
            · {summary.sefazRoutesCount} rota{summary.sefazRoutesCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <span className="capitalize text-muted-foreground">{today}</span>
    </div>
  );
}
