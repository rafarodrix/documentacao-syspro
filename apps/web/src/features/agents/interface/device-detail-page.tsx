import Link from "next/link";
import { ArrowLeft, Building2, Clock, Monitor, WifiOff } from "lucide-react";
import type { AgentInstallationSummary } from "@dosc-syspro/contracts/agent";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { formatDateTime } from "@/lib/date";
import { formatAgentHeartbeatLag, getAgentOfflineWarningMessage } from "@/features/agents/domain/agent-device-status";
import { AgentDeviceDeleteSection } from "@/features/agents/interface/agent-device-delete-section";
import { AgentHostLinkSection } from "@/features/agents/interface/agent-host-link-section";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const result = formatDateTime(iso);
  return result === "-" ? "-" : result;
}

export function AgentDeviceDetailPanel({
  device,
  canManage = false,
  canManageRemote = false,
  companyOptions = [],
  matchedPendingHost = null,
}: {
  device: AgentInstallationSummary;
  canManage?: boolean;
  canManageRemote?: boolean;
  companyOptions?: Array<{ id: string; label: string; searchText?: string }>;
  matchedPendingHost?: { id: string; machineName: string | null } | null;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 pb-8 duration-700">
      <div className="flex flex-col gap-3">
        <Link
          href="/portal/infraestrutura?tab=agentes"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Agentes
        </Link>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {device.hostname ?? device.deviceId}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ultimo heartbeat: {formatAgentHeartbeatLag(device.heartbeatLagSeconds)}
              {device.lastHeartbeatAt && ` - ${formatDate(device.lastHeartbeatAt)}`}
            </p>
          </div>
          <div className="shrink-0">
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
            <Detail label="Identity source" value={device.identitySource} mono={false} />
            <div className="sm:col-span-2">
              <Detail label="Device ID" value={device.deviceId} mono />
            </div>
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

      {!device.isOnline && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          {getAgentOfflineWarningMessage()}
        </p>
      )}

      {canManage && <AgentDeviceDeleteSection deviceId={device.deviceId} hostname={device.hostname} />}
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
