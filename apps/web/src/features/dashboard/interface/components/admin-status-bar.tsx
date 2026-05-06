"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type SefazHealth = "online" | "unstable" | "offline" | "unknown";

type Summary = {
  ticketCounts: {
    total: number;
    waiting: number;
    inProgress: number;
  };
  sefazHealth: SefazHealth;
  sefazRoutesCount: number;
};

const roleLabels: Record<string, string> = {
  ADMIN: "Administrador",
  DEVELOPER: "Desenvolvedor",
  SUPORTE: "Suporte",
};

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

export function AdminStatusBar({ role }: { role: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/operacional")
      .then((r) => r.json())
      .then((body) => {
        if (body?.success && body.data) setSummary(body.data);
      })
      .catch(() => null);
  }, []);

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/20 px-4 py-2.5 text-xs">
      {/* Escopo */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Visao</span>
          <span className="font-semibold text-foreground">{roleLabels[role] ?? role}</span>
        </div>

        {summary ? (
          <>
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
              <span className={cn("h-1.5 w-1.5 rounded-full", sefazDot[summary.sefazHealth])} />
              <span className={cn("font-medium", sefazColor[summary.sefazHealth])}>
                SEFAZ {sefazLabel[summary.sefazHealth]}
              </span>
              <span className="text-muted-foreground">
                · {summary.sefazRoutesCount} rota{summary.sefazRoutesCount !== 1 ? "s" : ""}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="h-3.5 w-px bg-border/60" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted/60" />
            <div className="h-3.5 w-px bg-border/60" />
            <div className="h-3 w-28 animate-pulse rounded bg-muted/60" />
          </>
        )}
      </div>

      {/* Data */}
      <span className="capitalize text-muted-foreground">{today}</span>
    </div>
  );
}
