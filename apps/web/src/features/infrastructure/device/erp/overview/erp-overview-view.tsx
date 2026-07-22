"use client";

import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { formatDateTime } from "@/features/remote/interface/host-details/host-details.helpers";

type Props = {
  details: RemoteHostDetails;
};

export function ErpOverviewView({ details }: Props) {
  const installations = details.erpInstallations;
  const installationsCount = installations.length;
  const operationalInstallations = installations.filter((installation) => installation.serviceStatus === "running").length;
  const attentionInstallations = installationsCount - operationalInstallations;
  const mainVersion = installations.find((installation) => installation.version)?.version ?? "Sem leitura";
  const latestCollection = installations.length ? formatDateTime(installations.reduce((latest, installation) => installation.lastSeenAt > latest ? installation.lastSeenAt : latest, installations[0].lastSeenAt)) : "Sem leitura";
  const companiesCount = new Set(installations.flatMap((installation) => installation.companies.filter((company) => company.active).map((company) => company.companyId ?? company.code))).size;
  const firebirdCount = new Set(details.installationContexts.filter((context) => context.update.firebirdPath || context.update.firebirdVersion).map((context) => context.update.firebirdPath ?? context.update.firebirdVersion)).size;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
          <h4 className="text-sm font-medium text-muted-foreground">Instalações</h4>
          <div className="mt-3 flex flex-col gap-1">
            <span className="text-2xl font-bold">{installationsCount} instalacoes</span>
            <span className="text-sm text-muted-foreground">Estado técnico consolidado</span>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="font-medium text-emerald-500">{operationalInstallations} em execução</span>
              <span className="font-medium text-amber-500">{attentionInstallations} sem execução confirmada</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
          <h4 className="text-sm font-medium text-muted-foreground">Versao principal</h4>
          <div className="mt-3 flex flex-col gap-1">
            <span className="text-2xl font-bold">{mainVersion}</span>
            <span className="text-sm text-muted-foreground">Última coleta: {latestCollection}</span>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
          <h4 className="text-sm font-medium text-muted-foreground">Firebird</h4>
          <div className="mt-3 flex flex-col gap-1">
            <span className="text-2xl font-bold">{firebirdCount} detectado{firebirdCount === 1 ? "" : "s"}</span>
            <span className="mt-2 text-xs text-muted-foreground">Somente leituras confirmadas pelo agente.</span>
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
