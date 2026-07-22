"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dosc-syspro/ui";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { ErpOverviewView } from "./overview/erp-overview-view";
import { ErpInstallationsView } from "./installations/erp-installations-view";
import { ErpComponentsView } from "./components/erp-components-view";
import { ErpDiagnosticsView } from "./diagnostics/erp-diagnostics-view";

type Props = {
  details: RemoteHostDetails;
};

export function ErpTab({ details }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight">Syspro ERP</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie as instalações, componentes e diagnósticos do Syspro neste dispositivo.
        </p>
      </div>

      <Tabs defaultValue="resumo" className="space-y-6">
        <div className="flex w-full overflow-x-auto pb-2 scrollbar-thin">
          <TabsList className="flex h-auto w-max min-w-full items-center justify-start gap-1 p-1">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="instalacoes">Instalações</TabsTrigger>
            <TabsTrigger value="componentes">Componentes</TabsTrigger>
            <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="resumo" className="m-0 space-y-6">
          <ErpOverviewView details={details} />
        </TabsContent>

        <TabsContent value="instalacoes" className="m-0 space-y-6">
          <ErpInstallationsView details={details} />
        </TabsContent>

        <TabsContent value="componentes" className="m-0 space-y-6">
          <ErpComponentsView details={details} />
        </TabsContent>

        <TabsContent value="diagnostico" className="m-0 space-y-6">
          <ErpDiagnosticsView details={details} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
