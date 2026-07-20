"use client";

import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { readSysproInstallationGroups } from "@/features/remote/interface/host-details/host-details.helpers";

type Props = {
  details: RemoteHostDetails;
};

function resolveRuntimeState(input: {
  processRunning: boolean | null;
  serviceStatus: string | null;
  validationStatus: string | null;
}) {
  if (input.processRunning || input.serviceStatus === "running") {
    return {
      label: "Rodando",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
    };
  }

  if (input.serviceStatus === "stopped") {
    return {
      label: "Parado",
      className: "border-destructive/20 bg-destructive/10 text-destructive",
    };
  }

  if (input.serviceStatus === "starting" || input.serviceStatus === "stopping") {
    return {
      label: input.serviceStatus === "starting" ? "Iniciando" : "Parando",
      className: "border-amber-500/20 bg-amber-500/10 text-amber-600",
    };
  }

  if (input.validationStatus === "VALIDATED") {
    return {
      label: "Detectado",
      className: "border-primary/20 bg-primary/10 text-primary",
    };
  }

  return {
    label: "Sem leitura",
    className: "border-border/50 bg-muted/40 text-muted-foreground",
  };
}

export function ErpInstancesView({ details }: Props) {
  const instances = readSysproInstallationGroups(details.agentTelemetry.sysproVersionSnapshot).flatMap((group) =>
    group.serverInstances.map((server) => ({
      groupRootPath: group.rootPath,
      ...server,
    })),
  );

  return (
    <div className="space-y-4">
      {instances.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 bg-card p-6 text-sm text-muted-foreground">
          Nenhuma instancia Syspro validada pelo agente neste dispositivo.
        </div>
      ) : (
        instances.map((instance) => {
          const runtimeState = resolveRuntimeState({
            processRunning: instance.execution.processRunning,
            serviceStatus: instance.execution.serviceStatus,
            validationStatus: instance.validationStatus,
          });

          return (
            <div key={instance.id} className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold text-foreground">Syspro Server</h4>
                  <p className="text-sm text-muted-foreground">{instance.rootPath}</p>
                </div>
                <div className="flex gap-2 text-xs font-semibold">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 ${runtimeState.className}`}>
                    Estado atual: {runtimeState.label}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-y-4 text-sm md:grid-cols-2">
                <div className="col-span-2">
                  <span className="mb-1 block text-muted-foreground">Diretorio base</span>
                  <span className="rounded bg-muted/50 px-2 py-1 font-mono text-xs font-medium">
                    {instance.groupRootPath}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="mb-1 block text-muted-foreground">Executavel</span>
                  <span className="rounded bg-muted/50 px-2 py-1 font-mono text-xs font-medium">
                    {instance.executablePath ?? "Sem leitura"}
                  </span>
                </div>
                {instance.configurationPath ? (
                  <div className="col-span-2">
                    <span className="mb-1 block text-muted-foreground">Configuracao</span>
                    <span className="rounded bg-muted/50 px-2 py-1 font-mono text-xs font-medium">
                      {instance.configurationPath}
                    </span>
                  </div>
                ) : null}
                <div>
                  <span className="mb-1 block text-muted-foreground">Status do servico</span>
                  <span className="font-medium">{instance.execution.serviceStatus ?? "Sem leitura"}</span>
                </div>
                <div>
                  <span className="mb-1 block text-muted-foreground">Validacao</span>
                  <span className="font-medium">{instance.validationStatus ?? "Sem leitura"}</span>
                </div>
                <div>
                  <span className="mb-1 block text-muted-foreground">PID</span>
                  <span className="font-medium">{instance.execution.pid ? String(instance.execution.pid) : "Sem leitura"}</span>
                </div>
                <div>
                  <span className="mb-1 block text-muted-foreground">Versao</span>
                  <span className="font-medium">{instance.productVersion ?? instance.fileVersion ?? "Sem leitura"}</span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
