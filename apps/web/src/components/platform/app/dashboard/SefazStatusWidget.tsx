import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardSefazStatus } from "@dosc-syspro/contracts/dashboard";

type SefazStatusKey = "ONLINE" | "UNSTABLE" | "OFFLINE";

const SEFAZ_STATUS_MAP: Record<SefazStatusKey, { label: string; color: string; dot: string }> = {
  ONLINE: { label: "Operacional", color: "text-emerald-500", dot: "bg-emerald-500" },
  UNSTABLE: { label: "Instável", color: "text-amber-500", dot: "bg-amber-500" },
  OFFLINE: { label: "Indisponível", color: "text-red-500", dot: "bg-red-500" },
};

interface SefazStatusWidgetProps {
  uf: string;
  nfe: DashboardSefazStatus | undefined;
  nfce: DashboardSefazStatus | undefined;
}

export function SefazStatusWidget({ uf, nfe, nfce }: SefazStatusWidgetProps) {
  const nfeStatus = nfe ? SEFAZ_STATUS_MAP[nfe.status as SefazStatusKey] : SEFAZ_STATUS_MAP.OFFLINE;
  const nfceStatus = nfce ? SEFAZ_STATUS_MAP[nfce.status as SefazStatusKey] : SEFAZ_STATUS_MAP.OFFLINE;

  const hasOffline = (nfe?.status !== "ONLINE") || (nfce?.status !== "ONLINE");

  return (
    <Card
      className={cn(
        "border-border/50 bg-card/70",
        hasOffline && "border-amber-500/30"
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4 text-amber-500" />
          SEFAZ {uf}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">NFe</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                {nfe?.status === "ONLINE" ? (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                ) : null}
                <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", nfeStatus.dot)} />
              </span>
              <span className={cn("text-sm font-semibold", nfeStatus.color)}>{nfeStatus.label}</span>
            </div>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {!nfe || nfe.status === "OFFLINE" || nfe.latency <= 0 ? "Sem medição" : `${nfe.latency}ms`}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">NFC-e</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                {nfce?.status === "ONLINE" ? (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                ) : null}
                <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", nfceStatus.dot)} />
              </span>
              <span className={cn("text-sm font-semibold", nfceStatus.color)}>{nfceStatus.label}</span>
            </div>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {!nfce || nfce.status === "OFFLINE" || nfce.latency <= 0 ? "Sem medição" : `${nfce.latency}ms`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
