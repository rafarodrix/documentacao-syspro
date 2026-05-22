"use client";

import { Timer } from "lucide-react";
import { Badge, Progress } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";
import { formatSlaDelta, formatTicketDateTime } from "./ticket-details.helpers";
import { SidebarField } from "./ticket-sidebar-fields";
import type { TicketDetailsItem } from "./ticket-view.types";

export function SlaCompact({ ticket, isClosedTicket }: { ticket: TicketDetailsItem; isClosedTicket: boolean }) {
  if (!ticket.slaResolutionDueAt || isClosedTicket) {
    return (
      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">SLA</p>
        <span className="text-xs text-muted-foreground">Sem SLA ativo</span>
      </section>
    );
  }

  const tone = ticket.slaPaused ? "paused" : ticket.slaBreached ? "danger" : ticket.slaWarning ? "warning" : "ok";
  const label = ticket.slaPaused ? "Pausado" : formatSlaDelta(ticket.minutesToBreach);
  const progress = ticket.slaPaused ? 50 : ticket.slaBreached ? 100 : ticket.slaWarning ? 85 : 30;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Timer
            className={cn(
              "h-3.5 w-3.5",
              tone === "danger" ? "text-rose-500" : tone === "warning" || tone === "paused" ? "text-amber-500" : "text-emerald-500", // ds-allow
            )}
          />
          SLA
        </p>
        <Badge
          variant="outline"
          className={cn(
            "rounded-full px-2 text-[10px]",
            tone === "danger" && "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400", // ds-allow
            tone === "warning" && "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400", // ds-allow
            tone === "paused" && "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400", // ds-allow
            tone === "ok" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", // ds-allow
          )}
        >
          {label}
        </Badge>
      </div>
      <Progress
        value={progress}
        className={cn(
          "h-2",
          tone === "danger" && "bg-rose-200 *:bg-rose-500", // ds-allow
          tone === "warning" && "bg-amber-200 *:bg-amber-500", // ds-allow
          tone === "paused" && "bg-orange-100 *:bg-orange-500", // ds-allow
          tone === "ok" && "bg-emerald-100 *:bg-emerald-500", // ds-allow
        )}
      />
      <SidebarField
        label="Vence em"
        value={<span className="font-mono text-xs text-muted-foreground">{formatTicketDateTime(ticket.slaResolutionDueAt)}</span>}
      />
    </section>
  );
}
