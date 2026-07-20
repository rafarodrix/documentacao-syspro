"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dosc-syspro/ui";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { ErpOverviewView } from "./overview/erp-overview-view";
import { ErpInstallationsView } from "./installations/erp-installations-view";
import { ErpInstancesView } from "./instances/erp-instances-view";
import { ErpDatabaseView } from "./database/erp-database-view";
import { ErpApiIisView } from "./api-iis/erp-api-iis-view";
import { ErpVersionsView } from "./versions/erp-versions-view";
import { ErpCompaniesView } from "./companies/erp-companies-view";

type Props = {
  details: RemoteHostDetails;
};

export function ErpTab({ details }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight">Syspro ERP</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie as instalações, instâncias e componentes do Syspro neste dispositivo.
        </p>
      </div>

      <Tabs defaultValue="resumo" className="space-y-6">
        <div className="flex w-full overflow-x-auto pb-2 scrollbar-thin">
          <TabsList className="flex h-auto w-max min-w-full items-center justify-start gap-1 p-1">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="instalacoes">Instalações</TabsTrigger>
            <TabsTrigger value="instancias">Instâncias</TabsTrigger>
            <TabsTrigger value="banco">Banco de dados</TabsTrigger>
            <TabsTrigger value="api">API e IIS</TabsTrigger>
            <TabsTrigger value="versoes">Versões</TabsTrigger>
            <TabsTrigger value="empresas">Empresas</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="resumo" className="m-0 space-y-6">
          <ErpOverviewView details={details} />
        </TabsContent>

        <TabsContent value="instalacoes" className="m-0 space-y-6">
          <ErpInstallationsView details={details} />
        </TabsContent>

        <TabsContent value="instancias" className="m-0 space-y-6">
          <ErpInstancesView details={details} />
        </TabsContent>

        <TabsContent value="banco" className="m-0 space-y-6">
          <ErpDatabaseView details={details} />
        </TabsContent>

        <TabsContent value="api" className="m-0 space-y-6">
          <ErpApiIisView details={details} />
        </TabsContent>

        <TabsContent value="versoes" className="m-0 space-y-6">
          <ErpVersionsView details={details} />
        </TabsContent>

        <TabsContent value="empresas" className="m-0 space-y-6">
          <ErpCompaniesView details={details} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
