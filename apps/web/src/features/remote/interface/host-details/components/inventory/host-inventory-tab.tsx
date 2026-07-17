"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dosc-syspro/ui";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { InventorySoftwareView } from "./inventory-software-view";
import { InventorySysproView } from "./inventory-syspro-view";
import { InventorySummaryView } from "./inventory-summary-view";
import { InventoryHardwareView } from "./inventory-hardware-view";
import { InventorySystemView } from "./inventory-system-view";
import { InventoryServicesView } from "./inventory-services-view";
import { InventoryNetworkView } from "./inventory-network-view";
import { InventoryStorageView } from "./inventory-storage-view";

type Props = {
  details: RemoteHostDetails;
};

export function HostInventoryTab({ details }: Props) {
  const telemetry = details.agentTelemetry;

  return (
    <Tabs defaultValue="resumo" className="space-y-6">
      <div className="flex w-full overflow-x-auto pb-2 scrollbar-thin">
        <TabsList className="flex h-auto w-max min-w-full items-center justify-start gap-1 p-1">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="hardware">Hardware</TabsTrigger>
          <TabsTrigger value="sistema">Sistema</TabsTrigger>
          <TabsTrigger value="softwares">Softwares instalados</TabsTrigger>
          <TabsTrigger value="servicos">Serviços Windows</TabsTrigger>
          <TabsTrigger value="rede">Rede</TabsTrigger>
          <TabsTrigger value="armazenamento">Armazenamento</TabsTrigger>
          <TabsTrigger value="syspro">Instalações Syspro</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="resumo" className="m-0 space-y-6">
        <InventorySummaryView details={details} />
      </TabsContent>

      <TabsContent value="hardware" className="m-0 space-y-6">
        <InventoryHardwareView hardwareIdentity={telemetry.hardwareIdentity} hardwareIdentityAt={telemetry.hardwareIdentityAt} />
      </TabsContent>

      <TabsContent value="sistema" className="m-0 space-y-6">
        <InventorySystemView systemSnapshot={telemetry.systemSnapshot} systemSnapshotAt={telemetry.systemSnapshotAt} />
      </TabsContent>

      <TabsContent value="softwares" className="m-0 space-y-6">
        <InventorySoftwareView
          softwareSnapshot={telemetry.softwareSnapshot}
          softwareSnapshotAt={telemetry.softwareSnapshotAt}
        />
      </TabsContent>

      <TabsContent value="servicos" className="m-0 space-y-6">
        <InventoryServicesView
          systemSnapshot={telemetry.systemSnapshot}
          sysproProcessSnapshot={telemetry.sysproProcessSnapshot}
          sysproProcessSnapshotAt={telemetry.sysproProcessSnapshotAt}
        />
      </TabsContent>

      <TabsContent value="rede" className="m-0 space-y-6">
        <InventoryNetworkView networkSnapshot={telemetry.networkSnapshot} networkSnapshotAt={telemetry.networkSnapshotAt} />
      </TabsContent>

      <TabsContent value="armazenamento" className="m-0 space-y-6">
        <InventoryStorageView diskSnapshot={telemetry.diskSnapshot} diskSnapshotAt={telemetry.diskSnapshotAt} />
      </TabsContent>

      <TabsContent value="syspro" className="m-0 space-y-6">
        <InventorySysproView sysproVersionSnapshot={telemetry.sysproVersionSnapshot as any} sysproVersionSnapshotAt={telemetry.sysproVersionSnapshotAt} />
      </TabsContent>
    </Tabs>
  );
}
