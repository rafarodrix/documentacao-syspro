"use client";

import { CheckCircle2, Loader2, Server, TriangleAlert } from "lucide-react";
import { Badge } from "@dosc-syspro/ui";

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function StatusTile({
  label,
  ok,
  okText,
  failText,
}: {
  label: string;
  ok: boolean;
  okText: string;
  failText: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <Badge
        variant="outline"
        className={ok ? "mt-2 border-emerald-500/40 text-emerald-600" : "mt-2 border-amber-500/40 text-amber-600"} // ds-allow
      >
        {ok ? okText : failText}
      </Badge>
    </div>
  );
}

export function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 break-all text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export function StatusLine({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-sm">
      <span className="flex items-center gap-2">
        <Server className="h-4 w-4 text-muted-foreground" />
        {label}
      </span>
      <span className={ok ? "inline-flex items-center gap-1 text-emerald-600" : "inline-flex items-center gap-1 text-amber-600"}> {/* ds-allow */}
        {ok ? <CheckCircle2 className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
        {ok ? "OK" : "Pendente"}
      </span>
    </div>
  );
}
