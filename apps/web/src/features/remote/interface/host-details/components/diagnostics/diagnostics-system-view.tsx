"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from "@dosc-syspro/ui";
import { formatDateTime } from "../../host-details.helpers";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type Props = {
  systemSnapshot: Record<string, unknown> | null;
  systemSnapshotAt: string | null;
  windowsUpdateStatus: Record<string, unknown> | null;
  windowsUpdateStatusAt: string | null;
};

export function DiagnosticsSystemView({ systemSnapshot, systemSnapshotAt, windowsUpdateStatus, windowsUpdateStatusAt }: Props) {
  const displayDate = systemSnapshotAt ? formatDateTime(systemSnapshotAt) : "Nunca";
  const displayUpdateDate = windowsUpdateStatusAt ? formatDateTime(windowsUpdateStatusAt) : "Nunca";

  if (!systemSnapshot) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 text-center text-muted-foreground">
          Dados de sistema não disponíveis.
        </CardContent>
      </Card>
    );
  }

  const sys = systemSnapshot;
  const wu = windowsUpdateStatus || {};

  const fields = [
    { label: "Hostname", value: (sys.hostname as string) || "Desconhecido" },
    { label: "Nome do Computador", value: (sys.computerName as string) || "Desconhecido" },
    { label: "Windows e Edição", value: (sys.osName as string) || "Desconhecido" },
    { label: "Versão", value: (sys.osVersion as string) || "Desconhecido" },
    { label: "OS Build", value: (sys.osBuild as string) || "Desconhecido" },
    { label: "Arquitetura", value: (sys.osArchitecture as string) || "Desconhecido" },
  ];

  const rebootRequired = wu.rebootRequired === true;
  const pendingCount = typeof wu.pendingCount === "number" ? wu.pendingCount : 0;
  const pendingSignals = Array.isArray(wu.pendingSignals) ? wu.pendingSignals.join(", ") : "";

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Inventário do Sistema</CardTitle>
            <CardDescription>
              Informações básicas de identidade do sistema operacional.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit border-border/60 bg-background/70 text-muted-foreground">
            Última coleta: {displayDate}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 gap-y-4 grid-cols-1 md:grid-cols-2 text-sm">
            {fields.map((field) => (
              <div key={field.label} className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border/30">
                <span className="text-muted-foreground whitespace-nowrap mr-4">{field.label}</span>
                <span className="font-medium text-foreground sm:text-right">{field.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Windows Update</CardTitle>
            <CardDescription>
              Status das atualizações do Windows e necessidade de reinicialização.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit border-border/60 bg-background/70 text-muted-foreground">
            Última coleta: {displayUpdateDate}
          </Badge>
        </CardHeader>
        <CardContent>
          {Object.keys(wu).length === 0 ? (
            <div className="text-center text-muted-foreground py-4 text-sm">Dados do Windows Update não disponíveis.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 bg-background/50">
                {rebootRequired ? (
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                )}
                <div>
                  <div className="font-medium">
                    {rebootRequired ? "Reinicialização Pendente" : "Nenhuma Reinicialização Pendente"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {rebootRequired 
                      ? "O sistema precisa ser reiniciado para concluir a instalação de atualizações ou outros componentes."
                      : "O sistema não reportou necessidade de reinicialização imediata."}
                  </div>
                </div>
              </div>

              <div className="grid gap-x-8 gap-y-4 grid-cols-1 md:grid-cols-2 text-sm">
                <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border/30">
                  <span className="text-muted-foreground whitespace-nowrap mr-4">Atualizações Pendentes</span>
                  <span className="font-medium text-foreground sm:text-right">{pendingCount} pacote(s)</span>
                </div>
                {pendingSignals && (
                  <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border/30">
                    <span className="text-muted-foreground whitespace-nowrap mr-4">Sinais Identificados</span>
                    <span className="font-medium text-foreground sm:text-right truncate max-w-[200px]" title={pendingSignals}>
                      {pendingSignals}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
