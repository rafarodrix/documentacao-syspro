"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowUpCircle,
  Clock,
  Cpu,
  Database,
  Edit3,
  HardDrive,
  Network,
  Package,
  RefreshCw,
  Server,
  Shield,
  Ticket,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@dosc-syspro/ui";
import {
  AGENT_COLLECTION_PROFILE_LABEL,
  mapMachineProfileToCollectionProfile,
} from "@dosc-syspro/contracts/agent";
import { isAgentVersionBelowTarget } from "@dosc-syspro/contracts/remote";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { MACHINE_PROFILE_LABEL } from "../host-details.constants";
import { formatDateTime, formatRelativeHeartbeat } from "../host-details.helpers";
import { DeviceIdentityForm } from "./device-identity-form";
import { cn } from "@/lib/utils";

type OverviewCommand = {
  id: string;
  type: string;
  status: "PENDING" | "DELIVERED" | "ACKNOWLEDGED" | "CANCELLED" | "FAILED";
  createdAt: string;
  deliveredAt: string | null;
  executedAt: string | null;
  failedAt: string | null;
};

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
  agentTelemetry: RemoteHostDetails["agentTelemetry"];
  erpInstallations: RemoteHostDetails["erpInstallations"];
  visibleAgentCommands: OverviewCommand[];
  agentTargetVersion: string | null;
  agentAutoUpgrade: boolean;
  localIpv4: string | null;
  publicIpv4: string | null;
  productStatusLabel: string;
  operationalStatus: RemoteHostDetails["host"]["operationalStatus"];
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
  initialIdentitySheetOpen?: boolean;
};

function formatOperationalStatus(status: RemoteHostDetails["host"]["operationalStatus"]): string {
  switch (status) {
    case "ONLINE":
      return "Online";
    case "RECENT":
      return "Recente";
    case "OFFLINE":
      return "Offline";
    case "MISCONFIGURED":
      return "Misconfigurado";
    case "SESSION_BUSY":
      return "Em sessão";
    default:
      return status;
  }
}

function HeartbeatIndicator({ label }: { label: string }) {
  if (label === "Contato recente") {
    return (
      <>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </>
    );
  }

  if (label === "Contato intermitente") {
    return <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />;
  }

  return <span className="relative inline-flex h-2 w-2 rounded-full bg-muted-foreground/50" />;
}

