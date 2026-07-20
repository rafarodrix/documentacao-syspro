"use client";

import { useState } from "react";
import { Activity, AlertCircle, Clock, Database, Edit3, HardDrive, RefreshCw, Shield, Ticket } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@dosc-syspro/ui";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { MACHINE_PROFILE_LABEL } from "../host-details.constants";
import { formatDateTime, formatRelativeHeartbeat } from "../host-details.helpers";
import { DeviceIdentityForm } from "./device-identity-form";

type Props = {
  host: RemoteHostDetails["host"];
  agent: RemoteHostDetails["host"]["agent"];
  heartbeat: {
    label: string;
    description: string;
  };
  companyOptions: Array<{ id: string; label: string; searchText?: string }>;
  windowsComputerName: string | null;
  ticketNumber: string | null;
  ticketDetails: { title: string; state: string; priority: string } | null;
  isLoadingTicket: boolean;
  rebootPending: unknown;
  contractValidationError: string | null;
  windowsUpdateStatus?: RemoteHostDetails["agentTelemetry"]["windowsUpdateStatus"];
  diskSnapshot?: RemoteHostDetails["agentTelemetry"]["diskSnapshot"];
  projectedHostName: string;
  setProjectedHostName: (value: string) => void;
  projectedCompanyId: string;
  setProjectedCompanyId: (value: string) => void;
  projectedMachineProfile: RemoteHostDetails["host"]["machineProfile"];
  setProjectedMachineProfile: (value: RemoteHostDetails["host"]["machineProfile"]) => void;
  projectedNotes: string;
  setProjectedNotes: (value: string) => void;
  canSaveProjectedHostName: boolean;
  isSavingMachineName: boolean;
  onSaveHostName: () => void;
  installationCount: number;
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

export function HostOverviewTab(props: Props) {
  const {
    host,
    agent,
    heartbeat,
    companyOptions,
    windowsComputerName,
    ticketNumber,
    ticketDetails,
    isLoadingTicket,
    rebootPending,
    contractValidationError,
    windowsUpdateStatus,
    diskSnapshot,
    projectedHostName,
    setProjectedHostName,
    projectedCompanyId,
    setProjectedCompanyId,
    projectedMachineProfile,
    setProjectedMachineProfile,
    projectedNotes,
    setProjectedNotes,
    canSaveProjectedHostName,
    isSavingMachineName,
    onSaveHostName,
    installationCount,
  } = props;

  const [identitySheetOpen, setIdentitySheetOpen] = useState(false);
  const resolvedHostname = windowsComputerName?.trim() || null;
  const effectiveRole = host.machineProfile ? MACHINE_PROFILE_LABEL[host.machineProfile] : "Não definida";
  const pendingUpdatesCount = windowsUpdateStatus?.pendingCount ? Number(windowsUpdateStatus.pendingCount) : 0;
  const sysproProcessDown = host.inventorySignals.sysproProcessDown === true;

  const diskLowMetrics = host.lastAgentMetrics?.diskFree != null && Number(host.lastAgentMetrics.diskFree) < 5 * 1024 * 1024 * 1024;
  const diskLow =
    diskLowMetrics ||
    (Array.isArray(diskSnapshot) &&
      diskSnapshot.some((entry) => {
        const freePercent = typeof entry.freePercent === "number" ? entry.freePercent : null;
        const freeGb = typeof entry.freeGb === "number" ? entry.freeGb : null;
        const freeMb = typeof entry.freeMb === "number" ? entry.freeMb : null;
        const totalMb = typeof entry.totalMb === "number" ? entry.totalMb : null;
        const usedPct = typeof entry.usedPct === "number" ? entry.usedPct : null;
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

  const primaryDisk = Array.isArray(diskSnapshot)
    ? [...diskSnapshot].sort((a, b) => {
        const aLetter = typeof a.letter === "string" ? a.letter.toUpperCase() : "";
        const bLetter = typeof b.letter === "string" ? b.letter.toUpperCase() : "";
        if (aLetter === "C" && bLetter !== "C") return -1;
        if (bLetter === "C" && aLetter !== "C") return 1;
        const aTotal = typeof a.totalMb === "number" ? a.totalMb : 0;
        const bTotal = typeof b.totalMb === "number" ? b.totalMb : 0;
        return bTotal - aTotal;
      })[0] ?? null
    : null;

  const diskFreeFromMetrics = host.lastAgentMetrics?.diskFree;
  const diskTotalFromMetrics = host.lastAgentMetrics?.diskTotal;
  const diskFree = diskFreeFromMetrics ?? (primaryDisk && typeof primaryDisk.freeMb === "number" ? primaryDisk.freeMb * 1024 * 1024 : null);
  const diskTotal = diskTotalFromMetrics ?? (primaryDisk && typeof primaryDisk.totalMb === "number" ? primaryDisk.totalMb * 1024 * 1024 : null);
  const diskUsedPc = diskFree !== null && diskTotal !== null && diskTotal > 0 ? Math.round((1 - diskFree / diskTotal) * 100) : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/40 bg-card/65 shadow-sm backdrop-blur-md">
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <HardDrive className="h-4.5 w-4.5 text-primary" />
              Resumo do dispositivo
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIdentitySheetOpen(true)}
            >
              <Edit3 className="h-3.5 w-3.5" />
              Editar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nome amigável</p>
                <p className="truncate text-sm font-medium text-foreground" title={host.name ?? "Sem nome configurado"}>
                  {host.name ?? "Sem nome configurado"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hostname</p>
                <p className="truncate font-mono text-sm font-medium text-foreground" title={resolvedHostname ?? "Não informado"}>
                  {resolvedHostname ?? "Não informado"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Empresa principal</p>
                <p className="truncate text-sm font-medium text-foreground" title={host.companyName ?? "Sem empresa vinculada"}>
                  {host.companyName ?? "Sem empresa vinculada"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Função</p>
                <p className="text-sm font-medium text-foreground">{effectiveRole}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Instalações Syspro</p>
                <p className="text-sm font-medium text-foreground">{installationCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Versão do agente</p>
                <p className="text-sm font-medium text-foreground">{agent.agentVersion ?? "Desconhecida"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Último heartbeat</p>
                <p className="text-sm font-medium text-foreground">{formatRelativeHeartbeat(agent.lastHeartbeatAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {ticketNumber && (
          <Card className="border-blue-500/20 bg-blue-500/5 shadow-sm backdrop-blur-sm">
            <CardHeader className="px-6 pb-3 pt-6">
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
                <div className="text-sm italic text-blue-300/70">Não foi possível recuperar os detalhes do chamado #{ticketNumber}.</div>
              )}
            </CardContent>
          </Card>
        )}

        {hasCriticalAlert && (
          <Card className="border-border/40 bg-card/65 shadow-sm backdrop-blur-md">
            <CardHeader className="border-b border-border/40 px-4 pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5" />
                Alertas do sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col divide-y divide-border/40">
                {!!rebootPending && (
                  <div className="flex items-center gap-3 bg-rose-500/5 px-4 py-3 transition-colors hover:bg-rose-500/10">
                    <RefreshCw className="h-4 w-4 shrink-0 text-rose-500" />
                    <div>
                      <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Reinicialização pendente</p>
                      <p className="text-xs text-rose-600/70 dark:text-rose-400/70">O sistema aguarda um reboot para aplicar atualizações críticas.</p>
                    </div>
                  </div>
                )}
                {diskLow && (
                  <div className="flex items-center gap-3 bg-rose-500/5 px-4 py-3 transition-colors hover:bg-rose-500/10">
                    <Database className="h-4 w-4 shrink-0 text-rose-500" />
                    <div>
                      <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Espaço em disco crítico</p>
                      <p className="text-xs text-rose-600/70 dark:text-rose-400/70">O armazenamento do dispositivo está quase cheio.</p>
                    </div>
                  </div>
                )}
                {sysproProcessDown && (
                  <div className="flex items-center gap-3 bg-rose-500/5 px-4 py-3 transition-colors hover:bg-rose-500/10">
                    <AlertCircle className="h-4 w-4 shrink-0 animate-pulse text-rose-500" />
                    <div>
                      <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Syspro Server indisponível</p>
                      <p className="text-xs text-rose-600/70 dark:text-rose-400/70">Uma instância esperada do Syspro Server não está operacional neste dispositivo.</p>
                    </div>
                  </div>
                )}
                {pendingUpdatesCount > 0 && (
                  <div className="flex items-center gap-3 bg-amber-500/5 px-4 py-3 transition-colors hover:bg-amber-500/10">
                    <Shield className="h-4 w-4 shrink-0 text-amber-500" />
                    <div>
                      <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">{pendingUpdatesCount} atualizações pendentes</p>
                      <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Há pacotes do Windows Update aguardando instalação.</p>
                    </div>
                  </div>
                )}
                {contractValidationError && (
                  <div className="flex items-center gap-3 bg-amber-500/5 px-4 py-3 transition-colors hover:bg-amber-500/10">
                    <Shield className="h-4 w-4 shrink-0 text-amber-500" />
                    <div>
                      <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Erro de contrato</p>
                      <p className="text-xs font-mono text-amber-600/70 dark:text-amber-400/70">{contractValidationError}</p>
                    </div>
                  </div>
                )}
              </div>
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
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Último heartbeat</p>
              <p className="text-lg font-bold text-foreground">{formatRelativeHeartbeat(agent.lastHeartbeatAt)}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(agent.lastHeartbeatAt)}</p>
            </div>
            <div className="flex items-center gap-2 border-t border-border/40 pt-3 text-xs text-muted-foreground">
              <div className="relative flex h-2 w-2 shrink-0">
                <HeartbeatIndicator label={heartbeat.label} />
              </div>
              <span>O agente está conectado ao portal. {heartbeat.description}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/65 shadow-sm backdrop-blur-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Activity className="h-4.5 w-4.5 text-primary" />
              Recursos do sistema
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

              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Uso de disco (C:)</span>
                  <span className="font-mono font-bold text-foreground">{diskUsedPc !== null ? `${diskUsedPc}%` : "--"}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/65 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-600 shadow-[0_0_8px_rgba(52,211,153,0.4)] transition-all duration-500"
                    style={{ width: `${diskUsedPc ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={identitySheetOpen} onOpenChange={setIdentitySheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Editar dispositivo</SheetTitle>
            <SheetDescription>
              Atualize nome amigável, empresa principal, função atribuída e observações sem sair da visão geral.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            <DeviceIdentityForm
              displayName={projectedHostName}
              onDisplayNameChange={setProjectedHostName}
              primaryCompanyId={projectedCompanyId}
              onPrimaryCompanyIdChange={setProjectedCompanyId}
              companyOptions={companyOptions}
              hostname={resolvedHostname}
              machineProfile={projectedMachineProfile}
              onMachineProfileChange={setProjectedMachineProfile}
              notes={projectedNotes}
              onNotesChange={setProjectedNotes}
              disabled={isSavingMachineName}
            />
          </div>

          <SheetFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => setIdentitySheetOpen(false)} disabled={isSavingMachineName}>
              Cancelar
            </Button>
            <Button type="button" onClick={onSaveHostName} disabled={isSavingMachineName || !canSaveProjectedHostName}>
              {isSavingMachineName ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
              {isSavingMachineName ? "Salvando..." : "Salvar alterações"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
