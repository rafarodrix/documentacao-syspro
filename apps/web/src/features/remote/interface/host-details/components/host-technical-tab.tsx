import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@dosc-syspro/ui";
import { formatDateTime } from "../host-details.helpers";
import { cn } from "@/lib/utils";
import { useAckStream } from "@/features/remote/interface/hooks";
import { Progress } from "@/components/ui/progress";
import { Activity, HardDrive, Cpu } from "lucide-react";

type HostTechnicalTabProps = {
  details: RemoteHostDetails;
  host: RemoteHostDetails["host"];
  machineIpv4: string | null;
  windowsComputerName: string | null;
  firebirdData: { name: string | null; version: string | null; processRunning: boolean | null };
  sysproVersionSnapshot: RemoteHostDetails["agentTelemetry"]["sysproVersionSnapshot"];
  diskSnapshot: RemoteHostDetails["agentTelemetry"]["diskSnapshot"];
  sysproProcessSnapshot: RemoteHostDetails["agentTelemetry"]["sysproProcessSnapshot"];
  rebootPending: RemoteHostDetails["agentTelemetry"]["rebootPending"];
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

function toVersionInstallations(snapshot: RemoteHostDetails["agentTelemetry"]["sysproVersionSnapshot"]) {
  if (!snapshot || !Array.isArray(snapshot["installations"])) return [];
  return snapshot["installations"].filter(
    (entry): entry is Record<string, unknown> => !!entry && typeof entry === "object" && !Array.isArray(entry),
  );
}

export function HostTechnicalTab({
  details,
  host,
  machineIpv4,
  windowsComputerName,
  firebirdData,
  sysproVersionSnapshot,
  diskSnapshot,
  sysproProcessSnapshot,
  rebootPending,
}: HostTechnicalTabProps) {
  const { lastTelemetry, isConnected } = useAckStream(host.id);
  const agent = host.agent;
  const versionInstallations = toVersionInstallations(sysproVersionSnapshot);

  const currentMetrics: LiveMetrics = lastTelemetry || host.lastAgentMetrics || {};
  const cpuLoad = readMetricNumber(currentMetrics, "cpuLoad");
  const ramUsedPc = readMetricNumber(currentMetrics, "ramUsedPc");
  const diskFree = readMetricNumber(currentMetrics, "diskFree");
  const diskTotal = readMetricNumber(currentMetrics, "diskTotal");
  const diskFreeGb = diskFree !== null ? (diskFree / (1024 * 1024 * 1024)).toFixed(1) : null;
  const diskTotalGb = diskTotal !== null ? (diskTotal / (1024 * 1024 * 1024)).toFixed(0) : null;
  const diskUsedPc =
    diskFree !== null && diskTotal !== null && diskTotal > 0 ? Math.round((1 - diskFree / diskTotal) * 100) : null;

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Monitoramento</CardTitle>
          <CardDescription>Leitura operacional baseada na coleta real do módulo device.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", isConnected ? "animate-pulse bg-green-500" : "bg-muted")} />
          <span className="text-[10px] font-medium uppercase text-muted-foreground">
            {isConnected ? "Telemetria ao vivo" : "Telemetria offline"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
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
              <Progress value={cpuLoad ?? 0} className="mt-3 h-1.5" />
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
              <Progress value={ramUsedPc ?? 0} className="mt-3 h-1.5" />
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/40 bg-muted/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Disco livre</span>
                </div>
                <span className="font-mono text-lg font-bold">{diskFreeGb !== null ? `${diskFreeGb}GB` : "--"}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{diskTotalGb ? `Total: ${diskTotalGb}GB` : ""}</span>
                <span>{diskUsedPc !== null ? `${diskUsedPc}% usado` : ""}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Nome da máquina</p>
            <p className="mt-1 text-sm text-foreground">{windowsComputerName ?? "Sem leitura do agente"}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">IPv4 da máquina</p>
            <p className="mt-1 text-sm text-foreground">{machineIpv4 ?? "Sem leitura"}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">IP reportado</p>
            <p className="mt-1 text-sm text-foreground">{agent.lastKnownIp ?? "Sem leitura"}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">RustDesk ID</p>
            <p className="mt-1 text-sm text-foreground">{agent.rustdeskId ?? "Sem leitura"}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
          <p className="text-sm font-medium text-foreground">Instalações e versões do Syspro</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Versões reais dos executáveis projetados para o agente e o estado das instalações no host.
          </p>
          {versionInstallations.length ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {versionInstallations.map((entry, index) => (
                <div key={`${String(entry["companyId"] ?? index)}-${String(entry["serverPath"] ?? index)}`} className="rounded-xl border border-border/40 bg-background/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Empresa</p>
                  <p className="mt-1 text-sm text-foreground">{typeof entry["companyName"] === "string" ? entry["companyName"] : "Sem identificação"}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">server_path</p>
                  <p className="mt-1 break-all font-mono text-xs text-foreground">{typeof entry["serverPath"] === "string" ? entry["serverPath"] : "Sem leitura"}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Versão</p>
                  <p className="mt-1 text-sm text-foreground">{typeof entry["exeVersion"] === "string" && entry["exeVersion"] ? entry["exeVersion"] : "Sem leitura"}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Executável</p>
                  <p className="mt-1 text-sm text-foreground">
                    {typeof entry["exeExists"] === "boolean" ? (entry["exeExists"] ? "Encontrado" : "Não encontrado") : "Sem leitura"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Nenhuma versão de instalação reportada ainda pelo agente.</p>
          )}
        </div>

        <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
          <p className="text-sm font-medium text-foreground">Serviços monitorados</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Status dos serviços Windows ligados ao Syspro e processos relacionados.
          </p>
          {sysproProcessSnapshot.length ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {sysproProcessSnapshot.map((entry, index) => {
                const running = entry["status"] === "running" || entry["running"] === true;
                return (
                  <div key={`${String(entry["name"] ?? index)}-${index}`} className="rounded-xl border border-border/40 bg-background/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">
                        {typeof entry["displayName"] === "string" ? entry["displayName"] : typeof entry["name"] === "string" ? entry["name"] : "Serviço"}
                      </p>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", running ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300")}>
                        {running ? "Rodando" : typeof entry["status"] === "string" ? entry["status"] : "Sem leitura"}
                      </span>
                    </div>
                    {typeof entry["companyId"] === "string" && entry["companyId"] ? (
                      <p className="mt-2 text-xs text-muted-foreground">company_id: {entry["companyId"]}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Nenhum serviço monitorado foi reportado ainda.</p>
          )}
        </div>

        <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
          <p className="text-sm font-medium text-foreground">Volumes e saúde operacional</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-border/40 bg-background/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Volumes</p>
              <p className="mt-2 text-sm text-foreground">{diskSnapshot.length} volume(s)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Atualizado em {formatDateTime(details.agentTelemetry.diskSnapshotAt)}
              </p>
            </div>
            <div className="rounded-xl border border-border/40 bg-background/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Reboot pendente</p>
              <p className="mt-2 text-sm text-foreground">
                {rebootPending === null ? "Sem leitura" : rebootPending ? "Sim" : "Não"}
              </p>
            </div>
            <div className="rounded-xl border border-border/40 bg-background/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Firebird</p>
              <p className="mt-2 text-sm text-foreground">{firebirdData.name ?? "Sem leitura"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {firebirdData.processRunning === null ? "Sem leitura" : firebirdData.processRunning ? "Em execução" : "Parado"}
              </p>
            </div>
          </div>

          {diskSnapshot.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {diskSnapshot.map((volume, index) => {
                const letter = typeof volume["letter"] === "string" ? volume["letter"] : "-";
                const label = typeof volume["label"] === "string" && volume["label"] ? volume["label"] : "Sem rótulo";
                const freeMb = typeof volume["freeMb"] === "number" ? volume["freeMb"] : null;
                const totalMb = typeof volume["totalMb"] === "number" ? volume["totalMb"] : null;
                const usedPct = typeof volume["usedPct"] === "number" ? volume["usedPct"] : null;
                return (
                  <div key={`${letter}-${index}`} className="rounded-xl border border-border/40 bg-background/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{letter}: {label}</p>
                      {usedPct !== null ? (
                        <span className="text-xs text-muted-foreground">{usedPct}% usado</span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Livre: {freeMb !== null ? `${Math.round(freeMb / 1024)} GB` : "-"} | Total: {totalMb !== null ? `${Math.round(totalMb / 1024)} GB` : "-"}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

      </CardContent>
    </Card>
  );
}
