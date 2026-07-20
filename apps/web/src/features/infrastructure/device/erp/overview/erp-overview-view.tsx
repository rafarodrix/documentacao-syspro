"use client";

import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { formatDateTime, readSysproInstallationGroups } from "@/features/remote/interface/host-details/host-details.helpers";

type Props = {
  details: RemoteHostDetails;
};

export function ErpOverviewView({ details }: Props) {
  const groups = readSysproInstallationGroups(details.agentTelemetry.sysproVersionSnapshot);
  const serverInstances = groups.flatMap((group) => group.serverInstances);
  const installationsCount = groups.length;
  const instancesCount = serverInstances.length;
  const operationalInstances = serverInstances.filter(
    (server) => server.execution.processRunning || server.execution.serviceStatus === "running",
  ).length;
  const attentionInstances = Math.max(instancesCount - operationalInstances, 0);
  const versionSource = serverInstances.find((server) => server.productVersion || server.fileVersion);
  const mainVersion = versionSource?.productVersion ?? versionSource?.fileVersion ?? "Sem leitura";
  const latestSnapshotAt = details.agentTelemetry.sysproVersionSnapshotAt
    ? formatDateTime(details.agentTelemetry.sysproVersionSnapshotAt)
    : "Sem leitura";
  const companiesCount = new Set(
    details.installationContexts
      .map((context) => context.company?.id ?? context.update.companyLabel)
      .filter((value): value is string => Boolean(value)),
  ).size;
  const firebirdRunning = details.installationContexts.filter((context) => !!context.update.firebirdVersion).length;
  const firebirdStopped = Math.max(details.installationContexts.length - firebirdRunning, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
          <h4 className="text-sm font-medium text-muted-foreground">Instalacoes e instancias</h4>
          <div className="mt-3 flex flex-col gap-1">
            <span className="text-2xl font-bold">{installationsCount} instalacoes</span>
            <span className="text-sm text-muted-foreground">{instancesCount} instancias de servidor</span>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="font-medium text-emerald-500">{operationalInstances} operacional</span>
              <span className="font-medium text-amber-500">{attentionInstances} requer atencao</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
          <h4 className="text-sm font-medium text-muted-foreground">Versao principal</h4>
          <div className="mt-3 flex flex-col gap-1">
            <span className="text-2xl font-bold">{mainVersion}</span>
            <span className="text-sm text-muted-foreground">Ultima coleta: {latestSnapshotAt}</span>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
          <h4 className="text-sm font-medium text-muted-foreground">Firebird</h4>
          <div className="mt-3 flex flex-col gap-1">
            <span className="text-2xl font-bold">{firebirdRunning + firebirdStopped} detectados</span>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="font-medium text-emerald-500">{firebirdRunning} operacional</span>
              <span className="font-medium text-amber-500">{firebirdStopped} parado</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
          <h4 className="text-sm font-medium text-muted-foreground">Empresas atendidas</h4>
          <div className="mt-3 flex flex-col gap-1">
            <span className="text-2xl font-bold">{companiesCount} empresas</span>
            <span className="text-sm text-muted-foreground">Em {installationsCount} instalacoes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
