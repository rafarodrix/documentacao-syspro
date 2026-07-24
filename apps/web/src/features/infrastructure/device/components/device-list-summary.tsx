"use client";

import type { DeviceLifecycleStatus, DeviceListSummary } from "@dosc-syspro/contracts";
import { Search } from "lucide-react";

type DeviceListSummaryProps = {
  summary?: DeviceListSummary | null;
  activeLifecycle: DeviceLifecycleStatus | "ALL";
  query?: string;
  totalFilteredItems: number;
};

function SummaryChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "ok" | "warn" | "danger" | "muted";
}) {
  const toneClass =
    tone === "ok"
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "warn"
        ? "text-amber-700 dark:text-amber-400"
        : tone === "danger"
          ? "text-rose-700 dark:text-rose-400"
          : tone === "muted"
            ? "text-muted-foreground"
            : "text-foreground";

  return (
    <span className={`inline-flex items-center gap-1 ${toneClass}`}>
      <strong className="font-semibold">{value}</strong>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

export function DeviceListSummaryBar({
  summary,
  activeLifecycle,
  query,
  totalFilteredItems,
}: DeviceListSummaryProps) {
  if (query && query.trim()) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Search className="h-3.5 w-3.5 text-primary" />
        <span>
          <strong className="font-semibold text-foreground">{totalFilteredItems}</strong> resultado
          {totalFilteredItems === 1 ? "" : "s"} para “{query.trim()}”
        </span>
      </div>
    );
  }

  if (activeLifecycle === "AWAITING_LINK") {
    return (
      <div className="text-xs font-medium text-amber-700 dark:text-amber-400">
        <strong className="font-bold">{totalFilteredItems}</strong> dispositivo
        {totalFilteredItems === 1 ? "" : "s"} aguardando empresa
      </div>
    );
  }

  if (activeLifecycle === "DISCOVERED") {
    return (
      <div className="text-xs font-medium text-sky-700 dark:text-sky-400">
        <strong className="font-bold">{totalFilteredItems}</strong> dispositivo
        {totalFilteredItems === 1 ? "" : "s"} descoberto{totalFilteredItems === 1 ? "" : "s"}
      </div>
    );
  }

  if (activeLifecycle === "ARCHIVED") {
    return (
      <div className="text-xs font-medium text-muted-foreground">
        <strong className="font-bold">{totalFilteredItems}</strong> dispositivo
        {totalFilteredItems === 1 ? "" : "s"} arquivado{totalFilteredItems === 1 ? "" : "s"}
      </div>
    );
  }

  const online = summary?.online ?? 0;
  const stale = summary?.stale ?? 0;
  const offline = summary?.offline ?? 0;
  const healthy = summary?.healthy ?? 0;
  const warning = summary?.warning ?? 0;
  const critical = summary?.critical ?? 0;

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
      <span>
        <strong className="font-semibold text-foreground">{totalFilteredItems}</strong> resultado
        {totalFilteredItems === 1 ? "" : "s"}
      </span>
      <span className="text-border">·</span>
      <SummaryChip label="online" value={online} tone="ok" />
      {stale > 0 ? (
        <>
          <span className="text-border">·</span>
          <SummaryChip label="stale" value={stale} tone="warn" />
        </>
      ) : null}
      <span className="text-border">·</span>
      <SummaryChip label="offline" value={offline} tone="danger" />
      {(warning > 0 || critical > 0) && (
        <>
          <span className="text-border">·</span>
          <SummaryChip label="saudável" value={healthy} tone="ok" />
          {warning > 0 ? (
            <>
              <span className="text-border">·</span>
              <SummaryChip label="atenção" value={warning} tone="warn" />
            </>
          ) : null}
          {critical > 0 ? (
            <>
              <span className="text-border">·</span>
              <SummaryChip label="crítico" value={critical} tone="danger" />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
