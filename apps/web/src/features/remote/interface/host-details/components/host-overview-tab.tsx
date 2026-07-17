"use client";

import { Activity, AlertCircle, Clock, Database, Monitor, RefreshCw, Shield, Ticket } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";
import type { AgentInstallationSummary } from "@dosc-syspro/contracts/agent";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { formatDateTime, formatRelativeHeartbeat } from "../host-details.helpers";
import { AgentLinkSection } from "./agent-link-section";

type ServiceStatus = { label: string };

type Props = {
  host: RemoteHostDetails["host"];
  agent: RemoteHostDetails["host"]["agent"];
  heartbeat: {
    label: string;
    description: string;
  };
  linkedDevice: AgentInstallationSummary | null;
  windowsComputerName: string | null;
  machineIpv4: string | null;
  normalizedRustdeskId: string | null;
  ticketNumber: string | null;
  ticketDetails: { title: string; state: string; priority: string } | null;
  isLoadingTicket: boolean;
  rebootPending: unknown;
  contractValidationError: string | null;
  serviceStatus: ServiceStatus;
  orchestrationStrategy: string;
  windowsUpdateStatus?: RemoteHostDetails["agentTelemetry"]["windowsUpdateStatus"];
  sysproProcessSnapshot?: RemoteHostDetails["agentTelemetry"]["sysproProcessSnapshot"];
  diskSnapshot?: RemoteHostDetails["agentTelemetry"]["diskSnapshot"];
};

function HeartbeatIndicator({ label }: { label: string }) {
  if (label === "Contato recente") {
    return (
      <>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
      </>
    );
  }

  if (label === "Contato intermitente") {
    return <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.45)]" />;
  }

  return <span className="relative inline-flex h-2 w-2 rounded-full bg-muted-foreground/50" />;
}

