"use client";

import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";

type Props = {
  details: RemoteHostDetails;
};

export function ErpVersionsView({ details }: Props) {
  const versions = {
    installed: "1.0.0.0",
    approved: "1.0.4.0",
    minimum: "1.0.2.0",
    status: "Desatualizada",
    updatedAt: "02/02/2026",
    source: "data dos binários principais",
    confidence: "estimada",
    hash: "a1b2c3d4e5f6g7h8i9j0"
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <h4 className="font-semibold text-lg text-foreground">Situação da Versão</h4>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            versions.status === 'Atualizada' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
          }`}>
            {versions.status}
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mt-6">
          <div className="flex flex-col gap-1 p-3 bg-muted/30 rounded-lg border border-border/50">
            <span className="text-muted-foreground">Versão instalada</span>
            <span className="font-bold text-lg">{versions.installed}</span>
          </div>
          <div className="flex flex-col gap-1 p-3 bg-muted/30 rounded-lg border border-border/50">
            <span className="text-muted-foreground">Versão homologada</span>
            <span className="font-bold text-lg">{versions.approved}</span>
          </div>
          <div className="flex flex-col gap-1 p-3 bg-muted/30 rounded-lg border border-border/50">
            <span className="text-muted-foreground">Versão mínima suportada</span>
            <span className="font-bold text-lg">{versions.minimum}</span>
          </div>
        </div>

        <div className="mt-8">
          <h5 className="font-medium text-sm mb-3">Detalhes da identificação</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 text-sm">
            <div>
              <span className="text-muted-foreground block mb-1">Data da atualização</span>
              <span className="font-medium">{versions.updatedAt}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Fonte da data</span>
              <span className="font-medium">{versions.source}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Confiança da informação</span>
              <span className="font-medium capitalize">{versions.confidence}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Hash do executável</span>
              <span className="font-medium font-mono text-xs">{versions.hash}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
