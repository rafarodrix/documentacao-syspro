import Link from "next/link";
import { ArrowLeft, Building2, Clock, ExternalLink, Monitor, WifiOff } from "lucide-react";
import type { AgentDeviceSummary } from "@dosc-syspro/contracts/agent";
import { Badge } from "@dosc-syspro/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";

function relativeTime(lagSeconds: number | null): string {
  if (lagSeconds === null) return "nunca";
  if (lagSeconds < 60) return `há ${lagSeconds}s`;
  if (lagSeconds < 3600) return `há ${Math.floor(lagSeconds / 60)}min`;
  if (lagSeconds < 86400) return `há ${Math.floor(lagSeconds / 3600)}h`;
  return `há ${Math.floor(lagSeconds / 86400)}d`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function AgentDeviceDetailPanel({ device }: { device: AgentDeviceSummary }) {
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
              Último heartbeat: {relativeTime(device.heartbeatLagSeconds)}
              {device.lastHeartbeatAt && ` — ${formatDate(device.lastHeartbeatAt)}`}
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
              Informações do dispositivo
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Detail label="Hostname" value={device.hostname} mono={false} />
            <Detail label="Sistema operacional" value={device.os} mono={false} />
            <Detail label="Versão do agente" value={device.agentVersion} mono />
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
                Empresa e vínculo
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Detail label="Empresa" value={device.companyName} mono={false} />
              <div className="rounded-lg border border-border/40 bg-background/50 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Host remoto</p>
                {device.remoteHostId && device.remoteHostName ? (
                  <Link
                    href={`/portal/infraestrutura/hosts/${device.remoteHostId}`}
                    className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    {device.remoteHostName}
                  </Link>
                ) : (
                  <p className="mt-1 text-sm italic text-muted-foreground">—</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock className="h-4 w-4" />
                Histórico de datas
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Detail label="Primeiro registro" value={formatDate(device.firstSeenAt)} mono={false} />
              <Detail label="Último heartbeat" value={formatDate(device.lastHeartbeatAt)} mono={false} />
              <Detail label="Último register" value={formatDate(device.lastRegisteredAt)} mono={false} />
            </CardContent>
          </Card>
        </div>
      </div>

      {!device.isOnline && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          O agente enterprise não enviou heartbeat nos últimos {Math.round(5)} minutos. Verifique se o serviço está rodando na máquina.
        </p>
      )}
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
        {value ?? <span className="italic text-muted-foreground">—</span>}
      </p>
    </div>
  );
}
