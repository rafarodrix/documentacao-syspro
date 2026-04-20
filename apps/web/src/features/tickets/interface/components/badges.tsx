import type { MouseEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TicketListItem, TicketPriorityLevel } from "./types";

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800",
  UNASSIGNED: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
  TRIAGE: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  TESTING: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800",
  WAITING_CUSTOMER: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
  WAITING_INTERNAL: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  RESOLVED: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  ARCHIVED: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
} as const;

export function StatusBadge({ status, rawStatus }: { status?: string | null; rawStatus?: string | null }) {
  const resolvedStatus = typeof status === "string" ? status : "";
  const resolvedRawStatus = typeof rawStatus === "string" ? rawStatus : "";
  const style = STATUS_STYLES[resolvedRawStatus] ?? "bg-muted text-muted-foreground border-border";
  const label = (resolvedStatus || resolvedRawStatus || "Sem status").replace(/^\d+\.\s*/, "");
  return (
    <Badge variant="outline" className={`border ${style} font-medium px-2.5 py-0.5 rounded-md text-[10px] whitespace-nowrap`}>
      {label}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriorityLevel }) {
  if (priority === 3) return <Badge variant="destructive" className="text-[10px] px-2 rounded-full">Alta</Badge>;
  if (priority === 1) return <Badge variant="secondary" className="text-[10px] px-2 rounded-full bg-muted text-muted-foreground">Baixa</Badge>;
  return <Badge variant="outline" className="text-[10px] px-2 text-muted-foreground rounded-full">Normal</Badge>;
}

export function SlaBadge({ ticket }: { ticket: TicketListItem }) {
  if (ticket.slaPaused) return <Badge variant="outline" className="text-[10px] px-2 rounded-md border-orange-500/50 text-orange-600 dark:text-orange-400">SLA pausado</Badge>;
  if (ticket.slaBreached) return <Badge variant="destructive" className="text-[10px] px-2 rounded-md">SLA estourado</Badge>;
  if (ticket.slaWarning) {
    const suffix = typeof ticket.minutesToBreach === "number" && ticket.minutesToBreach > 0 ? ` (${ticket.minutesToBreach} min)` : "";
    return (
      <Badge variant="outline" className="text-[10px] px-2 rounded-md border-amber-500/50 text-amber-600 dark:text-amber-400">
        SLA alerta{suffix}
      </Badge>
    );
  }
  if (ticket.firstResponseAt) return <Badge variant="secondary" className="text-[10px] px-2 rounded-md">Respondido</Badge>;
  return <Badge variant="outline" className="text-[10px] px-2 rounded-md">No prazo</Badge>;
}

export function QuickButton({ label, pending, onClick }: { label: string; pending: boolean; onClick: (e?: MouseEvent) => void }) {
  return (
    <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={(e) => { e.stopPropagation(); onClick(e); }} disabled={pending}>
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : label}
    </Button>
  );
}
