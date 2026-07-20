"use client";

import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { formatDateTime, readSysproInstallationGroups } from "@/features/remote/interface/host-details/host-details.helpers";

type Props = {
  details: RemoteHostDetails;
};

export function ErpInstallationsView({ details }: Props) {
  const groups = readSysproInstallationGroups(details.agentTelemetry.sysproVersionSnapshot);

  return (
    <div className="space-y-4">
      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 bg-card p-6 text-sm text-muted-foreground">
          Nenhuma instalacao Syspro validada pelo agente neste dispositivo.
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.id} className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold text-foreground">{group.rootPath}</h4>
                <span className="text-sm text-muted-foreground">
                  Classificacao: {group.classification ?? "Sem leitura"}
                </span>
              </div>
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {group.serverInstances.length} instancia{group.serverInstances.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="space-y-4">
              {group.serverInstances.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/50 bg-background/30 p-4 text-sm text-muted-foreground">
                  Nenhuma instancia de servidor validada neste diretorio.
                </div>
              ) : (
                group.serverInstances.map((server) => (
                  <div
                    key={server.id}
                    className="grid grid-cols-1 gap-y-4 rounded-lg border border-border/50 bg-background/30 p-4 text-sm md:grid-cols-2"
                  >
                    <div>
                      <span className="mb-1 block text-muted-foreground">Servidor</span>
                      <span className="rounded bg-muted/50 px-2 py-1 font-mono text-xs font-medium">
                        {server.rootPath}
                      </span>
                    </div>
                    <div>
                      <span className="mb-1 block text-muted-foreground">Executavel</span>
                      <span className="rounded bg-muted/50 px-2 py-1 font-mono text-xs font-medium">
                        {server.executablePath ?? "Sem leitura"}
                      </span>
                    </div>
                    <div>
                      <span className="mb-1 block text-muted-foreground">Atualizado em</span>
                      <span className="font-medium">{formatDateTime(server.updatedAt)}</span>
                    </div>
                    <div>
                      <span className="mb-1 block text-muted-foreground">Diretorio de dados</span>
                      <span className="rounded bg-muted/50 px-2 py-1 font-mono text-xs font-medium">
                        {server.dataDirectories.map((entry) => entry.path).join(", ") || "Sem leitura"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