export function HostOverviewTab({
  host,
  agent,
  heartbeat,
  linkedDevice,
  windowsComputerName,
  machineIpv4,
  normalizedRustdeskId,
  ticketNumber,
  ticketDetails,
  isLoadingTicket,
  rebootPending,
  contractValidationError,
  serviceStatus,
  orchestrationStrategy,
  windowsUpdateStatus,
  sysproProcessSnapshot,
  diskSnapshot,
}: Props) {
  const pendingUpdatesCount = windowsUpdateStatus?.["pendingCount"] ? Number(windowsUpdateStatus["pendingCount"]) : 0;

  const sysproProcessDown = Array.isArray(sysproProcessSnapshot) && sysproProcessSnapshot.some((entry) => {
    const running = entry["status"] === "running" || entry["running"] === true;
    return running === false;
  });

  const diskLowMetrics = (host.lastAgentMetrics?.diskFree != null && Number(host.lastAgentMetrics.diskFree) < 5 * 1024 * 1024 * 1024);
  const diskLow = diskLowMetrics || (Array.isArray(diskSnapshot) && diskSnapshot.some((entry) => {
    const freePercent = typeof entry["freePercent"] === "number" ? entry["freePercent"] : null;
    const freeGb = typeof entry["freeGb"] === "number" ? entry["freeGb"] : null;
    const freeMb = typeof entry["freeMb"] === "number" ? entry["freeMb"] : null;
    const totalMb = typeof entry["totalMb"] === "number" ? entry["totalMb"] : null;
    const usedPct = typeof entry["usedPct"] === "number" ? entry["usedPct"] : null;
    if (freePercent !== null && freePercent <= 10) return true;
    if (freeGb !== null && freeGb <= 5) return true;
    if (freeMb !== null && freeMb <= 5 * 1024) return true;
    if (totalMb !== null && totalMb > 0 && freeMb !== null && freeMb / totalMb <= 0.1) return true;
    if (usedPct !== null && usedPct >= 90) return true;
    return false;
  }));

  const hasCriticalAlert =
    !!rebootPending ||
    diskLow ||
    !!contractValidationError ||
    pendingUpdatesCount > 0 ||
    sysproProcessDown;

  const cpuLoad = host.lastAgentMetrics?.cpuLoad ?? null;
  const ramUsedPc = host.lastAgentMetrics?.ramUsedPc ?? null;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/40 bg-card/65 shadow-sm backdrop-blur-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Monitor className="h-4.5 w-4.5 text-primary" />
              Informações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Empresa</p>
                <p className="truncate text-sm font-medium text-foreground" title={host.companyName ?? "Sem empresa vinculada"}>
                  {host.companyName ?? "Sem empresa vinculada"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Versão do Agente</p>
                <p className="text-sm font-medium text-foreground">{agent.agentVersion ?? "Desconhecida"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {ticketNumber && (
          <Card className="border-blue-500/20 bg-blue-500/5 shadow-sm backdrop-blur-sm">
            <CardHeader className="px-6 pt-6 pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-blue-400">
                <Ticket className="h-4 w-4" />
                Contexto do atendimento
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {isLoadingTicket ? (
                <div className="flex items-center gap-2 text-sm text-blue-300">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Carregando chamado #{ticketNumber}...
                </div>
              ) : ticketDetails ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-[10px] font-bold text-blue-300">
                      {ticketDetails.state.toUpperCase()}
                    </Badge>
                    <h3 className="text-lg font-bold leading-tight text-white">
                      #{ticketNumber}: {ticketDetails.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-blue-200/60">
                    <span>Prioridade: {ticketDetails.priority}</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm italic text-blue-300/70">
                  Não foi possível recuperar os detalhes do chamado #{ticketNumber}.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {hasCriticalAlert && (
          <Card className="border-rose-500/20 bg-rose-500/5 shadow-sm">
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-rose-500">
                <AlertCircle className="h-3.5 w-3.5" />
                Alertas críticos
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 p-4">
              {!!rebootPending && (
                <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <RefreshCw className="mr-1.5 h-3 w-3 animate-spin-slow" />
                  Reinicialização necessária
                </Badge>
              )}
              {diskLow && (
                <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <Database className="mr-1.5 h-3 w-3" />
                  Espaço em disco crítico
                </Badge>
              )}
              {sysproProcessDown && (
                <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertCircle className="mr-1.5 h-3 w-3 animate-pulse text-rose-500" />
                  Serviço Syspro inativo
                </Badge>
              )}
              {pendingUpdatesCount > 0 && (
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                  <Shield className="mr-1.5 h-3 w-3" />
                  {pendingUpdatesCount} atualizações pendentes
                </Badge>
              )}
              {contractValidationError && (
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 font-mono text-amber-600 dark:text-amber-400">
                  <Shield className="mr-1.5 h-3 w-3" />
                  ERRO CONTRATO: {contractValidationError}
                </Badge>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/40 bg-card/65 shadow-sm backdrop-blur-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Clock className="h-4.5 w-4.5 text-primary" />
              Conectividade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Último contato</p>
              <p className="text-lg font-bold text-foreground">{formatRelativeHeartbeat(agent.lastHeartbeatAt)}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(agent.lastHeartbeatAt)}</p>
            </div>
            <div className="flex items-center gap-2 border-t border-border/40 pt-3 text-xs text-muted-foreground">
              <div className="relative flex h-2 w-2 shrink-0">
                <HeartbeatIndicator label={heartbeat.label} />
              </div>
              <span>{heartbeat.description}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/65 shadow-sm backdrop-blur-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Activity className="h-4.5 w-4.5 text-primary" />
              Recursos do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Uso de CPU</span>
                  <span className="font-mono font-bold text-foreground">{cpuLoad !== null ? `${cpuLoad}%` : "--"}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/65 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.4)] transition-all duration-500"
                    style={{ width: `${cpuLoad ?? 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Uso de RAM</span>
                  <span className="font-mono font-bold text-foreground">{ramUsedPc !== null ? `${ramUsedPc}%` : "--"}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/65 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600 shadow-[0_0_8px_rgba(56,189,248,0.4)] transition-all duration-500"
                    style={{ width: `${ramUsedPc ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
