import { HostComponentCard, type ComponentStatus } from "./host-component-card";
import { formatRelativeHeartbeat } from "../host-details.helpers";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { Button } from "@dosc-syspro/ui";
import { Copy, Terminal, ShieldAlert, MonitorSmartphone, RefreshCw, Globe } from "lucide-react";
import { differenceInMinutes } from "@/lib/date";
import { ReactNode } from "react";

type HostServicesTabProps = {
  host: RemoteHostDetails["host"];
  agent: RemoteHostDetails["host"]["agent"];
  details: RemoteHostDetails;
  firebirdData: { name: string | null; version: string | null; processRunning: boolean | null };
  sysproVersionSnapshot: Record<string, unknown> | null;
  rustDeskCompliance: { items: { match: boolean }[] } | null;
  onRequestRemoteAction: (cmd: "RESEND_CONFIG" | "REAPPLY_ALIAS" | "UPGRADE_CLIENT") => void;
  onCopyRustDeskId: (value: string | null) => void;
  onConnectRustDesk: () => void;
};

type ServiceItem = {
  id: string;
  title: string;
  status: ComponentStatus;
  statusLabel?: string;
  details: { label: string; value: ReactNode }[];
  actions?: ReactNode;
  orderWeight: number;
};

export function HostServicesTab({
  host,
  agent,
  details,
  firebirdData,
  sysproVersionSnapshot,
  rustDeskCompliance,
  onRequestRemoteAction,
  onCopyRustDeskId,
  onConnectRustDesk,
}: HostServicesTabProps) {
  const services: ServiceItem[] = [];

  const getStatusWeight = (status: ComponentStatus) => {
    switch (status) {
      case "failed": return 1;
      case "attention": return 2;
      case "not_installed":
      case "not_configured":
      case "not_verified":
      case "disabled": return 3;
      case "updating": return 4;
      case "operational": return 5;
      default: return 6;
    }
  };

  // 1. Trilink Agent
  let agentStatus: ComponentStatus = "not_installed";
  let agentStatusLabel = "Não instalado";
  if (agent.agentVersion) {
    const isOffline = agent.lastHeartbeatAt && differenceInMinutes(new Date(), new Date(agent.lastHeartbeatAt)) > 5;
    agentStatus = isOffline ? "failed" : "operational";
    agentStatusLabel = isOffline ? "Offline" : "Operacional";
  }
  services.push({
    id: "trilink",
    title: "Trilink Agent",
    status: agentStatus,
    statusLabel: agentStatusLabel,
    details: [
      { label: "Versão", value: agent.agentVersion || "Desconhecida" },
      { label: "Último contato", value: formatRelativeHeartbeat(agent.lastHeartbeatAt) },
      ...(agentStatus === "failed" ? [{ label: "Atenção", value: "O agente parou de enviar sinais de vida." }] : []),
    ],
    actions: (
      <Button variant="outline" size="sm" className="h-8 text-xs">
        <Terminal className="mr-2 h-3.5 w-3.5" />
        Executar diagnóstico
      </Button>
    ),
    orderWeight: getStatusWeight(agentStatus)
  });

  // 2. RustDesk
  const rustDeskVersion = agent.lastKnownRustDeskVersion;
  const rustdeskId = agent.rustdeskId;
  let rustDeskStatus: ComponentStatus = "not_installed";
  let rustDeskStatusLabel = "Não instalado";
  
  if (rustdeskId || rustDeskVersion) {
    rustDeskStatus = agentStatus === "failed" ? "attention" : "operational";
    rustDeskStatusLabel = agentStatus === "failed" ? "Conexão incerta" : "Operacional";
  }
  
  if (rustDeskStatus !== "not_installed") {
    const isCompliant = rustDeskCompliance?.items.every(i => i.match) ?? true;
    if (!isCompliant && rustDeskStatus === "operational") {
      rustDeskStatus = "attention";
    }
  
    services.push({
      id: "rustdesk",
      title: "RustDesk",
      status: rustDeskStatus,
      statusLabel: rustDeskStatusLabel,
      details: [
        { label: "Versão", value: rustDeskVersion || "Desconhecida" },
        { label: "ID Remoto", value: rustdeskId || "Não reportado" },
        ...(rustDeskStatus === "attention" && !isCompliant ? [{ label: "Atenção", value: "Configurações divergem do portal." }] : []),
        ...(rustDeskStatus === "attention" && isCompliant ? [{ label: "Atenção", value: "Host offline, acesso pode falhar." }] : []),
      ],
      actions: (
        <>
          {!isCompliant && (
            <Button variant="outline" size="sm" className="h-8 text-xs border-amber-500/50 text-amber-600 hover:bg-amber-500/10" onClick={() => onRequestRemoteAction("RESEND_CONFIG")}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Validar Comunicação
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onCopyRustDeskId(rustdeskId)}>
            <Copy className="mr-2 h-3.5 w-3.5" />
            Copiar ID
          </Button>
          <Button size="sm" className="h-8 text-xs bg-primary/20 hover:bg-primary/30 text-primary border-primary/20" onClick={onConnectRustDesk}>
            <MonitorSmartphone className="mr-2 h-3.5 w-3.5" />
            Conectar
          </Button>
        </>
      ),
      orderWeight: getStatusWeight(rustDeskStatus)
    });
  }

  // 3. Firebird
  let firebirdStatus: ComponentStatus = "not_installed";
  let firebirdStatusLabel = "Não detectado";
  if (firebirdData.name || firebirdData.version) {
    firebirdStatus = firebirdData.processRunning ? "operational" : "failed";
    firebirdStatusLabel = firebirdData.processRunning ? "Operacional" : "Parado";
  }
  
  if (firebirdStatus !== "not_installed") {
    services.push({
      id: "firebird",
      title: "Firebird Server",
      status: firebirdStatus,
      statusLabel: firebirdStatusLabel,
      details: [
        { label: "Versão", value: firebirdData.version || "Desconhecida" },
        { label: "Serviço Windows", value: firebirdData.processRunning ? "Rodando" : "Parado" },
        ...(firebirdStatus === "failed" ? [{ label: "Atenção", value: "O serviço fbserver não está rodando." }] : []),
      ],
      actions: (
        <Button variant="outline" size="sm" className="h-8 text-xs">
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Testar conexão
        </Button>
      ),
      orderWeight: getStatusWeight(firebirdStatus)
    });
  }

  // 4. IIS
  const hasIis = details.installationContexts.some((ctx: any) => ctx.company?.serverType === "IIS");
  let iisStatus: ComponentStatus = hasIis ? "operational" : "not_installed";
  
  if (iisStatus !== "not_installed") {
    services.push({
      id: "iis",
      title: "IIS (Internet Information Services)",
      status: iisStatus,
      statusLabel: "Operacional",
      details: [
        { label: "Serviço", value: "W3SVC Rodando" },
      ],
      actions: (
        <Button variant="outline" size="sm" className="h-8 text-xs">
          <Globe className="mr-2 h-3.5 w-3.5" />
          Ver sites
        </Button>
      ),
      orderWeight: getStatusWeight(iisStatus)
    });
  }

  // 5. Syspro Server
  const installs = Array.isArray(sysproVersionSnapshot?.["installations"])
    ? (sysproVersionSnapshot["installations"] as Record<string, unknown>[])
    : [];
  const hasSyspro = installs.length > 0;
  let sysproStatus: ComponentStatus = hasSyspro ? "operational" : "not_installed";
  
  if (sysproStatus !== "not_installed") {
    services.push({
      id: "syspro",
      title: "Syspro Server",
      status: sysproStatus,
      statusLabel: "Operacional",
      details: [
        { label: "Instalações Detectadas", value: installs.length.toString() },
      ],
      actions: (
        <Button variant="outline" size="sm" className="h-8 text-xs">
          <ShieldAlert className="mr-2 h-3.5 w-3.5" />
          Validar instalação
        </Button>
      ),
      orderWeight: getStatusWeight(sysproStatus)
    });
  }

  // Sort services by priority (failed first, attention second, operational last)
  services.sort((a, b) => a.orderWeight - b.orderWeight);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight">Componentes e Capacidades</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie os serviços e softwares vinculados a este dispositivo.
        </p>
      </div>

      <div className="grid gap-4">
        {services.map(service => (
          <HostComponentCard
            key={service.id}
            title={service.title}
            status={service.status}
            statusLabel={service.statusLabel}
            details={service.details}
            actions={service.actions}
          />
        ))}
      </div>
    </div>
  );
}
