import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Progress, Badge } from "@dosc-syspro/ui";
import { formatDateTime, formatRelativeHeartbeat } from "../host-details.helpers";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";
import { useAckStream } from "@/features/remote/interface/hooks";
import { useState } from "react";
import { Activity, HardDrive, Cpu, Laptop, Network, Globe, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";

type HostTechnicalTabProps = {
  details: RemoteHostDetails;
  host: RemoteHostDetails["host"];
  machineIpv4: string | null;
  internetIpv4: string | null;
  localGateway: string | null;
  windowsComputerName: string | null;
  firebirdData: { name: string | null; version: string | null; processRunning: boolean | null };
  sysproVersionSnapshot: RemoteHostDetails["agentTelemetry"]["sysproVersionSnapshot"];
  diskSnapshot: RemoteHostDetails["agentTelemetry"]["diskSnapshot"];
  sysproProcessSnapshot: RemoteHostDetails["agentTelemetry"]["sysproProcessSnapshot"];
  rebootPending: RemoteHostDetails["agentTelemetry"]["rebootPending"];
  windowsUpdateStatus: RemoteHostDetails["agentTelemetry"]["windowsUpdateStatus"];
  windowsUpdateStatusAt: RemoteHostDetails["agentTelemetry"]["windowsUpdateStatusAt"];
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

export function HostTechnicalTab({
  details,
  host,
  machineIpv4,
  internetIpv4,
  localGateway,
  windowsComputerName,
  firebirdData,
  sysproVersionSnapshot,
  diskSnapshot,
  sysproProcessSnapshot,
  rebootPending,
  windowsUpdateStatus,
  windowsUpdateStatusAt,
}: HostTechnicalTabProps) {
  const { lastTelemetry, isConnected } = useAckStream(host.id);
  const [showInactiveNetwork, setShowInactiveNetwork] = useState(false);
  const agent = host.agent;
  const versionInstallations = toVersionInstallations(sysproVersionSnapshot);

  const { systemSnapshot, hardwareIdentity, networkSnapshot } = details.agentTelemetry;

  const currentMetrics: LiveMetrics = lastTelemetry || host.lastAgentMetrics || {};
  const cpuLoad = readMetricNumber(currentMetrics, "cpuLoad");
  const ramUsedPc = readMetricNumber(currentMetrics, "ramUsedPc");
  const primaryDisk = selectPrimaryDisk(diskSnapshot);
  const diskFreeFromMetrics = readMetricNumber(currentMetrics, "diskFree");
  const diskTotalFromMetrics = readMetricNumber(currentMetrics, "diskTotal");
  const diskFree =
    diskFreeFromMetrics ??
    (primaryDisk && typeof primaryDisk["freeMb"] === "number" ? primaryDisk["freeMb"] * 1024 * 1024 : null);
  const diskTotal =
    diskTotalFromMetrics ??
    (primaryDisk && typeof primaryDisk["totalMb"] === "number" ? primaryDisk["totalMb"] * 1024 * 1024 : null);
  const diskFreeGb =
    diskFree !== null
      ? formatNumber(diskFree / (1024 * 1024 * 1024), { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : null;
  const diskTotalGb =
    diskTotal !== null ? formatNumber(diskTotal / (1024 * 1024 * 1024), { maximumFractionDigits: 0 }) : null;
  const diskUsedPc =
    diskFree !== null && diskTotal !== null && diskTotal > 0 ? Math.round((1 - diskFree / diskTotal) * 100) : null;

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/40">
        <div>
          <CardTitle className="text-lg">Monitoramento</CardTitle>
          <CardDescription>
            Leitura operacional baseada na coleta real do modulo device.
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

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border/40 bg-muted/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Laptop className="h-4 w-4 text-primary" />
                Especificações do Host
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-border/30 py-1">
                <span className="text-muted-foreground">Nome do Computador</span>
                <span className="font-semibold text-foreground">{windowsComputerName ?? "Sem leitura"}</span>
              </div>

              {!!hardwareIdentity?.["systemManufacturer"] && (
                <div className="flex items-center justify-between border-b border-border/30 py-1">
                  <span className="text-muted-foreground">Fabricante</span>
                  <span className="font-semibold text-foreground">
                    {String(hardwareIdentity["systemManufacturer"])}
                  </span>
                </div>
              )}

              {!!hardwareIdentity?.["systemModel"] && (
                <div className="flex items-center justify-between border-b border-border/30 py-1">
                  <span className="text-muted-foreground">Modelo do Sistema</span>
                  <span className="font-semibold text-foreground">
                    {String(hardwareIdentity["systemModel"])}
                  </span>
                </div>
              )}

              {!!systemSnapshot?.["osName"] && (
                <div className="flex items-center justify-between border-b border-border/30 py-1">
                  <span className="text-muted-foreground">Sistema Operacional</span>
                  <span className="font-semibold text-foreground" title={systemSnapshot["osVersion"] ? `Versão: ${String(systemSnapshot["osVersion"])}` : ""}>
                    {String(systemSnapshot["osName"])} {systemSnapshot["osArchitecture"] ? `(${String(systemSnapshot["osArchitecture"])})` : ""}
                  </span>
                </div>
              )}

              {!!systemSnapshot?.["osBuild"] && (
                <div className="flex items-center justify-between border-b border-border/30 py-1">
                  <span className="text-muted-foreground">Build do SO</span>
                  <span className="font-semibold text-foreground">
                    {String(systemSnapshot["osBuild"])}
                  </span>
                </div>
              )}

              {!!hardwareIdentity?.["baseboardModel"] && (
                <div className="flex items-center justify-between border-b border-border/30 py-1">
                  <span className="text-muted-foreground">Placa-Mãe</span>
                  <span className="font-semibold text-foreground">
                    {hardwareIdentity["baseboardVendor"] ? `${String(hardwareIdentity["baseboardVendor"])} ` : ""}
                    {String(hardwareIdentity["baseboardModel"])}
                  </span>
                </div>
              )}

              {!!hardwareIdentity?.["biosVersion"] && (
                <div className="flex items-center justify-between border-b border-border/30 py-1">
                  <span className="text-muted-foreground">Versão da BIOS</span>
                  <span className="font-semibold text-foreground">
                    {String(hardwareIdentity["biosVersion"])}
                  </span>
                </div>
              )}

              {!!hardwareIdentity?.["systemSerial"] && (
                <div className="flex items-center justify-between border-b border-border/30 py-1">
                  <span className="text-muted-foreground">Número de Série</span>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {String(hardwareIdentity["systemSerial"])}
                  </span>
                </div>
              )}

              {!!hardwareIdentity?.["machineGuid"] && (
                <div className="flex items-center justify-between border-b border-border/30 py-1">
                  <span className="text-muted-foreground">Machine GUID</span>
                  <span className="font-mono text-[11px] text-muted-foreground break-all" title={String(hardwareIdentity["machineGuid"])}>
                    {String(hardwareIdentity["machineGuid"])}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between border-b border-border/30 py-1">
                <span className="text-muted-foreground">Reboot Pendente</span>
                <span className={cn("font-semibold", rebootPending ? "text-amber-500 font-bold" : "text-foreground")}>
                  {rebootPending === null ? "Sem leitura" : rebootPending ? "Sim (Necessário)" : "Não"}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-border/30 py-1">
                <span className="text-muted-foreground">Firebird</span>
                <span className="font-semibold text-foreground">
                  {firebirdData.name ?? "Não detectado"} {firebirdData.version ? `(${firebirdData.version})` : ""}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Status do Firebird</span>
                <span
                  className={cn(
                    "font-bold",
                    firebirdData.processRunning ? "text-emerald-500" : "text-amber-500",
                  )}
                >
                  {firebirdData.processRunning === null
                    ? "Sem leitura"
                    : firebirdData.processRunning
                      ? "Em execução"
                      : "Parado"}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-border/40 bg-muted/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Globe className="h-4 w-4 text-primary" />
                  Configurações de Rede
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-border/30 py-1">
                  <span className="text-muted-foreground">IPv4 Local (Intranet)</span>
                  <span className="font-mono text-foreground">{machineIpv4 ?? "Sem leitura"}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/30 py-1">
                  <span className="text-muted-foreground">IP da Internet</span>
                  <span className="font-mono text-foreground">{internetIpv4 ?? "Sem leitura"}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/30 py-1">
                  <span className="text-muted-foreground">Gateway local</span>
                  <span className="font-mono text-foreground">{localGateway ?? "Sem leitura"}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/30 py-1">
                  <span className="text-muted-foreground">RustDesk ID</span>
                  <span className="font-mono text-foreground">{agent.rustdeskId ?? "Sem leitura"}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/30 py-1">
                  <span className="text-muted-foreground">Sincronizacao do RustDesk</span>
                  <span className="text-foreground">
                    {agent.lastRustDeskConfigSyncAt ? formatDateTime(agent.lastRustDeskConfigSyncAt) : "Nunca"}
                  </span>
                </div>

                {networkSnapshot && Array.isArray(networkSnapshot["dnsServers"]) && networkSnapshot["dnsServers"].length > 0 && (
                  <div className="flex flex-col gap-1 py-1">
                    <span className="text-muted-foreground">Servidores DNS</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(networkSnapshot["dnsServers"] as string[]).map((dns: string) => (
                        <span key={dns} className="rounded bg-muted/65 border border-border/30 px-1.5 py-0.5 font-mono text-xs text-foreground">
                          {dns}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-muted/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  Windows Update
                </CardTitle>
                <CardDescription>Status das atualizações do sistema operacional.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-border/30 py-1">
                  <span className="text-muted-foreground">Atualizações Pendentes</span>
                  {windowsUpdateStatus?.["pendingCount"] !== undefined && windowsUpdateStatus?.["pendingCount"] !== null ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-semibold text-xs",
                        Number(windowsUpdateStatus["pendingCount"]) > 0
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300" // ds-allow: status
                          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", // ds-allow: status
                      )}
                    >
                      {String(windowsUpdateStatus["pendingCount"])} pendente(s)
                    </Badge>
                  ) : (
                    <span className="font-semibold text-foreground">Sem leitura</span>
                  )}
                </div>

                <div className="flex items-center justify-between border-b border-border/30 py-1">
                  <span className="text-muted-foreground">Reinicialização Requerida</span>
                  {windowsUpdateStatus?.["rebootRequired"] !== undefined && windowsUpdateStatus?.["rebootRequired"] !== null ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-semibold text-xs",
                        windowsUpdateStatus["rebootRequired"] === true
                          ? "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300" // ds-allow: status
                          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", // ds-allow: status
                      )}
                    >
                      {windowsUpdateStatus["rebootRequired"] === true ? "Sim (Pendente)" : "Não"}
                    </Badge>
                  ) : (
                    <span className="font-semibold text-foreground">Sem leitura</span>
                  )}
                </div>

                <div className="flex items-center justify-between border-b border-border/30 py-1">
                  <span className="text-muted-foreground">Última Verificação</span>
                  <span className="text-foreground">
                    {windowsUpdateStatusAt ? formatDateTime(windowsUpdateStatusAt) : "Nunca"}
                  </span>
                </div>

                {windowsUpdateStatus &&
                  Array.isArray(windowsUpdateStatus["pendingSignals"]) &&
                  windowsUpdateStatus["pendingSignals"].length > 0 && (
                    <div className="flex flex-col gap-1 py-1">
                      <span className="text-muted-foreground">Indicadores e Sinais</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {(windowsUpdateStatus["pendingSignals"] as string[]).map((signal: string) => (
                          <span
                            key={signal}
                            className="rounded bg-muted/65 border border-border/30 px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                          >
                            {signal}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Adaptadores de Rede */}
        {networkSnapshot && Array.isArray(networkSnapshot["adapters"]) && networkSnapshot["adapters"].length > 0 && (
          <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">Adaptadores de rede ativos</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <p>Interfaces de rede físicas e virtuais detectadas no último sync do host.</p>
                  {details.agentTelemetry.networkSnapshotAt && (
                    <span className="flex items-center gap-1 font-medium text-muted-foreground/80 before:content-['•'] before:mr-1">
                      {formatRelativeHeartbeat(details.agentTelemetry.networkSnapshotAt)}
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setShowInactiveNetwork(!showInactiveNetwork)}
                className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                {showInactiveNetwork ? <><ChevronUp className="h-3 w-3" /> Ocultar Inativos</> : <><ChevronDown className="h-3 w-3" /> Mostrar Inativos</>}
              </button>
            </div>
            
            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {(networkSnapshot["adapters"] as Array<{
                name: string;
                friendlyName?: string;
                mac?: string;
                up: boolean;
                mtu?: number;
                addresses?: string[];
              }>)
                .filter(adapter => showInactiveNetwork || adapter.up)
                .map((adapter, index) => {
                const addresses = Array.isArray(adapter.addresses) ? adapter.addresses : [];
                return (
                  <div
                    key={`${adapter.name}-${index}`}
                    className="rounded-xl border border-border/40 bg-background/60 p-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-sm text-foreground truncate" title={adapter.friendlyName || adapter.name}>
                          {adapter.friendlyName || adapter.name}
                        </span>
                        <span
                          className={cn(
                            "rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                            adapter.up
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" // ds-allow: status
                              : "border-muted/40 bg-muted/20 text-muted-foreground",
                          )}
                        >
                          {adapter.up ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">Interface</p>
                      <p className="font-mono text-xs text-foreground truncate">{adapter.name}</p>

                      {adapter.mac && (
                        <>
                          <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">Endereço MAC</p>
                          <p className="font-mono text-xs text-foreground">{adapter.mac}</p>
                        </>
                      )}

                      {addresses.length > 0 && (
                        <>
                          <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">Endereços IP</p>
                          <div className="mt-1 flex flex-col gap-1">
                            {addresses.map((addr) => (
                              <span key={addr} className="font-mono text-xs text-foreground break-all">
                                {addr}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    {adapter.mtu && (
                      <div className="mt-3 border-t border-border/25 pt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>MTU</span>
                        <span className="font-mono font-medium">{adapter.mtu}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
          <p className="text-sm font-medium text-foreground">Instalacoes e versoes do Syspro</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Versoes reais dos executaveis projetados para o agente e o estado das instalacoes no host.
          </p>
          {versionInstallations.length ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {versionInstallations.map((entry, index) => (
                <div
                  key={`${String(entry["companyId"] ?? index)}-${String(entry["serverPath"] ?? index)}`}
                  className="rounded-xl border border-border/40 bg-background/60 p-3"
                >
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Empresa</p>
                  <p className="mt-1 text-sm text-foreground">
                    {typeof entry["companyName"] === "string" ? entry["companyName"] : "Sem identificacao"}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">server_path</p>
                  <p className="mt-1 break-all font-mono text-xs text-foreground">
                    {typeof entry["serverPath"] === "string" ? entry["serverPath"] : "Sem leitura"}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Versao</p>
                  <p className="mt-1 text-sm text-foreground">
                    {typeof entry["exeVersion"] === "string" && entry["exeVersion"] ? entry["exeVersion"] : "Sem leitura"}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Executavel</p>
                  <p className="mt-1 text-sm text-foreground">
                    {typeof entry["exeExists"] === "boolean"
                      ? entry["exeExists"]
                        ? "Encontrado"
                        : "Nao encontrado"
                      : "Sem leitura"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhuma versao de instalacao reportada ainda pelo agente.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
          <p className="text-sm font-medium text-foreground">Servicos monitorados</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Status dos servicos Windows ligados ao Syspro e processos relacionados.
          </p>
          {sysproProcessSnapshot.length ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {sysproProcessSnapshot.map((entry, index) => {
                const running = entry["status"] === "running" || entry["running"] === true;
                return (
                  <div
                    key={`${String(entry["name"] ?? index)}-${index}`}
                    className="rounded-xl border border-border/40 bg-background/60 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">
                        {typeof entry["displayName"] === "string"
                          ? entry["displayName"]
                          : typeof entry["name"] === "string"
                            ? entry["name"]
                            : "Servico"}
                      </p>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          running
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                        )}
                      >
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
            <p className="mt-3 text-sm text-muted-foreground">Nenhum servico monitorado foi reportado ainda.</p>
          )}
        </div>

        <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
          <p className="text-sm font-medium text-foreground">Volumes monitorados</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sistemas de arquivos e espaco livre detectados em {formatDateTime(details.agentTelemetry.diskSnapshotAt)}.
          </p>

          {diskSnapshot.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {diskSnapshot.map((volume, index) => {
                const letter = typeof volume["letter"] === "string" ? volume["letter"] : "-";
                const label =
                  typeof volume["label"] === "string" && volume["label"] ? volume["label"] : "Sem rotulo";
                const freeMb = typeof volume["freeMb"] === "number" ? volume["freeMb"] : null;
                const totalMb = typeof volume["totalMb"] === "number" ? volume["totalMb"] : null;
                const usedPct = typeof volume["usedPct"] === "number" ? volume["usedPct"] : null;
                return (
                  <div key={`${letter}-${index}`} className="rounded-xl border border-border/40 bg-background/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">
                        {letter}: {label}
                      </p>
                      {usedPct !== null ? <span className="text-xs text-muted-foreground">{usedPct}% usado</span> : null}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Livre: {freeMb !== null ? `${Math.round(freeMb / 1024)} GB` : "-"} | Total:{" "}
                      {totalMb !== null ? `${Math.round(totalMb / 1024)} GB` : "-"}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Nenhum volume reportado pelo agente.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
