"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@dosc-syspro/ui";
import { formatDateTime, readSysproInstallationGroups } from "../../host-details.helpers";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { Badge } from "@dosc-syspro/ui";
import { Monitor, Cpu, HardDrive, LayoutTemplate, Activity } from "lucide-react";

type Props = {
  details: RemoteHostDetails;
};

export function DiagnosticsSummaryView({ details }: Props) {
  const telemetry = details.agentTelemetry;

  const sysSnap = telemetry.systemSnapshot || {};
  const hwSnap = telemetry.hardwareIdentity || {};
  const netSnap = telemetry.networkSnapshot || {};
  const metricsSnap = telemetry.agentMetrics || {};
  const winUpdate = telemetry.windowsUpdateStatus || {};

  const osName = (sysSnap.osName as string) || "Desconhecido";
  const hostname = (sysSnap.hostname as string) || "Desconhecido";
  
  const manufacturer = (hwSnap.systemManufacturer as string) || "Desconhecido";
  const model = (hwSnap.systemModel as string) || "Desconhecido";
  const arch = (hwSnap.cpuArchitecture as string) || "Desconhecido";
  
  const memoryTotalMb = typeof metricsSnap.memoryTotalMb === "number" ? metricsSnap.memoryTotalMb : null;
  const memoryStr = memoryTotalMb !== null ? `${Math.round(memoryTotalMb / 1024)} GB` : "Desconhecido";

  const dnsServers = Array.isArray(netSnap.dnsServers) ? netSnap.dnsServers.join(", ") : "N/A";
  const rebootPending = (winUpdate.rebootRequired === true) || (metricsSnap.rebootPending === true);

  const getCounts = () => {
    const sysproGroups = readSysproInstallationGroups(telemetry.sysproVersionSnapshot);
    return {
      volumes: telemetry.diskSnapshot?.length || 0,
      softwares: telemetry.softwareSnapshot?.length || 0,
      services: telemetry.sysproProcessSnapshot?.length || 0,
      syspro: sysproGroups.length,
    };
  };

  const getLastSync = () => {
    return telemetry.systemSnapshotAt ? formatDateTime(telemetry.systemSnapshotAt) : "Nunca";
  };

  const counts = getCounts();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border/50 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
        Fonte: telemetria do agente (<span className="font-mono text-foreground">agent.telemetry.v1</span>)
        {telemetry.systemSnapshotAt ? ` · última coleta ${formatDateTime(telemetry.systemSnapshotAt)}` : " · sem coleta ainda"}
        . Durante a migração o inventário ainda pode chegar também pelo sync RustDesk.
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SO & Identidade</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate" title={osName}>{osName}</div>
            <p className="text-xs text-muted-foreground mt-1 truncate">Host: {hostname}</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hardware</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{manufacturer}</div>
            <p className="text-xs text-muted-foreground mt-1 truncate">{model} ({arch})</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rede (DNS)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{dnsServers.split(",")[0] || "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1 truncate">{dnsServers}</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saúde & Updates</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {rebootPending ? (
                <span className="text-rose-500">Reboot Pendente</span>
              ) : (
                <span className="text-emerald-500">Saudável</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">Memória: {memoryStr}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Metadados de Inventário</CardTitle>
            <CardDescription>
              Volume de dados coletados neste dispositivo.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit border-border/60 bg-background/70 text-muted-foreground">
            Última coleta geral: {getLastSync()}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 gap-y-4 grid-cols-1 md:grid-cols-2 text-sm">
            <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border/30">
              <span className="text-muted-foreground">Volumes (Discos)</span>
              <span className="font-medium text-foreground">{counts.volumes} particões montadas</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border/30">
              <span className="text-muted-foreground">Softwares instalados</span>
              <span className="font-medium text-foreground">{counts.softwares} programas</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border/30">
              <span className="text-muted-foreground">Processos Syspro Monitorados</span>
              <span className="font-medium text-foreground">{counts.services} serviços</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border/30">
              <span className="text-muted-foreground">Instalações Syspro rastreadas</span>
              <span className="font-medium text-foreground">{counts.syspro} instâncias</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
