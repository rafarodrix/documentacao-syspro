import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatDateTime, getSysproUpdateHealthMeta } from "../utils";
import { cn } from "@/lib/utils";
import { useAckStream } from "@/features/remote/interface/hooks";
import { Progress } from "@/components/ui/progress";
import { Activity, HardDrive, Layout, Cpu } from "lucide-react";

export function HostTechnicalTab({
  details,
  host,
  machineIpv4,
  windowsComputerName,
  sysproServerInstallations,
  firebirdData,
}: {
  details: any;
  host: any;
  machineIpv4: string | null;
  windowsComputerName: string | null;
  sysproServerInstallations: any[];
  firebirdData: { name: string | null; version: string | null; processRunning: boolean | null };
}) {
  const { lastTelemetry, isConnected } = useAckStream(host.id);
  
  const currentMetrics = lastTelemetry || host.lastAgentMetrics || {};
  const cpuLoad = typeof currentMetrics.cpuLoad === 'number' ? currentMetrics.cpuLoad : null;
  const ramUsedPc = typeof currentMetrics.ramUsedPc === 'number' ? currentMetrics.ramUsedPc : null;
  const diskFreeGb = typeof currentMetrics.diskFree === 'number' ? (currentMetrics.diskFree / (1024 * 1024 * 1024)).toFixed(1) : null;
  const diskTotalGb = typeof currentMetrics.diskTotal === 'number' ? (currentMetrics.diskTotal / (1024 * 1024 * 1024)).toFixed(0) : null;
  const diskUsedPc = (diskFreeGb && diskTotalGb) ? Math.round((1 - (Number(diskFreeGb) / Number(diskTotalGb))) * 100) : null;

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Informacoes tecnicas da maquina</CardTitle>
          <CardDescription>Base de diagnostico rapido para atendimento tecnico.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", isConnected ? "bg-green-500 animate-pulse" : "bg-muted")} />
          <span className="text-[10px] uppercase font-medium text-muted-foreground">
            {isConnected ? "Live Telemetry Active" : "Telemetry Offline"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Live Health Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-muted/10 border-border/40 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CPU Load</span>
                </div>
                <span className="text-lg font-bold font-mono">{cpuLoad !== null ? `${cpuLoad}%` : '--'}</span>
              </div>
              <Progress value={cpuLoad ?? 0} className="mt-3 h-1.5" />
            </CardContent>
          </Card>

          <Card className="bg-muted/10 border-border/40 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">RAM Usage</span>
                </div>
                <span className="text-lg font-bold font-mono">{ramUsedPc !== null ? `${ramUsedPc}%` : '--'}</span>
              </div>
              <Progress value={ramUsedPc ?? 0} className="mt-3 h-1.5" />
            </CardContent>
          </Card>

          <Card className="bg-muted/10 border-border/40 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Disk Free</span>
                </div>
                <span className="text-lg font-bold font-mono">{diskFreeGb !== null ? `${diskFreeGb}GB` : '--'}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{diskTotalGb ? `Total: ${diskTotalGb}GB` : ''}</span>
                <span>{diskUsedPc !== null ? `${diskUsedPc}% Used` : ''}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Nome da maquina</p>
              <p className="mt-1 text-sm text-foreground">{windowsComputerName ?? "Sem leitura do agente"}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">IPv4 da maquina</p>
              <p className="mt-1 text-sm text-foreground">{machineIpv4 ?? "Sem leitura"}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">IP reportado (agente)</p>
              <p className="mt-1 text-sm text-foreground">{host.lastKnownIp ?? "Sem leitura"}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">RustDesk ID</p>
              <p className="mt-1 text-sm text-foreground">{host.rustdeskId ?? "Sem leitura"}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
            <p className="text-sm font-medium text-foreground">Dados Syspro Server</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Considera somente instalacoes com caminho `\\Syspro\\Server\\SysproServer.exe`.
            </p>
            {sysproServerInstallations.length ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {sysproServerInstallations.map((context) => {
                  const entry = context.update;
                  const company = context.company;
                  const health = getSysproUpdateHealthMeta({
                    isServerHost: entry.isServerHost,
                    lastFileWriteAt: entry.lastFileWriteAt,
                  });
                  return (
                    <div key={entry.id} className="rounded-xl border border-border/40 bg-background/60 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Caminho</p>
                      <p className="mt-1 break-all font-mono text-xs text-foreground">{entry.path}</p>
                      <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Ultima atualizacao</p>
                      <p className="mt-1 text-sm text-foreground">{formatDateTime(entry.lastFileWriteAt)}</p>
                      <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Servidor / Porta / Protocolo</p>
                      <p className="mt-1 text-sm text-foreground">
                        {(company?.serverHost ?? "Sem vinculo")} : {company?.serverPort ?? "-"} ({company?.serverProtocol ?? "-"})
                      </p>
                      <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Topologia detectada</p>
                      <p className="mt-1 text-sm text-foreground">
                        Client: {entry.hasClientFolder === null ? "Sem leitura" : entry.hasClientFolder ? "Sim" : "Nao"} | Dll:{" "}
                        {entry.hasDllFolder === null ? "Sem leitura" : entry.hasDllFolder ? "Sim" : "Nao"}
                      </p>
                      <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Firebird</p>
                      <p className="mt-1 text-sm text-foreground">
                        {entry.firebirdVersion || entry.firebirdPath
                          ? `${entry.firebirdVersion ?? "versao n/d"} (${entry.firebirdPath ?? "caminho n/d"})`
                          : "Sem leitura"}
                      </p>
                      <div className={cn("mt-2 rounded-lg border px-2 py-1 text-xs", health.className)}>
                        {health.label} - {health.detail}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Nenhum Syspro Server detectado nesta maquina.</p>
            )}
          </div>

          <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
            <p className="text-sm font-medium text-foreground">Dados Firebird</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border/40 bg-background/60 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Produto</p>
                <p className="mt-1 text-sm text-foreground">{firebirdData.name ?? "Sem leitura"}</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-background/60 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Versao</p>
                <p className="mt-1 text-sm text-foreground">{firebirdData.version ?? "Sem leitura"}</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-background/60 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Processo fbserver</p>
                <p className="mt-1 text-sm text-foreground">
                  {firebirdData.processRunning === null ? "Sem leitura" : firebirdData.processRunning ? "Em execucao" : "Parado"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


