"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dosc-syspro/ui";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { DiagnosticsSoftwareView } from "./diagnostics-software-view";
import { DiagnosticsSysproView } from "./diagnostics-syspro-view";
import { DiagnosticsSummaryView } from "./diagnostics-summary-view";
import { DiagnosticsHardwareView } from "./diagnostics-hardware-view";
import { DiagnosticsSystemView } from "./diagnostics-system-view";
import { DiagnosticsServicesView } from "./diagnostics-services-view";
import { DiagnosticsNetworkView } from "./diagnostics-network-view";
import { DiagnosticsStorageView } from "./diagnostics-storage-view";
import { DiagnosticsPerformanceView } from "./diagnostics-performance-view";

type Props = {
  details: RemoteHostDetails;
};

export function HostDiagnosticsTab({ details }: Props) {
  const telemetry = details.agentTelemetry;

  return (
    <Tabs defaultValue="resumo" className="space-y-6">
      <div className="flex w-full overflow-x-auto pb-2 scrollbar-thin">
        <TabsList className="flex h-auto w-max min-w-full items-center justify-start gap-1 p-1">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="desempenho">Desempenho</TabsTrigger>
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
        <DiagnosticsSummaryView details={details} />
      </TabsContent>

      <TabsContent value="desempenho" className="m-0 space-y-6">
        <DiagnosticsPerformanceView host={details.host} diskSnapshot={telemetry.diskSnapshot} />
      </TabsContent>

      <TabsContent value="hardware" className="m-0 space-y-6">
        <DiagnosticsHardwareView hardwareIdentity={telemetry.hardwareIdentity} hardwareIdentityAt={telemetry.hardwareIdentityAt} />
      </TabsContent>

      <TabsContent value="sistema" className="m-0 space-y-6">
        <DiagnosticsSystemView systemSnapshot={telemetry.systemSnapshot} systemSnapshotAt={telemetry.systemSnapshotAt} />
      </TabsContent>

      <TabsContent value="softwares" className="m-0 space-y-6">
        <DiagnosticsSoftwareView
          softwareSnapshot={telemetry.softwareSnapshot}
          softwareSnapshotAt={telemetry.softwareSnapshotAt}
        />
      </TabsContent>

      <TabsContent value="servicos" className="m-0 space-y-6">
        <DiagnosticsServicesView
          systemSnapshot={telemetry.systemSnapshot}
          sysproProcessSnapshot={telemetry.sysproProcessSnapshot}
          sysproProcessSnapshotAt={telemetry.sysproProcessSnapshotAt}
        />
      </TabsContent>

      <TabsContent value="rede" className="m-0 space-y-6">
        <DiagnosticsNetworkView networkSnapshot={telemetry.networkSnapshot} networkSnapshotAt={telemetry.networkSnapshotAt} />
      </TabsContent>

      <TabsContent value="armazenamento" className="m-0 space-y-6">
        <DiagnosticsStorageView diskSnapshot={telemetry.diskSnapshot} diskSnapshotAt={telemetry.diskSnapshotAt} />
      </TabsContent>

      <TabsContent value="syspro" className="m-0 space-y-6">
        <DiagnosticsSysproView sysproVersionSnapshot={telemetry.sysproVersionSnapshot as any} sysproVersionSnapshotAt={telemetry.sysproVersionSnapshotAt} />
      </TabsContent>
    </Tabs>
  );
}
