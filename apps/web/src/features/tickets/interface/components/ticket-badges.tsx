import type { MouseEvent } from "react";
import { Badge, Button } from "@dosc-syspro/ui";
import { Loader2 } from "lucide-react";
import type { TicketModulePriority } from "@dosc-syspro/contracts/ticket";
import type { TicketListItem } from "./ticket-view.types";

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-accent-blue/10 text-accent-blue border-accent-blue/20",
  UNASSIGNED: "bg-muted text-muted-foreground border-border",
  TRIAGE: "bg-accent-amber/10 text-accent-amber border-accent-amber/20",
  IN_PROGRESS: "bg-accent-blue/10 text-accent-blue border-accent-blue/20",
  TESTING: "bg-accent-violet/10 text-accent-violet border-accent-violet/20",
  WAITING_CUSTOMER: "bg-accent-orange/10 text-accent-orange border-accent-orange/20",
  WAITING_INTERNAL: "bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20",
  RESOLVED: "bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20",
  ARCHIVED: "bg-muted text-muted-foreground border-border",
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

export function PriorityBadge({ priority }: { priority: TicketModulePriority }) {
  if (priority === "CRITICAL") return <Badge variant="destructive" className="text-[10px] px-2 rounded-full border-accent-red/35 bg-accent-red/20 text-accent-red">Crítica</Badge>;
  if (priority === "HIGH") return <Badge variant="destructive" className="text-[10px] px-2 rounded-full bg-accent-red/10 text-accent-red border-accent-red/20">Alta</Badge>;
  if (priority === "NORMAL") return <Badge variant="outline" className="text-[10px] px-2 text-muted-foreground rounded-full">Média</Badge>;
  return <Badge variant="secondary" className="text-[10px] px-2 rounded-full bg-muted text-muted-foreground">Baixa</Badge>;
}

export function SlaBadge({ ticket }: { ticket: TicketListItem }) {
  if (ticket.slaPaused) return <Badge variant="outline" className="text-[10px] px-2 rounded-md border-accent-orange/30 text-accent-orange">SLA pausado</Badge>;
  if (ticket.slaBreached) return <Badge variant="destructive" className="text-[10px] px-2 rounded-md">SLA estourado</Badge>;
  if (ticket.slaWarning) {
    const suffix = typeof ticket.minutesToBreach === "number" && ticket.minutesToBreach > 0 ? ` (${ticket.minutesToBreach} min)` : "";
    return (
      <Badge variant="outline" className="text-[10px] px-2 rounded-md border-accent-amber/30 text-accent-amber">
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
