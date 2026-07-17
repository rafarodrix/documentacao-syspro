import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@dosc-syspro/ui";
import { formatRelativeHeartbeat } from "../../host-details.helpers";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";
import { useAckStream } from "@/features/remote/interface/hooks";
import { Activity, HardDrive, Cpu } from "lucide-react";

type DiagnosticsPerformanceViewProps = {
  host: RemoteHostDetails["host"];
  diskSnapshot: RemoteHostDetails["agentTelemetry"]["diskSnapshot"];
};

type LiveMetrics = {
  cpuLoad?: number | null;
  ramUsedPc?: number | null;
  diskFree?: number | null;
  diskTotal?: number | null;
};

function readMetricNumber(metrics: LiveMetrics, key: keyof LiveMetrics): number | null {
  const value = metrics[key];
  return typeof value === "number" ? value : null;
}

function selectPrimaryDisk(snapshot: RemoteHostDetails["agentTelemetry"]["diskSnapshot"]) {
  if (!Array.isArray(snapshot) || !snapshot.length) return null;
  return [...snapshot].sort((a, b) => {
    const aLetter = typeof a["letter"] === "string" ? a["letter"].toUpperCase() : "";
    const bLetter = typeof b["letter"] === "string" ? b["letter"].toUpperCase() : "";
    if (aLetter === "C" && bLetter !== "C") return -1;
    if (bLetter === "C" && aLetter !== "C") return 1;
    const aTotal = typeof a["totalMb"] === "number" ? a["totalMb"] : 0;
    const bTotal = typeof b["totalMb"] === "number" ? b["totalMb"] : 0;
    return bTotal - aTotal;
  })[0] ?? null;
}

export function DiagnosticsPerformanceView({ host, diskSnapshot }: DiagnosticsPerformanceViewProps) {
  const { lastTelemetry, isConnected } = useAckStream(host.id);
  const agent = host.agent;

  const currentMetrics: LiveMetrics = lastTelemetry || host.lastAgentMetrics || {};
  const cpuLoad = readMetricNumber(currentMetrics, "cpuLoad");
  const ramUsedPc = readMetricNumber(currentMetrics, "ramUsedPc");
  
  const primaryDisk = selectPrimaryDisk(diskSnapshot);
  const diskFreeFromMetrics = readMetricNumber(currentMetrics, "diskFree");
  const diskTotalFromMetrics = readMetricNumber(currentMetrics, "diskTotal");
  const diskFree = diskFreeFromMetrics ?? (primaryDisk && typeof primaryDisk["freeMb"] === "number" ? primaryDisk["freeMb"] * 1024 * 1024 : null);
  const diskTotal = diskTotalFromMetrics ?? (primaryDisk && typeof primaryDisk["totalMb"] === "number" ? primaryDisk["totalMb"] * 1024 * 1024 : null);
  
  const diskFreeGb = diskFree !== null ? formatNumber(diskFree / (1024 * 1024 * 1024), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : null;
  const diskTotalGb = diskTotal !== null ? formatNumber(diskTotal / (1024 * 1024 * 1024), { maximumFractionDigits: 0 }) : null;
  const diskUsedPc = diskFree !== null && diskTotal !== null && diskTotal > 0 ? Math.round((1 - diskFree / diskTotal) * 100) : null;

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/40">
        <div>
          <CardTitle className="text-lg">Desempenho</CardTitle>
          <CardDescription>
            Uso de recursos em tempo real e últimos dados coletados.
          </CardDescription>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", isConnected ? "animate-pulse bg-emerald-500" : "bg-muted")} />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {isConnected ? "Telemetria ao vivo" : "Telemetria offline"}
            </span>
          </div>
          {agent.lastHeartbeatAt && !isConnected && (
            <span className="text-[10px] text-muted-foreground">Último contato {formatRelativeHeartbeat(agent.lastHeartbeatAt)}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="overflow-hidden border-border/40 bg-muted/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CPU load</span>
                </div>
                <span className="font-mono text-lg font-bold">{cpuLoad !== null ? `${cpuLoad}%` : "--"}</span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted shadow-inner">
                <div 
                  className={cn("h-full transition-all", cpuLoad !== null && cpuLoad > 85 ? "bg-rose-500" : cpuLoad !== null && cpuLoad > 60 ? "bg-amber-500" : "bg-primary")} 
                  style={{ width: `${cpuLoad ?? 0}%` }} 
                />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/40 bg-muted/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Uso de RAM</span>
                </div>
                <span className="font-mono text-lg font-bold">{ramUsedPc !== null ? `${ramUsedPc}%` : "--"}</span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted shadow-inner">
                <div 
                  className={cn("h-full transition-all", ramUsedPc !== null && ramUsedPc > 85 ? "bg-rose-500" : ramUsedPc !== null && ramUsedPc > 75 ? "bg-amber-500" : "bg-primary")} 
                  style={{ width: `${ramUsedPc ?? 0}%` }} 
                />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/40 bg-muted/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Disco livre (C:)</span>
                </div>
                <span className="font-mono text-lg font-bold">{diskFreeGb !== null ? `${diskFreeGb}GB` : "--"}</span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted shadow-inner">
                <div 
                  className={cn("h-full transition-all", diskUsedPc !== null && diskUsedPc > 90 ? "bg-rose-500" : diskUsedPc !== null && diskUsedPc > 80 ? "bg-amber-500" : "bg-primary")} 
                  style={{ width: `${diskUsedPc ?? 0}%` }} 
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{diskTotalGb ? `Total: ${diskTotalGb}GB` : ""}</span>
                <span>{diskUsedPc !== null ? `${diskUsedPc}% usado` : ""}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
