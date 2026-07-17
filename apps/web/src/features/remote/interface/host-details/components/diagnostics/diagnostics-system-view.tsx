"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from "@dosc-syspro/ui";
import { formatDateTime } from "../../host-details.helpers";

type Props = {
  systemSnapshot: Record<string, unknown> | null;
  systemSnapshotAt: string | null;
};

export function DiagnosticsSystemView({ systemSnapshot, systemSnapshotAt }: Props) {
  const displayDate = systemSnapshotAt ? formatDateTime(systemSnapshotAt) : "Nunca";

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

  const getBootTime = () => {
    if (sys.lastBootUpTime) {
      // Assuming it's a timestamp string or standard date string
      try {
        const date = new Date(sys.lastBootUpTime as string);
        if (!isNaN(date.getTime())) {
          return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
        }
      } catch {
        // ignore
      }
    }
    return "Desconhecido";
  };

  const getInstallDate = () => {
    if (sys.installDate) {
      try {
        const date = new Date(sys.installDate as string);
        if (!isNaN(date.getTime())) {
          return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
        }
      } catch {
        // ignore
      }
    }
    return "Desconhecido";
  };

  const fields = [
    { label: "Windows e Edição", value: (sys.osName as string) || "Desconhecido" },
    { label: "Versão (Build)", value: (sys.osVersion as string) || "Desconhecido" },
    { label: "Arquitetura", value: (sys.osArchitecture as string) || "Desconhecido" },
    { label: "Data de Instalação", value: getInstallDate() },
    { label: "Último Boot", value: getBootTime() },
    { label: "Usuário Atual", value: (sys.currentUser as string) || "Nenhum / Desconhecido" },
    { label: "Domínio / Workgroup", value: (sys.domain as string) || (sys.workgroup as string) || "Desconhecido" },
    { label: "Timezone", value: (sys.timezone as string) || "Desconhecido" },
    { label: "PowerShell", value: (sys.powershellVersion as string) ? `v${sys.powershellVersion}` : "Desconhecido" },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Inventário do Sistema</CardTitle>
            <CardDescription>
              Informações sobre o sistema operacional.
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
    </div>
  );
}
