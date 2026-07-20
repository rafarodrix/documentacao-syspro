"use client";

import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";

type Props = {
  details: RemoteHostDetails;
};

export function ErpDatabaseView({ details }: Props) {
  const database = {
    name: "Firebird — Produção",
    version: "5.0.1.1469",
    serviceName: "FirebirdServerDefaultInstance",
    state: "Parado",
    port: 3050,
    dbCount: 2,
    directories: [
      "C:\\Syspro\\Server\\Data",
      "D:\\DadosSyspro"
    ]
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <h4 className="font-semibold text-lg text-foreground">{database.name}</h4>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            database.state === 'Rodando' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'
          }`}>
            Estado: {database.state}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 text-sm mt-4">
          <div>
            <span className="text-muted-foreground block mb-1">Versão</span>
            <span className="font-medium">{database.version}</span>
          </div>
          <div>
            <span className="text-muted-foreground block mb-1">Serviço Windows</span>
            <span className="font-medium">{database.serviceName}</span>
          </div>
          <div>
            <span className="text-muted-foreground block mb-1">Porta</span>
            <span className="font-medium">{database.port}</span>
          </div>
          <div>
            <span className="text-muted-foreground block mb-1">Bancos identificados</span>
            <span className="font-medium">{database.dbCount}</span>
          </div>
          
          <div className="col-span-2 mt-2">
            <span className="text-muted-foreground block mb-2">Diretórios</span>
            <div className="flex flex-col gap-1">
              {database.directories.map((dir, idx) => (
                <span key={idx} className="font-medium font-mono text-xs bg-muted/50 px-2 py-1 rounded w-fit">{dir}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
