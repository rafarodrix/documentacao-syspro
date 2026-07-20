"use client";

import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";

type Props = {
  details: RemoteHostDetails;
};

export function ErpApiIisView({ details }: Props) {
  const apiInfo = {
    name: "IIS",
    state: "Rodando",
    appPool: "SysproServerPool",
    physicalDir: "C:\\Syspro\\Server",
    dll: "SysproServerISAPI.dll",
    endpoint: "http://localhost:1234",
    lastValidation: "Há 2 minutos"
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <h4 className="font-semibold text-lg text-foreground">{apiInfo.name}</h4>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            apiInfo.state === 'Rodando' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'
          }`}>
            Estado: {apiInfo.state}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 text-sm mt-4">
          <div>
            <span className="text-muted-foreground block mb-1">Application Pool</span>
            <span className="font-medium">{apiInfo.appPool}</span>
          </div>
          <div>
            <span className="text-muted-foreground block mb-1">DLL ISAPI</span>
            <span className="font-medium font-mono text-xs">{apiInfo.dll}</span>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground block mb-1">Diretório Físico</span>
            <span className="font-medium font-mono text-xs bg-muted/50 px-2 py-1 rounded">{apiInfo.physicalDir}</span>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground block mb-1">Endpoint</span>
            <span className="font-medium text-primary hover:underline cursor-pointer">{apiInfo.endpoint}</span>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground block mb-1">Última validação</span>
            <span className="font-medium">{apiInfo.lastValidation}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
