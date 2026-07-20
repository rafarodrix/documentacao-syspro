"use client";

import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";

type Props = {
  details: RemoteHostDetails;
};

export function ErpInstallationsView({ details }: Props) {
  // Mock data for installation
  const installation = {
    id: "inst-1",
    path: "C:\\Syspro",
    classification: "Servidor e cliente",
    serverPath: "C:\\Syspro\\Server",
    executablePath: "C:\\Syspro\\Server\\SysproServer.exe",
    version: "1.0.0.0",
    updatedAt: "02/02/2026 às 12:09",
    suggestedDataDir: "C:\\Syspro\\Server\\Data"
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="font-semibold text-lg text-foreground">{installation.path}</h4>
            <span className="text-sm text-muted-foreground">Classificação: {installation.classification}</span>
          </div>
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary border-primary/20">
            v{installation.version}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 text-sm mt-4">
          <div>
            <span className="text-muted-foreground block mb-1">Servidor</span>
            <span className="font-medium font-mono text-xs bg-muted/50 px-2 py-1 rounded">{installation.serverPath}</span>
          </div>
          <div>
            <span className="text-muted-foreground block mb-1">Executável</span>
            <span className="font-medium font-mono text-xs bg-muted/50 px-2 py-1 rounded">{installation.executablePath}</span>
          </div>
          <div>
            <span className="text-muted-foreground block mb-1">Atualizado em</span>
            <span className="font-medium">{installation.updatedAt}</span>
          </div>
          <div>
            <span className="text-muted-foreground block mb-1">Diretório de dados sugerido</span>
            <span className="font-medium font-mono text-xs bg-muted/50 px-2 py-1 rounded">{installation.suggestedDataDir}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
