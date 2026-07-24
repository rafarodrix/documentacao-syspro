"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  ArrowLeft,
  ArrowUpCircle,
  Building2,
  Clock,
  ExternalLink,
  KeyRound,
  Monitor,
  WifiOff,
} from "lucide-react";
import type { AgentInstallationSummary } from "@dosc-syspro/contracts/agent";
import { AGENT_COLLECTION_PROFILE_LABEL } from "@dosc-syspro/contracts/agent";
import {
  isAgentVersionBelowTarget,
  supportsManagedAgentUpgrade,
} from "@dosc-syspro/contracts/remote";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/date";
import { formatInstallationHeartbeatLag, getInstallationOfflineWarningMessage } from "@/features/agents/domain/agent-installation-status";
import { AGENT_FLEET_LIST_PATH } from "@/features/agents/domain/agent-fleet-paths";
import { AgentInstallationDeleteSection } from "@/features/agents/interface/agent-installation-delete-section";
import { AgentHostLinkSection } from "@/features/agents/interface/agent-host-link-section";
import { getRemoteApiErrorMessage, requestRemoteMutation } from "@/features/remote/interface/remote-api";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const result = formatDateTime(iso);
  return result === "-" ? "-" : result;
}

export function AgentInstallationDetailPanel({
  device,
  canManage = false,
  canManageRemote = false,
  companyOptions = [],
  matchedPendingHost = null,
  agentTargetVersion = null,
  agentAutoUpgrade = false,
}: {
  device: AgentInstallationSummary;
  canManage?: boolean;
  canManageRemote?: boolean;
  companyOptions?: Array<{ id: string; label: string; searchText?: string }>;
  matchedPendingHost?: {
    id: string;
    machineName: string | null;
    status: "PENDING_LINK" | "IGNORED";
  } | null;
  agentTargetVersion?: string | null;
  agentAutoUpgrade?: boolean;
}) {
  const router = useRouter();
  const [isUpgrading, startUpgrading] = useTransition();
  const collectionProfileLabel = device.remoteHostId
    ? "Definido no dispositivo"
    : AGENT_COLLECTION_PROFILE_LABEL.unlinked;
  const outdated = Boolean(
    agentTargetVersion && isAgentVersionBelowTarget(device.agentVersion, agentTargetVersion),
  );
  const canUpgrade =
    Boolean(device.remoteHostId) &&
    supportsManagedAgentUpgrade(device.agentVersion) &&
    outdated;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 pb-8 duration-700">
      <div className="flex flex-col gap-3">
        <Link
          href={AGENT_FLEET_LIST_PATH}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Frota de agentes
        </Link>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {device.hostname ?? device.deviceId}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ultimo heartbeat: {formatInstallationHeartbeatLag(device.heartbeatLagSeconds)}
              {device.lastHeartbeatAt && ` - ${formatDate(device.lastHeartbeatAt)}`}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {device.isOnline ? (
              <Badge className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Online
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1.5 text-muted-foreground">
                <WifiOff className="h-3 w-3" />
                Offline
              </Badge>
            )}
            {outdated ? (
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                Versao abaixo do alvo
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Monitor className="h-4 w-4" />
              Informacoes do dispositivo
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Detail label="Hostname" value={device.hostname} mono={false} />
            <Detail label="Sistema operacional" value={device.os} mono={false} />
            <Detail label="Versao do agente" value={device.agentVersion} mono />
            <Detail label="Versao alvo (frota)" value={agentTargetVersion} mono />
            <Detail label="Identity source" value={device.identitySource} mono={false} />
            <Detail
              label="Perfil de coleta"
              value={collectionProfileLabel}
              mono={false}
            />
            <div className="sm:col-span-2">
              <Detail label="Device ID" value={device.deviceId} mono />
            </div>
            {!device.remoteHostId ? (
              <p className="sm:col-span-2 text-xs text-muted-foreground">
                Sem host vinculado: desired-state usa perfil <span className="font-mono">unlinked</span> (coleta minima).
              </p>
            ) : (
              <p className="sm:col-span-2 text-xs text-muted-foreground">
                O perfil efetivo segue a funcao do dispositivo (machineProfile) na tela do host.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Empresa e vinculo
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Detail label="Empresa" value={device.companyName} mono={false} />
              <AgentHostLinkSection
                deviceId={device.deviceId}
                currentHostId={device.remoteHostId}
                currentHostName={device.remoteHostName}
                canManage={canManage}
                canManageRemote={canManageRemote}
                companyOptions={companyOptions}
                matchedPendingHost={matchedPendingHost}
              />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <KeyRound className="h-4 w-4" />
                Auth da frota
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Detail
                label="Installation token"
                value={device.hasInstallationToken ? "Emitido" : "Ausente (legado)"}
                mono={false}
              />
              <Detail label="Emitido em" value={formatDate(device.installationTokenIssuedAt)} mono={false} />
              <Detail label="Ultimo uso" value={formatDate(device.installationTokenLastUsedAt)} mono={false} />
              <Detail
                label="Auto-upgrade frota"
                value={agentAutoUpgrade ? "Ativo" : "Desligado"}
                mono={false}
              />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock className="h-4 w-4" />
                Historico de datas
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Detail label="Primeiro registro" value={formatDate(device.firstSeenAt)} mono={false} />
              <Detail label="Ultimo heartbeat" value={formatDate(device.lastHeartbeatAt)} mono={false} />
              <Detail label="Ultimo register" value={formatDate(device.lastRegisteredAt)} mono={false} />
            </CardContent>
          </Card>
        </div>
      </div>

      {(canUpgrade || device.remoteHostId) && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Acoes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {canUpgrade ? (
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={isUpgrading}
                onClick={() => {
                  startUpgrading(async () => {
                    try {
                      const result = await requestRemoteMutation<Record<string, unknown>>({
                        url: `/api/remote/hosts/${device.remoteHostId}/actions`,
                        method: "POST",
                        body: { action: "UPGRADE_AGENT" },
                      });
                      toast.success(
                        (typeof result.message === "string" && result.message) ||
                          "Upgrade do agente enfileirado.",
                      );
                      router.refresh();
                    } catch (error) {
                      toast.error(getRemoteApiErrorMessage(error));
                    }
                  });
                }}
              >
                <ArrowUpCircle className="h-4 w-4" />
                {isUpgrading ? "Agendando..." : "Atualizar agente"}
              </Button>
            ) : null}
            {device.remoteHostId ? (
              <Button asChild variant="outline" className="gap-2">
                <Link href={`/portal/infraestrutura/dispositivos/${device.remoteHostId}`}>
                  <ExternalLink className="h-4 w-4" />
                  Abrir dispositivo
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      )}

      {!device.isOnline && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          {getInstallationOfflineWarningMessage()}
        </p>
      )}

      {canManage && <AgentInstallationDeleteSection deviceId={device.deviceId} hostname={device.hostname} />}
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/50 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate text-sm text-foreground ${mono ? "font-mono" : ""}`}>
        {value ?? <span className="italic text-muted-foreground">-</span>}
      </p>
    </div>
  );
}