function MetricBar({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: number | null;
  tone?: "primary" | "warn" | "danger";
}) {
  const width = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold text-foreground">{value !== null ? `${value}%` : "—"}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/70">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            tone === "danger" && "bg-rose-500",
            tone === "warn" && "bg-amber-500",
            tone === "primary" && "bg-primary",
          )}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "ok" | "warn" | "danger" | "muted";
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/70 p-3.5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1.5 truncate text-sm font-semibold text-foreground",
          tone === "ok" && "text-emerald-700 dark:text-emerald-400",
          tone === "warn" && "text-amber-700 dark:text-amber-400",
          tone === "danger" && "text-rose-700 dark:text-rose-400",
          tone === "muted" && "text-muted-foreground",
        )}
        title={value}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
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
    agentTelemetry,
    erpInstallations,
    visibleAgentCommands,
    agentTargetVersion,
    agentAutoUpgrade,
    localIpv4,
    publicIpv4,
    productStatusLabel,
    operationalStatus,
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
    initialIdentitySheetOpen = false,
  } = props;

  const [identitySheetOpen, setIdentitySheetOpen] = useState(initialIdentitySheetOpen);

  useEffect(() => {
    if (initialIdentitySheetOpen) {
      setIdentitySheetOpen(true);
    }
  }, [initialIdentitySheetOpen]);
  const resolvedHostname = windowsComputerName?.trim() || null;
  const effectiveRole = host.machineProfile ? MACHINE_PROFILE_LABEL[host.machineProfile] : "Não definida";
  const collectionProfile = mapMachineProfileToCollectionProfile(host.machineProfile, true);
  const pendingUpdatesCount = windowsUpdateStatus?.pendingCount ? Number(windowsUpdateStatus.pendingCount) : 0;
  const sysproProcessDown = host.inventorySignals.sysproProcessDown === true;
  const versionOutdated = Boolean(
    agentTargetVersion && isAgentVersionBelowTarget(agent.agentVersion, agentTargetVersion),
  );

  const pendingUpgrade = visibleAgentCommands.find(
    (command) => command.type === "UPGRADE_AGENT" && (command.status === "PENDING" || command.status === "DELIVERED"),
  );
  const latestUpgrade = visibleAgentCommands.find((command) => command.type === "UPGRADE_AGENT") ?? null;

  const diskLowMetrics =
    host.lastAgentMetrics?.diskFree != null && Number(host.lastAgentMetrics.diskFree) < 5 * 1024 * 1024 * 1024;
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
    sysproProcessDown ||
    Boolean(pendingUpgrade) ||
    versionOutdated;

  const cpuLoad = host.lastAgentMetrics?.cpuLoad ?? null;
  const ramUsedPc = host.lastAgentMetrics?.ramUsedPc ?? null;
  const osInfo =
    typeof host.lastAgentMetrics?.osInfo === "string" && host.lastAgentMetrics.osInfo.trim()
      ? host.lastAgentMetrics.osInfo.trim()
      : typeof agentTelemetry.systemSnapshot?.["osName"] === "string"
        ? String(agentTelemetry.systemSnapshot["osName"])
        : null;

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
  const diskFree =
    diskFreeFromMetrics ??
    (primaryDisk && typeof primaryDisk.freeMb === "number" ? primaryDisk.freeMb * 1024 * 1024 : null);
  const diskTotal =
    diskTotalFromMetrics ??
    (primaryDisk && typeof primaryDisk.totalMb === "number" ? primaryDisk.totalMb * 1024 * 1024 : null);
  const diskUsedPc =
    diskFree !== null && diskTotal !== null && diskTotal > 0
      ? Math.round((1 - diskFree / diskTotal) * 100)
      : null;

  const telemetryFreshness = useMemo(() => {
    const candidates = [
      agentTelemetry.systemSnapshotAt,
      agentTelemetry.agentMetricsAt,
      host.lastAgentMetricsAt,
      host.inventorySignals.lastExtendedSnapshotAt,
      agent.lastHeartbeatAt,
    ]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => new Date(value).getTime())
      .filter((value) => !Number.isNaN(value));
    if (!candidates.length) return null;
    return new Date(Math.max(...candidates)).toISOString();
  }, [agent.lastHeartbeatAt, agentTelemetry.agentMetricsAt, agentTelemetry.systemSnapshotAt, host.inventorySignals.lastExtendedSnapshotAt, host.lastAgentMetricsAt]);

  const erpSummary = useMemo(() => {
    const total = erpInstallations.length;
    const verified = erpInstallations.filter((item) => item.runtimeStatus === "VERIFIED").length;
    const unreachable = erpInstallations.filter((item) => item.runtimeStatus === "UNREACHABLE").length;
    const running = erpInstallations.filter((item) => item.serviceStatus === "RUNNING").length;
    return { total, verified, unreachable, running };
  }, [erpInstallations]);

  const resourceTone = (value: number | null): "primary" | "warn" | "danger" => {
    if (value == null) return "primary";
    if (value >= 90) return "danger";
    if (value >= 75) return "warn";
    return "primary";
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Contato"
          value={heartbeat.label}
          hint={formatRelativeHeartbeat(agent.lastHeartbeatAt)}
          tone={heartbeat.label === "Contato recente" ? "ok" : heartbeat.label === "Contato intermitente" ? "warn" : "muted"}
        />
        <KpiTile
          label="Perfil de coleta"
          value={AGENT_COLLECTION_PROFILE_LABEL[collectionProfile]}
          hint={effectiveRole}
          tone="default"
        />
        <KpiTile
          label="Agente"
          value={agent.agentVersion ?? "Sem versão"}
          hint={
            pendingUpgrade
              ? "Upgrade pendente"
              : versionOutdated && agentTargetVersion
                ? `Alvo ${agentTargetVersion}${agentAutoUpgrade ? " · auto" : ""}`
                : agentTargetVersion
                  ? `Alvo ${agentTargetVersion}`
                  : productStatusLabel
          }
          tone={pendingUpgrade || versionOutdated ? "warn" : "ok"}
        />
        <KpiTile
          label="Telemetria"
          value={telemetryFreshness ? formatRelativeHeartbeat(telemetryFreshness) : "Sem coleta"}
          hint={telemetryFreshness ? formatDateTime(telemetryFreshness) : "Aguardando agent.telemetry.v1"}
          tone={telemetryFreshness ? "ok" : "muted"}
        />
        <KpiTile
          label="ERP runtime"
          value={
            erpSummary.total === 0
              ? "Sem instalações"
              : `${erpSummary.verified}/${erpSummary.total} verificadas`
          }
          hint={
            erpSummary.unreachable > 0
              ? `${erpSummary.unreachable} inacessível(is)`
              : erpSummary.running > 0
                ? `${erpSummary.running} serviço(s) em execução`
                : installationCount > 0
                  ? `${installationCount} instalação(ões) mapeada(s)`
                  : undefined
          }
          tone={erpSummary.unreachable > 0 ? "danger" : erpSummary.total > 0 ? "ok" : "muted"}
        />
        <KpiTile
          label="Estado operacional"
          value={formatOperationalStatus(operationalStatus)}
          hint={productStatusLabel}
          tone={
            operationalStatus === "ONLINE" || operationalStatus === "RECENT"
              ? "ok"
              : operationalStatus === "OFFLINE" || operationalStatus === "MISCONFIGURED"
                ? "warn"
                : "default"
          }
        />
        <KpiTile
          label="Rede"
          value={localIpv4 ?? "Sem IP local"}
          hint={publicIpv4 ? `Público ${publicIpv4}` : "Sem IP público"}
          tone={localIpv4 ? "default" : "muted"}
        />
        <KpiTile
          label="Sistema"
          value={osInfo ?? "SO não informado"}
          hint={`${installationCount} Syspro · ${diskUsedPc != null ? `Disco ${diskUsedPc}%` : "Disco —"}`}
          tone="default"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="border-border/50 bg-card/70 shadow-sm lg:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <HardDrive className="h-4 w-4 text-primary" />
              Identidade
            </CardTitle>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setIdentitySheetOpen(true)}>
              <Edit3 className="h-3.5 w-3.5" />
              Editar
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <IdentityField label="Nome amigável" value={host.name ?? "Sem nome configurado"} />
              <IdentityField label="Hostname" value={resolvedHostname ?? "Não informado"} mono />
              <IdentityField label="Empresa" value={host.companyName ?? "Sem empresa vinculada"} />
              <IdentityField label="Função" value={effectiveRole} />
              <IdentityField label="Perfil RMM" value={AGENT_COLLECTION_PROFILE_LABEL[collectionProfile]} />
              <IdentityField label="Versão do agente" value={agent.agentVersion ?? "Desconhecida"} mono />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/70 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Clock className="h-4 w-4 text-primary" />
              Conectividade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Último heartbeat</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{formatRelativeHeartbeat(agent.lastHeartbeatAt)}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(agent.lastHeartbeatAt)}</p>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
              <div className="relative mt-1 flex h-2 w-2 shrink-0">
                <HeartbeatIndicator label={heartbeat.label} />
              </div>
              <span>{heartbeat.description}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <IdentityField label="IP local" value={localIpv4 ?? "—"} mono />
              <IdentityField label="IP público" value={publicIpv4 ?? "—"} mono />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 bg-card/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Activity className="h-4 w-4 text-primary" />
              Recursos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MetricBar label="CPU" value={cpuLoad} tone={resourceTone(cpuLoad)} />
            <MetricBar label="RAM" value={ramUsedPc} tone={resourceTone(ramUsedPc)} />
            <MetricBar label="Disco principal" value={diskUsedPc} tone={resourceTone(diskUsedPc)} />
            <p className="text-[11px] text-muted-foreground">
              Métricas do agente
              {host.lastAgentMetricsAt ? ` · atualizadas ${formatRelativeHeartbeat(host.lastAgentMetricsAt)}` : " · sem amostra recente"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Server className="h-4 w-4 text-primary" />
              Monitoramento RMM
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusRow
              icon={Package}
              title="Coleta"
              detail={`${AGENT_COLLECTION_PROFILE_LABEL[collectionProfile]} · ${collectionProfile === "server_syspro" ? "coleta completa" : "política por função"}`}
            />
            <StatusRow
              icon={Cpu}
              title="Upgrade do agente"
              detail={
                pendingUpgrade
                  ? `Pendente (${pendingUpgrade.status === "DELIVERED" ? "entregue" : "aguardando sync"})`
                  : versionOutdated && agentTargetVersion
                    ? `Abaixo do alvo ${agentTargetVersion}${agentAutoUpgrade ? " · auto-upgrade ativo" : ""}`
                    : latestUpgrade
                      ? `Último: ${latestUpgrade.status}`
                      : agentTargetVersion
                        ? `Na versão alvo (${agentTargetVersion})`
                        : "Sem versão alvo configurada"
              }
              tone={pendingUpgrade || versionOutdated ? "warn" : "ok"}
            />
            <StatusRow
              icon={Database}
              title="ERP"
              detail={
                erpSummary.total === 0
                  ? "Nenhuma instalação vinculada"
                  : `${erpSummary.verified} verificada(s), ${erpSummary.unreachable} inacessível(is), ${erpSummary.running} em execução`
              }
              tone={erpSummary.unreachable > 0 ? "danger" : "default"}
            />
            <StatusRow
              icon={Network}
              title="Telemetria"
              detail={
                telemetryFreshness
                  ? `Última coleta ${formatRelativeHeartbeat(telemetryFreshness)} (agent.telemetry.v1)`
                  : "Aguardando primeira publicação de telemetria"
              }
              tone={telemetryFreshness ? "ok" : "muted"}
            />
          </CardContent>
        </Card>
      </div>

      {(ticketNumber || hasCriticalAlert) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {ticketNumber ? (
            <Card className="border-border/50 bg-card/70 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Ticket className="h-4 w-4 text-primary" />
                  Contexto do atendimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingTicket ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Carregando chamado #{ticketNumber}...
                  </div>
                ) : ticketDetails ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{ticketDetails.state}</Badge>
                      <p className="text-sm font-semibold text-foreground">
                        #{ticketNumber}: {ticketDetails.title}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">Prioridade: {ticketDetails.priority}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Não foi possível recuperar o chamado #{ticketNumber}.</p>
                )}
              </CardContent>
            </Card>
          ) : null}

          {hasCriticalAlert ? (
            <Card className="border-border/50 bg-card/70 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Atenção
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {!!rebootPending && (
                  <AlertRow tone="danger" icon={RefreshCw} title="Reinicialização pendente" detail="O Windows aguarda reboot para concluir atualizações." />
                )}
                {diskLow && (
                  <AlertRow tone="danger" icon={Database} title="Espaço em disco crítico" detail="Armazenamento próximo do limite." />
                )}
                {sysproProcessDown && (
                  <AlertRow tone="danger" icon={AlertCircle} title="Syspro indisponível" detail="Processo/serviço esperado não está operacional." />
                )}
                {pendingUpgrade && (
                  <AlertRow tone="warn" icon={ArrowUpCircle} title="Upgrade do agente em andamento" detail="Aguarde ACK ou a próxima versão no heartbeat." />
                )}
                {!pendingUpgrade && versionOutdated && agentTargetVersion && (
                  <AlertRow
                    tone="warn"
                    icon={ArrowUpCircle}
                    title="Agente desatualizado"
                    detail={`Reportado ${agent.agentVersion ?? "—"} · alvo ${agentTargetVersion}`}
                  />
                )}
                {pendingUpdatesCount > 0 && (
                  <AlertRow
                    tone="warn"
                    icon={Shield}
                    title={`${pendingUpdatesCount} atualizações Windows`}
                    detail="Pacotes aguardando instalação."
                  />
                )}
                {contractValidationError && (
                  <AlertRow tone="warn" icon={Shield} title="Erro de contrato" detail={contractValidationError} />
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

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

function IdentityField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("truncate text-sm font-medium text-foreground", mono && "font-mono")} title={value}>
        {value}
      </p>
    </div>
  );
}

function StatusRow({
  icon: Icon,
  title,
  detail,
  tone = "default",
}: {
  icon: typeof Package;
  title: string;
  detail: string;
  tone?: "default" | "ok" | "warn" | "danger" | "muted";
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/15 px-3 py-2.5">
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground",
          tone === "ok" && "text-emerald-600 dark:text-emerald-400",
          tone === "warn" && "text-amber-600 dark:text-amber-400",
          tone === "danger" && "text-rose-600 dark:text-rose-400",
        )}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function AlertRow({
  icon: Icon,
  title,
  detail,
  tone,
}: {
  icon: typeof AlertCircle;
  title: string;
  detail: string;
  tone: "warn" | "danger";
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3 py-2.5",
        tone === "danger" && "border-rose-500/20 bg-rose-500/5",
        tone === "warn" && "border-amber-500/20 bg-amber-500/5",
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone === "danger" ? "text-rose-500" : "text-amber-500")} />
      <div className="min-w-0">
        <p className={cn("text-sm font-semibold", tone === "danger" ? "text-rose-700 dark:text-rose-400" : "text-amber-700 dark:text-amber-400")}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
