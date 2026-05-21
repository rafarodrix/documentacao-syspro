import { Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardSefazStatus } from "@dosc-syspro/contracts/dashboard";
import { LatencySparkline } from "./latency-sparkline";
import { differenceInMinutes } from "@/lib/date";

type SefazStatusKey = "ONLINE" | "UNSTABLE" | "OFFLINE";

const SEFAZ_STATUS_MAP: Record<SefazStatusKey, { label: string; color: string; dot: string }> = {
  ONLINE: { label: "Operacional", color: "text-emerald-500", dot: "bg-emerald-500" },
  UNSTABLE: { label: "Instavel", color: "text-amber-500", dot: "bg-amber-500" },
  OFFLINE: { label: "Indisponivel", color: "text-red-500", dot: "bg-red-500" },
};

const DISABLED_STATUS = {
  label: "Desativado",
  color: "text-muted-foreground",
  dot: "bg-muted-foreground/50",
};

const NO_READING_STATUS = {
  label: "Sem leitura",
  color: "text-slate-400",
  dot: "bg-slate-400",
};

function formatDuration(isoDate: string): string {
  const totalMinutes = differenceInMinutes(new Date(), isoDate);
  if (totalMinutes < 1) return "agora";
  if (totalMinutes < 60) return `${totalMinutes}min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

interface SefazStatusWidgetProps {
  title: string;
  nfe: DashboardSefazStatus | undefined;
  nfce: DashboardSefazStatus | undefined;
  nfeActive?: boolean;
  nfceActive?: boolean;
}

export function SefazStatusWidget({
  title,
  nfe,
  nfce,
  nfeActive = true,
  nfceActive = true,
}: SefazStatusWidgetProps) {
  const nfeStatus = !nfeActive
    ? DISABLED_STATUS
    : nfe
      ? SEFAZ_STATUS_MAP[nfe.status as SefazStatusKey]
      : NO_READING_STATUS;
  const nfceStatus = !nfceActive
    ? DISABLED_STATUS
    : nfce
      ? SEFAZ_STATUS_MAP[nfce.status as SefazStatusKey]
      : NO_READING_STATUS;

  const hasDegradation =
    (nfeActive && Boolean(nfe?.status) && nfe?.status !== "ONLINE") ||
    (nfceActive && Boolean(nfce?.status) && nfce?.status !== "ONLINE");

  return (
    <Card className={cn("border-border/50 bg-card", hasDegradation && "border-amber-500/30")}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4 text-amber-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <StatusRow
          label="NFe"
          active={nfeActive}
          status={nfeStatus}
          record={nfe}
        />
        <StatusRow
          label="NFC-e"
          active={nfceActive}
          status={nfceStatus}
          record={nfce}
          className="border-t border-border/60 pt-3"
        />
      </CardContent>
    </Card>
  );
}

function StatusRow({
  label,
  active,
  status,
  record,
  className,
}: {
  label: string;
  active: boolean;
  status: { label: string; color: string; dot: string };
  record?: DashboardSefazStatus;
  className?: string;
}) {
  const duration = record?.changedAt ? formatDuration(record.changedAt) : null;
  const uptimePct = record?.uptimePct;
  const incidentCount = record?.incidentCount;
  const latencyHistory = record?.latencyHistory ?? [];
  const rawStatus = record?.status;
  const latency = record?.latency;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              {rawStatus === "ONLINE" ? (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              ) : null}
              <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", status.dot)} />
            </span>
            <span className={cn("text-sm font-semibold", status.color)}>{status.label}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="font-mono text-xs text-muted-foreground">
            {!active ? "Desativado" : !latency || rawStatus === "OFFLINE" ? "Sem leitura" : `${latency}ms`}
          </p>
          {active && duration ? (
            <p className="text-[10px] text-muted-foreground/70">ha {duration}</p>
          ) : null}
        </div>
      </div>

      {active && (uptimePct !== undefined || latencyHistory.length >= 2) ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {uptimePct !== undefined ? (
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium",
                  uptimePct >= 99
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : uptimePct >= 90
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-red-500/10 text-red-600 dark:text-red-400",
                )}
              >
                {uptimePct.toFixed(1)}% uptime
              </span>
            ) : null}
            {incidentCount !== undefined && incidentCount > 0 ? (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {incidentCount} {incidentCount === 1 ? "incidente" : "incidentes"}
              </span>
            ) : null}
          </div>
          {latencyHistory.length >= 2 ? (
            <LatencySparkline data={latencyHistory} status={rawStatus ?? "ONLINE"} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
