"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from "@dosc-syspro/ui";
import { formatDateTime } from "../../host-details.helpers";

type Props = {
  hardwareIdentity: Record<string, unknown> | null;
  hardwareIdentityAt: string | null;
};

export function InventoryHardwareView({ hardwareIdentity, hardwareIdentityAt }: Props) {
  const displayDate = hardwareIdentityAt ? formatDateTime(hardwareIdentityAt) : "Nunca";

  if (!hardwareIdentity) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 text-center text-muted-foreground">
          Dados de hardware não disponíveis.
        </CardContent>
      </Card>
    );
  }

  const hw = hardwareIdentity;

  const fields = [
    { label: "Fabricante", value: (hw.manufacturer as string) || "Desconhecido" },
    { label: "Modelo", value: (hw.model as string) || "Desconhecido" },
    { label: "Placa-Mãe", value: (hw.baseboard as string) || "Desconhecido" },
    { label: "Processador", value: (hw.cpu as string) || "Desconhecido" },
    { label: "Arquitetura", value: (hw.architecture as string) || "Desconhecido" },
    { label: "Memória Física", value: hw.totalMemoryBytes ? `${Math.round(Number(hw.totalMemoryBytes) / (1024 * 1024 * 1024))} GB` : "Desconhecido" },
    { label: "BIOS", value: (hw.biosVersion as string) || "Desconhecido" },
    { label: "Número de Série", value: (hw.serialNumber as string) || "Não reportado" },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Inventário de Hardware</CardTitle>
            <CardDescription>
              Especificações físicas do dispositivo.
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
