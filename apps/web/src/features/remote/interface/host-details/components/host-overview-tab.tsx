"use client";

import { AlertCircle, Badge as BadgeIcon, Clock, Database, Fingerprint, Monitor, RefreshCw, Shield, Ticket } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";
import type { AgentDeviceSummary } from "@dosc-syspro/contracts/agent";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { formatDateTime, formatRelativeHeartbeat } from "../host-details.helpers";
import { AgentLinkSection } from "./agent-link-section";

type ServiceStatus = { label: string };

type Props = {
  host: RemoteHostDetails["host"];
  agent: RemoteHostDetails["host"]["agent"];
  linkedDevice: AgentDeviceSummary | null;
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
};

export function HostOverviewTab({
  host,
  agent,
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
}: Props) {
  const hasCriticalAlert =
    !!rebootPending ||
    (host.lastAgentMetrics?.diskFree != null && host.lastAgentMetrics.diskFree < 5 * 1024 * 1024 * 1024) ||
    !!contractValidationError;

  return (
    <div className="space-y-6">
      {/* Identity summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/40 bg-muted/5 p-4 space-y-1.5 shadow-sm">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Monitor className="h-3 w-3" /> Nome da máquina
          </p>
          <p className="text-sm font-medium text-foreground truncate">{windowsComputerName ?? host.name}</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-muted/5 p-4 space-y-1.5 shadow-sm">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Monitor className="h-3 w-3" /> IPv4
          </p>
          <p className="text-sm font-medium font-mono text-foreground">{machineIpv4 ?? "Sem leitura"}</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-muted/5 p-4 space-y-1.5 shadow-sm">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Fingerprint className="h-3 w-3" /> RustDesk ID
          </p>
          <p className="text-sm font-medium font-mono text-foreground">{normalizedRustdeskId ?? "Sem leitura"}</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-muted/5 p-4 space-y-1.5 shadow-sm">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Shield className="h-3 w-3" /> Versão do agente
          </p>
          <p className="text-sm font-medium text-foreground">{agent.agentVersion ?? "N/A"}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AgentLinkSection hostId={host.id} linkedDevice={linkedDevice} />

        {ticketNumber && (
          <Card className="border-blue-500/20 bg-blue-500/5 shadow-sm backdrop-blur-sm">
            <CardHeader className="pb-3 px-6 pt-6">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2">
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
                    <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-300 text-[10px] font-bold">
                      {ticketDetails.state.toUpperCase()}
                    </Badge>
                    <h3 className="text-lg font-bold text-white leading-tight">
                      #{ticketNumber}: {ticketDetails.title}
                    </h3>
                  </div>
                  <div className="text-xs text-blue-200/60 flex items-center gap-4">
                    <span>Prioridade: {ticketDetails.priority}</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-blue-300/70 italic">
                  Não foi possível recuperar os detalhes do chamado #{ticketNumber}.
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {hasCriticalAlert && (
        <Card className="border-rose-500/20 bg-rose-500/5">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-rose-500 flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5" />
              Alertas críticos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex flex-wrap gap-2">
            {!!rebootPending && (
              <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <RefreshCw className="mr-1.5 h-3 w-3 animate-spin-slow" />
                Reinicialização necessária
              </Badge>
            )}
            {host.lastAgentMetrics?.diskFree != null && host.lastAgentMetrics.diskFree < 5 * 1024 * 1024 * 1024 && (
              <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Database className="mr-1.5 h-3 w-3" />
                Espaço em disco crítico
              </Badge>
            )}
            {contractValidationError && (
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
                <Shield className="mr-1.5 h-3 w-3" />
                ERRO CONTRATO: {contractValidationError}
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/40 bg-muted/5 p-4 space-y-3 shadow-sm transition-all hover:bg-muted/10">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Última atividade</span>
          </div>
          <div className="space-y-0.5">
            <p className="text-lg font-bold text-foreground">{formatRelativeHeartbeat(agent.lastHeartbeatAt)}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(agent.lastHeartbeatAt)}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border/40 bg-muted/5 p-4 space-y-3 shadow-sm transition-all hover:bg-muted/10 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Estado do agente</span>
          </div>
          <div className="space-y-0.5">
            <p className="text-lg font-bold text-foreground capitalize">{serviceStatus.label}</p>
            <p className="text-xs text-muted-foreground">Estratégia: {orchestrationStrategy}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
