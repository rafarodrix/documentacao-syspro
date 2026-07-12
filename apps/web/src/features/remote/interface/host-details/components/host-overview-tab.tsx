"use client";

import { AlertCircle, Clock, Database, Monitor, RefreshCw, Shield, Ticket, Activity } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";
import type { AgentDeviceSummary } from "@dosc-syspro/contracts/agent";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { formatDateTime, formatRelativeHeartbeat } from "../host-details.helpers";
import { AgentLinkSection } from "./agent-link-section";
import { cn } from "@/lib/utils";

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

  const cpuLoad = host.lastAgentMetrics?.cpuLoad ?? null;
  const ramUsedPc = host.lastAgentMetrics?.ramUsedPc ?? null;

  return (
    <div className="space-y-6">
      {/* Top Section: General Info and Device Link */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/40 bg-card/65 backdrop-blur-md shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Monitor className="h-4.5 w-4.5 text-primary" />
              Informações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Empresa</p>
                <p className="text-sm font-medium text-foreground truncate" title={host.companyName ?? "Sem empresa vinculada"}>
                  {host.companyName ?? "Sem empresa vinculada"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Versão do Agente</p>
                <p className="text-sm font-medium text-foreground">{agent.agentVersion ?? "Desconhecida"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Estratégia</p>
                <p className="text-sm font-medium text-foreground">{orchestrationStrategy}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Estado Operacional</p>
                <p className="text-sm font-medium text-foreground capitalize">{serviceStatus.label}</p>
              </div>
            </div>

            {host.description && (
              <div className="pt-3 border-t border-border/40 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Descrição</p>
                <p className="text-sm text-foreground leading-relaxed">{host.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <AgentLinkSection hostId={host.id} linkedDevice={linkedDevice} />
      </div>

      {/* Ticket Context & Critical Alerts */}
      <div className="grid gap-6 lg:grid-cols-2">
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
      </div>

      {/* Bottom Section: Connectivity & Telemetry metrics summary */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/40 bg-card/65 backdrop-blur-md shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-primary" />
              Conectividade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Último contato</p>
              <p className="text-lg font-bold text-foreground">{formatRelativeHeartbeat(agent.lastHeartbeatAt)}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(agent.lastHeartbeatAt)}</p>
            </div>
            <div className="pt-3 border-t border-border/40 flex items-center gap-2 text-xs text-muted-foreground">
              <div className="relative flex h-2 w-2 shrink-0">
                {agent.lastHeartbeatAt ? (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  </>
                ) : (
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-muted" />
                )}
              </div>
              <span>Agente ativo e sincronizando parâmetros operacionais.</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/65 backdrop-blur-md shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-primary" />
              Recursos do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground font-semibold">Uso de CPU</span>
                  <span className="font-mono font-bold text-foreground">{cpuLoad !== null ? `${cpuLoad}%` : "--"}</span>
                </div>
                <div className="h-2.5 w-full bg-muted/65 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-violet-500 to-indigo-600 h-full transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.4)]" 
                     style={{ width: `${cpuLoad ?? 0}%` }} 
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground font-semibold">Uso de RAM</span>
                  <span className="font-mono font-bold text-foreground">{ramUsedPc !== null ? `${ramUsedPc}%` : "--"}</span>
                </div>
                <div className="h-2.5 w-full bg-muted/65 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-sky-400 to-blue-600 h-full transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.4)]" 
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
