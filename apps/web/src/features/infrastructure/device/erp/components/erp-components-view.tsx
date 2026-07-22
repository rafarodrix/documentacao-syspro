"use client";

import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { formatDateTime } from "@/features/remote/interface/host-details/host-details.helpers";

type Props = {
  details: RemoteHostDetails;
};

export function ErpComponentsView({ details }: Props) {
  const contexts = details.installationContexts ?? [];
  const serviceStatus = details.host?.serviceStatus ?? details.agentHealth?.serviceStatus ?? null;
  const lastHeartbeatAt = details.host?.agent?.lastHeartbeatSuccessAt ?? null;
  const rustdeskAlias = details.host?.agent?.lastKnownRustDeskAlias ?? details.host?.agent?.rustdeskId ?? null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-4">Componentes Independentes do Host</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border/50 bg-background/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">Syspro Server Service</span>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                serviceStatus === "active" || serviceStatus === "running"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              }`}>
                {serviceStatus ?? "Desconhecido"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Status do agente remoto e serviço de monitoramento local.</p>
            <div className="text-xs font-mono text-muted-foreground pt-1">
              Último heartbeat: {formatDateTime(lastHeartbeatAt)}
            </div>
          </div>

          <div className="rounded-lg border border-border/50 bg-background/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">Firebird Database Server</span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {contexts.find((c) => c.update.firebirdVersion)?.update.firebirdVersion ?? "Firebird Relacional"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Motor de banco de dados relacional associado às instalações ERP.</p>
            <div className="text-xs font-mono text-muted-foreground pt-1">
              Caminho: {contexts.find((c) => c.update.firebirdPath)?.update.firebirdPath ?? "Sem leitura"}
            </div>
          </div>

          <div className="rounded-lg border border-border/50 bg-background/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">IIS & API Subsystems</span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                ISAPI / Web Service
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Módulo de integração Web e endpoints de comunicação HTTP/REST.</p>
          </div>

          <div className="rounded-lg border border-border/50 bg-background/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">RustDesk / Remote Support Agent</span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                {rustdeskAlias ? "Ativo" : "Inativo"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Agente de suporte e acesso remoto do dispositivo.</p>
            <div className="text-xs font-mono text-muted-foreground pt-1">
              Alias: {rustdeskAlias ?? "Sem alias"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
