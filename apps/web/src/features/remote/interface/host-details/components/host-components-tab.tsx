import { HostComponentCard, type ComponentStatus } from "./host-component-card";
import { formatDateTime, formatRelativeHeartbeat } from "../host-details.helpers";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { Button } from "@dosc-syspro/ui";
import { Copy, Terminal, ShieldAlert, MonitorSmartphone, RefreshCw } from "lucide-react";
import { differenceInMinutes } from "@/lib/date";

type HostComponentsTabProps = {
  host: RemoteHostDetails["host"];
  agent: RemoteHostDetails["host"]["agent"];
  details: RemoteHostDetails;
  firebirdData: { name: string | null; version: string | null; processRunning: boolean | null };
  sysproVersionSnapshot: Record<string, unknown> | null;
  onCopyRustDeskId: (value: string | null) => void;
  onConnectRustDesk: () => void;
};

export function HostComponentsTab({
  host,
  agent,
  details,
  firebirdData,
  sysproVersionSnapshot,
  onCopyRustDeskId,
  onConnectRustDesk,
}: HostComponentsTabProps) {
  // 1. Trilink Agent
  let agentStatus: ComponentStatus = "not_installed";
  if (agent.version) {
    const isOffline = agent.lastHeartbeatAt && differenceInMinutes(new Date(), new Date(agent.lastHeartbeatAt)) > 5;
    agentStatus = isOffline ? "failed" : "operational";
  }

  // 2. RustDesk
  const rustDeskVersion = details.agentTelemetry?.softwareSnapshot?.rustDeskVersion as string | undefined;
  const rustdeskId = agent.rustdeskId;
  let rustDeskStatus: ComponentStatus = "not_installed";
  if (rustdeskId || rustDeskVersion) {
    // If it has an ID, we consider it operational or attention based on heartbeat
    rustDeskStatus = agentStatus === "failed" ? "attention" : "operational";
  }

  // 3. Firebird
  let firebirdStatus: ComponentStatus = "not_installed";
  if (firebirdData.name || firebirdData.version) {
    firebirdStatus = firebirdData.processRunning ? "operational" : "failed";
  }

  // 4. IIS
  // Check if IIS is detected in installations or system
  const hasIis = details.installationContexts.some(ctx => ctx.company?.serverType === "IIS");
  let iisStatus: ComponentStatus = hasIis ? "operational" : "not_installed";

  // 5. Syspro Server
  const installs = Array.isArray(sysproVersionSnapshot?.["installations"])
    ? (sysproVersionSnapshot["installations"] as Record<string, unknown>[])
    : [];
  const hasSyspro = installs.length > 0;
  let sysproStatus: ComponentStatus = hasSyspro ? "operational" : "not_installed";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight">Componentes e Capacidades</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie os serviços e softwares vinculados a este dispositivo.
        </p>
      </div>

      <div className="grid gap-4">
        {/* Trilink Agent */}
        <HostComponentCard
          title="Trilink Agent"
          status={agentStatus}
          details={[
            { label: "Versão", value: agent.version || "Desconhecida" },
            { label: "Último contato", value: formatRelativeHeartbeat(agent.lastHeartbeatAt) },
          ]}
          actions={
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <Terminal className="mr-2 h-3.5 w-3.5" />
              Executar diagnóstico
            </Button>
          }
        />

        {/* RustDesk */}
        {rustDeskStatus !== "not_installed" && (
          <HostComponentCard
            title="RustDesk"
            status={rustDeskStatus}
            details={[
              { label: "Versão", value: rustDeskVersion || "Desconhecida" },
              { label: "ID Remoto", value: rustdeskId || "Não reportado" },
            ]}
            actions={
              <>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onCopyRustDeskId(rustdeskId)}>
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copiar ID
                </Button>
                <Button size="sm" className="h-8 text-xs bg-primary/20 hover:bg-primary/30 text-primary border-primary/20" onClick={onConnectRustDesk}>
                  <MonitorSmartphone className="mr-2 h-3.5 w-3.5" />
                  Conectar
                </Button>
              </>
            }
          />
        )}

        {/* Firebird */}
        {firebirdStatus !== "not_installed" && (
          <HostComponentCard
            title="Firebird Server"
            status={firebirdStatus}
            details={[
              { label: "Versão", value: firebirdData.version || "Desconhecida" },
              { label: "Serviço Windows", value: firebirdData.processRunning ? "Rodando" : "Parado" },
            ]}
            actions={
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Testar conexão
              </Button>
            }
          />
        )}

        {/* IIS */}
        {iisStatus !== "not_installed" && (
          <HostComponentCard
            title="IIS (Internet Information Services)"
            status={iisStatus}
            details={[
              { label: "Serviço", value: "W3SVC Rodando" },
            ]}
            actions={
              <Button variant="outline" size="sm" className="h-8 text-xs">
                Ver sites
              </Button>
            }
          />
        )}

        {/* Syspro Server */}
        {sysproStatus !== "not_installed" && (
          <HostComponentCard
            title="Syspro Server"
            status={sysproStatus}
            details={[
              { label: "Instalações Detectadas", value: installs.length.toString() },
            ]}
            actions={
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <ShieldAlert className="mr-2 h-3.5 w-3.5" />
                Validar instalação
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
