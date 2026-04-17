import { Badge } from "@/components/ui/badge";
import { getTicketStatusGroup } from "@dosc-syspro/core";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TicketListItem, TicketPriorityLevel } from "./types";

const STATUS_STYLES = {
  open: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  pending: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  closed: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
} as const;

export function StatusBadge({ status, rawStatus }: { status?: string | null; rawStatus?: string | null }) {
  const resolvedStatus = typeof status === "string" ? status : "";
  const resolvedRawStatus = typeof rawStatus === "string" ? rawStatus : "";
  const category = getTicketStatusGroup(resolvedRawStatus || resolvedStatus);
  const style = STATUS_STYLES[category];
  const label = (resolvedStatus || resolvedRawStatus || "Sem status").replace(/^\d+\.\s*/, "");
  return (
    <Badge variant="outline" className={`border ${style} font-medium px-2.5 py-0.5 rounded-full text-[10px] whitespace-nowrap`}>
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
  if (ticket.slaBreached) return <Badge variant="destructive" className="text-[10px] px-2 rounded-full">SLA estourado</Badge>;
  if (ticket.slaWarning) {
    const suffix = typeof ticket.minutesToBreach === "number" && ticket.minutesToBreach > 0 ? ` (${ticket.minutesToBreach} min)` : "";
    return (
      <Badge variant="outline" className="text-[10px] px-2 rounded-full border-amber-500/50 text-amber-400">
        SLA alerta{suffix}
      </Badge>
    );
  }
  if (ticket.firstResponseAt) return <Badge variant="secondary" className="text-[10px] px-2 rounded-full">Respondido</Badge>;
  return <Badge variant="outline" className="text-[10px] px-2 rounded-full">No prazo</Badge>;
}

export function QuickButton({ label, pending, onClick }: { label: string; pending: boolean; onClick: (e?: React.MouseEvent) => void }) {
  return (
    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onClick(e); }} disabled={pending}>
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : label}
    </Button>
  );
}
