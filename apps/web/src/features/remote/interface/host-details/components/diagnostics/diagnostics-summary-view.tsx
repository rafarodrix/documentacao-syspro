"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@dosc-syspro/ui";
import { formatDateTime } from "../../host-details.helpers";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";

type Props = {
  details: RemoteHostDetails;
};

export function DiagnosticsSummaryView({ details }: Props) {
  const telemetry = details.agentTelemetry;

  const getSystemInfo = () => {
    if (!telemetry.systemSnapshot) return { os: "Desconhecido", domain: "N/A" };
    const snap = telemetry.systemSnapshot;
    return {
      os: (snap.osName as string) || "Windows",
      domain: (snap.domain as string) || (snap.workgroup as string) || "N/A",
    };
  };

  const getHardwareInfo = () => {
    if (!telemetry.hardwareIdentity) return { manufacturer: "Desconhecido", model: "Desconhecido", cpu: "Desconhecido", ram: "Desconhecido" };
    const snap = telemetry.hardwareIdentity;
    return {
      manufacturer: (snap.manufacturer as string) || "Desconhecido",
      model: (snap.model as string) || "Desconhecido",
      cpu: (snap.cpu as string) || "Desconhecido",
      ram: snap.totalMemoryBytes ? `${Math.round(Number(snap.totalMemoryBytes) / (1024 * 1024 * 1024))} GB` : "Desconhecido",
    };
  };

  const getCounts = () => {
    return {
      volumes: telemetry.diskSnapshot?.length || 0,
      softwares: telemetry.softwareSnapshot?.length || 0,
      services: telemetry.sysproProcessSnapshot?.length || 0,
      syspro: Array.isArray(telemetry.sysproVersionSnapshot) ? telemetry.sysproVersionSnapshot.length : 0,
    };
  };

  const getLastSync = () => {
    return telemetry.systemSnapshotAt ? formatDateTime(telemetry.systemSnapshotAt) : "Nunca";
  };

  const sysInfo = getSystemInfo();
  const hwInfo = getHardwareInfo();
  const counts = getCounts();

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Resumo do Dispositivo</CardTitle>
          <CardDescription>
            Visão geral das características físicas e lógicas deste computador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 gap-y-4 grid-cols-1 md:grid-cols-2 text-sm">
            <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border/30">
              <span className="text-muted-foreground">Sistema operacional</span>
              <span className="font-medium text-foreground">{sysInfo.os}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border/30">
              <span className="text-muted-foreground">Fabricante</span>
              <span className="font-medium text-foreground">{hwInfo.manufacturer}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border/30">
              <span className="text-muted-foreground">Modelo</span>
              <span className="font-medium text-foreground">{hwInfo.model}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border/30">
              <span className="text-muted-foreground">Processador</span>
              <span className="font-medium text-foreground text-right">{hwInfo.cpu}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border/30">
              <span className="text-muted-foreground">Memória instalada</span>
              <span className="font-medium text-foreground">{hwInfo.ram}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border/30">
              <span className="text-muted-foreground">Volumes (Discos)</span>
              <span className="font-medium text-foreground">{counts.volumes}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border/30">
              <span className="text-muted-foreground">Softwares instalados</span>
              <span className="font-medium text-foreground">{counts.softwares}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border/30">
              <span className="text-muted-foreground">Serviços monitorados</span>
              <span className="font-medium text-foreground">{counts.services}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border/30">
              <span className="text-muted-foreground">Instalações Syspro</span>
              <span className="font-medium text-foreground">{counts.syspro}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border/30">
              <span className="text-muted-foreground">Última coleta</span>
              <span className="font-medium text-foreground">{getLastSync()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
