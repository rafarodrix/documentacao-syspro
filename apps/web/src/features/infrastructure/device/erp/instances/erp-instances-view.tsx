"use client";

import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";

type Props = {
  details: RemoteHostDetails;
};

export function ErpInstancesView({ details }: Props) {
  // Mock data for instances
  const instances = [
    {
      id: "inst-1",
      name: "Syspro Server — Produção",
      executable: "C:\\Syspro\\Server\\SysproServer.exe",
      config: "C:\\Syspro\\Server\\SysproServer.ini",
      port: 1234,
      expectedState: "Rodando",
      currentState: "Rodando"
    },
    {
      id: "inst-2",
      name: "Syspro Server — Homologação",
      executable: "D:\\SysproHml\\Server\\SysproServer.exe",
      config: "", // not provided in mock
      port: 2234,
      expectedState: "Rodando",
      currentState: "Parado"
    }
  ];

  return (
    <div className="space-y-4">
      {instances.map(instance => (
        <div key={instance.id} className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h4 className="font-semibold text-lg text-foreground">{instance.name}</h4>
            <div className="flex gap-2 text-xs font-semibold">
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 ${
                instance.currentState === 'Rodando' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'
              }`}>
                Estado atual: {instance.currentState}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 text-sm mt-4">
            <div className="col-span-2">
              <span className="text-muted-foreground block mb-1">Executável</span>
              <span className="font-medium font-mono text-xs bg-muted/50 px-2 py-1 rounded">{instance.executable}</span>
            </div>
            {instance.config && (
              <div className="col-span-2">
                <span className="text-muted-foreground block mb-1">Configuração</span>
                <span className="font-medium font-mono text-xs bg-muted/50 px-2 py-1 rounded">{instance.config}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground block mb-1">Porta</span>
              <span className="font-medium">{instance.port}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Estado esperado</span>
              <span className="font-medium">{instance.expectedState}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
