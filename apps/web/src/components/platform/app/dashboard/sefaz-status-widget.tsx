import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardSefazStatus } from "@dosc-syspro/contracts/dashboard";

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
    <Card className={cn("border-border/50 bg-card/70", hasDegradation && "border-amber-500/30")}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4 text-amber-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <StatusRow label="NFe" active={nfeActive} status={nfeStatus} latency={nfe?.latency} rawStatus={nfe?.status} />
        <StatusRow
          label="NFC-e"
          active={nfceActive}
          status={nfceStatus}
          latency={nfce?.latency}
          rawStatus={nfce?.status}
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
  latency,
  rawStatus,
  className,
}: {
  label: string;
  active: boolean;
  status: { label: string; color: string; dot: string };
  latency?: number;
  rawStatus?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
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
      <p className="font-mono text-xs text-muted-foreground">
        {!active ? "Desativado" : !latency || rawStatus === "OFFLINE" ? "Sem leitura" : `${latency}ms`}
      </p>
    </div>
  );
}
