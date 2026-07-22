"use client";

import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { readSysproInstallationGroups } from "@/features/remote/interface/host-details/host-details.helpers";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

type Props = {
  details: RemoteHostDetails;
};

export function ErpDiagnosticsView({ details }: Props) {
  const groups = readSysproInstallationGroups(details.agentTelemetry.sysproVersionSnapshot);
  const serverInstances = groups.flatMap((g) => g.serverInstances);

  const diagnostics: Array<{
    id: string;
    type: "CRITICAL" | "WARNING" | "INFO" | "HEALTHY";
    title: string;
    description: string;
  }> = [];

  if (groups.length === 0) {
    diagnostics.push({
      id: "no-installations",
      type: "WARNING",
      title: "Nenhuma Instalação Encontrada",
      description: "O agente não detectou diretórios válidos de ERP Syspro neste dispositivo.",
    });
  } else {
    for (const group of groups) {
      if (group.serverInstances.length === 0) {
        diagnostics.push({
          id: `no-server-${group.id}`,
          type: "WARNING",
          title: `Instalação Parcial (${group.rootPath})`,
          description: "Diretório de instalação identificado, porém o executável SysproServer.exe não foi validado.",
        });
      }
    }
  }

  for (const server of serverInstances) {
    if (server.execution.serviceStatus && server.execution.serviceStatus !== "running") {
      diagnostics.push({
        id: `stopped-service-${server.id}`,
        type: "CRITICAL",
        title: "Serviço Parado",
        description: `O serviço Syspro Server em ${server.rootPath} está com status: ${server.execution.serviceStatus}.`,
      });
    }

    if (!server.configurationPath) {
      diagnostics.push({
        id: `missing-config-${server.id}`,
        type: "WARNING",
        title: "Arquivo de Configuração Ausente",
        description: `Não foi localizado o arquivo SysproServer.ini em ${server.rootPath}.`,
      });
    }
  }

  if (diagnostics.length === 0) {
    diagnostics.push({
      id: "all-healthy",
      type: "HEALTHY",
      title: "Ambiente ERP Saudável",
      description: "Não foram encontradas divergências de caminhos, serviços parados ou inconsistências de configuração neste dispositivo.",
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Diagnósticos e Divergências de ERP</h3>

        <div className="space-y-3">
          {diagnostics.map((diag) => {
            let icon = <Info className="h-5 w-5 text-blue-500" />;
            let badgeStyle = "bg-blue-500/10 text-blue-600 border-blue-500/20";

            if (diag.type === "CRITICAL") {
              icon = <AlertTriangle className="h-5 w-5 text-red-500" />;
              badgeStyle = "bg-red-500/10 text-red-600 border-red-500/20";
            } else if (diag.type === "WARNING") {
              icon = <AlertTriangle className="h-5 w-5 text-amber-500" />;
              badgeStyle = "bg-amber-500/10 text-amber-600 border-amber-500/20";
            } else if (diag.type === "HEALTHY") {
              icon = <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
              badgeStyle = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
            }

            return (
              <div
                key={diag.id}
                className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/40 p-4 text-sm"
              >
                <div className="mt-0.5">{icon}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{diag.title}</span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${badgeStyle}`}>
                      {diag.type}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">{diag.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
