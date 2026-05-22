"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { Building2, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@dosc-syspro/ui";
import { formatTicketDateTime } from "./ticket-details.helpers";
import type { TicketDetailsItem } from "./ticket-view.types";

export function SidebarField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="min-w-0 text-right wrap-break-word">{value}</div>
    </div>
  );
}

export function EditableSidebarField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function CustomerContextCard({ ticket }: { ticket: TicketDetailsItem }) {
  const customerName = ticket.companyName || ticket.origin?.contactName || "Cliente nao identificado";
  const href = ticket.companyId ? `/portal/cadastros/empresa/${ticket.companyId}/editar` : null;

  return (
    <Card className="border-border/60 bg-card/95 shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/20 text-muted-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</p>
            {href ? (
              <Link href={href} target="_blank" className="mt-0.5 inline-flex max-w-full items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                <span className="truncate">{customerName}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </Link>
            ) : (
              <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{customerName}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DetailDate({ value, fallback }: { value?: string | null; fallback: string }) {
  if (!value) return <span className="text-xs text-muted-foreground">{fallback}</span>;
  return <span className="font-mono text-xs text-muted-foreground">{formatTicketDateTime(value)}</span>;
}

export function ExternalTicketLink({
  href,
  label,
  icon: Icon = ExternalLink,
}: {
  href: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1.5 text-xs text-primary hover:underline">
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{label}</span>
    </a>
  );
}
