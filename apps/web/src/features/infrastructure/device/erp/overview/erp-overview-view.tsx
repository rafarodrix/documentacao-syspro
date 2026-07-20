"use client";

import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";

type Props = {
  details: RemoteHostDetails;
};

export function ErpOverviewView({ details }: Props) {
  // Mock data based on the specification
  const installationsCount = 2;
  const instancesCount = 2;
  const operationalInstances = 1;
  const attentionInstances = 1;
  
  const mainVersion = "1.0.0.0";
  const firebirdRunning = 1;
  const firebirdStopped = 1;
  const companiesCount = 3;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Instalações e Instâncias */}
        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
          <h4 className="text-sm font-medium text-muted-foreground">Instalações e Instâncias</h4>
          <div className="mt-3 flex flex-col gap-1">
            <span className="text-2xl font-bold">{installationsCount} instalações</span>
            <span className="text-sm text-muted-foreground">{instancesCount} instâncias de servidor</span>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="text-emerald-500 font-medium">{operationalInstances} operacional</span>
              <span className="text-amber-500 font-medium">{attentionInstances} requer atenção</span>
            </div>
          </div>
        </div>

        {/* Versão Principal */}
        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
          <h4 className="text-sm font-medium text-muted-foreground">Versão Principal</h4>
          <div className="mt-3 flex flex-col gap-1">
            <span className="text-2xl font-bold">{mainVersion}</span>
            <span className="text-sm text-muted-foreground">Última validação: Há 2 minutos</span>
          </div>
        </div>

        {/* Firebird */}
        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
          <h4 className="text-sm font-medium text-muted-foreground">Firebird</h4>
          <div className="mt-3 flex flex-col gap-1">
            <span className="text-2xl font-bold">{firebirdRunning + firebirdStopped} detectados</span>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="text-emerald-500 font-medium">{firebirdRunning} operacional</span>
              <span className="text-amber-500 font-medium">{firebirdStopped} parado</span>
            </div>
          </div>
        </div>

        {/* Empresas */}
        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
          <h4 className="text-sm font-medium text-muted-foreground">Empresas Atendidas</h4>
          <div className="mt-3 flex flex-col gap-1">
            <span className="text-2xl font-bold">{companiesCount} empresas</span>
            <span className="text-sm text-muted-foreground">Em {installationsCount} instalações</span>
          </div>
        </div>
      </div>
    </div>
  );
}
