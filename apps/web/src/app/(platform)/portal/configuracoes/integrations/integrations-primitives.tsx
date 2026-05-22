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
    <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      {/* ds-allow */}
      <Badge
        variant="outline"
        className={
          ok
            ? "mt-2 border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/10"
            : "mt-2 border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 dark:bg-amber-500/10"
        }
      >
        {ok ? okText : failText}
      </Badge>
    </div>
  );
}

export function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 break-all text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export function StatusLine({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card px-3 py-2.5 text-sm shadow-sm">
      <span className="flex items-center gap-2 font-medium">
        <Server className="h-4 w-4 text-muted-foreground" />
        {label}
      </span>
      {/* ds-allow */}
      <span
        className={
          ok
            ? "inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400"
            : "inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400"
        }
      >
        {ok ? <CheckCircle2 className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
        {ok ? "OK" : "Pendente"}
      </span>
    </div>
  );
}
