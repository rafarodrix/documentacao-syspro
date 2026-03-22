"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Play, Trash2 } from "lucide-react";

type SyncMode = "classTrib" | "anexos" | "credPresumido" | "ncm";

type SyncProgress = {
  inProgress: boolean;
  currentChunk: number;
  totalChunks: number;
  updatedAt: number;
  startedAt?: number;
  totalItems?: number;
  processedItems?: number;
  lastError?: string;
};

type SyncStateRow = {
  mode: SyncMode;
  label: string;
  progress: SyncProgress;
};

const MODES: Array<{ mode: SyncMode; label: string }> = [
  { mode: "classTrib", label: "classTrib" },
  { mode: "anexos", label: "anexos" },
  { mode: "credPresumido", label: "credPresumido" },
  { mode: "ncm", label: "ncm" },
];

function progressKey(mode: SyncMode) {
  return `tax-sync:progress:${mode}`;
}

function readProgress(mode: SyncMode): SyncProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(progressKey(mode));
    if (!raw) return null;
    return JSON.parse(raw) as SyncProgress;
  } catch {
    return null;
  }
}

function clearProgress(mode: SyncMode) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(progressKey(mode));
}

function formatDuration(ms: number) {
  if (ms <= 0) return "0s";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}s`;
  return `${min}m ${sec}s`;
}

export function TaxSyncStatusBar() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 1500);
    return () => window.clearInterval(id);
  }, []);

  const rows = useMemo<SyncStateRow[]>(() => {
    void tick;
    return MODES.map((entry) => {
      const progress = readProgress(entry.mode);
      return progress ? { mode: entry.mode, label: entry.label, progress } : null;
    }).filter((row): row is SyncStateRow => row !== null);
  }, [tick]);

  if (rows.length === 0) return null;

  const resumeMode = (mode: SyncMode) => {
    window.dispatchEvent(new CustomEvent("tax-sync:resume", { detail: { mode } }));
  };

  const clearMode = (mode: SyncMode) => {
    clearProgress(mode);
    setTick((v) => v + 1);
  };

  const clearAll = () => {
    MODES.forEach((item) => clearProgress(item.mode));
    setTick((v) => v + 1);
  };

  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-200">
          <AlertTriangle className="h-4 w-4" />
          Sincronizacao com estado pendente
        </div>
        <Button variant="outline" size="sm" onClick={clearAll} className="gap-2">
          <Trash2 className="h-3.5 w-3.5" />
          Limpar tudo
        </Button>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.mode} className="rounded-md border border-border/50 bg-background/60 p-2.5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{row.label}</span>
                {" - "}
                {row.progress.currentChunk}/{row.progress.totalChunks} lotes
                {" - "}
                {row.progress.inProgress ? "em andamento" : "interrompido"}
                {typeof row.progress.totalItems === "number" ? (
                  <>
                    {" - "}
                    {row.progress.processedItems ?? 0}/{row.progress.totalItems} registros
                  </>
                ) : null}
                {row.progress.lastError ? (
                  <>
                    {" - "}
                    erro: {row.progress.lastError}
                  </>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => resumeMode(row.mode)} className="gap-2">
                  <Play className="h-3.5 w-3.5" />
                  Retomar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => clearMode(row.mode)}>
                  Limpar estado
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((row.progress.currentChunk / Math.max(row.progress.totalChunks, 1)) * 100),
                    )}%`,
                  }}
                />
              </div>
              <span className="w-20 text-right text-[11px] text-muted-foreground">
                {Math.min(100, Math.round((row.progress.currentChunk / Math.max(row.progress.totalChunks, 1)) * 100))}%
              </span>
              <span className="w-24 text-right text-[11px] text-muted-foreground">
                {row.progress.inProgress && row.progress.startedAt && row.progress.currentChunk > 0
                  ? `ETA ${formatDuration(
                      ((Date.now() - row.progress.startedAt) / row.progress.currentChunk) *
                        Math.max(row.progress.totalChunks - row.progress.currentChunk, 0),
                    )}`
                  : "-"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
