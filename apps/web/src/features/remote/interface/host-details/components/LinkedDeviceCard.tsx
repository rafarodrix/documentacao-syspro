import Link from "next/link";
import { Cpu, ExternalLink, Wifi, WifiOff } from "lucide-react";
import type { AgentDeviceSummary } from "@dosc-syspro/contracts/agent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function relativeTime(lagSeconds: number | null): string {
  if (lagSeconds === null) return "nunca";
  if (lagSeconds < 60) return `há ${lagSeconds}s`;
  if (lagSeconds < 3600) return `há ${Math.floor(lagSeconds / 60)}min`;
  if (lagSeconds < 86400) return `há ${Math.floor(lagSeconds / 3600)}h`;
  return `há ${Math.floor(lagSeconds / 86400)}d`;
}

export function LinkedDeviceCard({ device }: { device: AgentDeviceSummary }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-base font-semibold">
            <Cpu className="h-4 w-4 text-primary" />
            Dispositivo vinculado
          </span>
          <Link
            href={`/portal/infraestrutura?tab=agentes`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Ver todos
            <ExternalLink className="h-3 w-3" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status banner */}
        <div
          className={`flex items-center gap-3 rounded-xl border p-4 ${
            device.isOnline
              ? "border-emerald-500/20 bg-emerald-500/5"
              : "border-muted-foreground/15 bg-muted/20"
          }`}
        >
          {device.isOnline ? (
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-50" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
          ) : (
            <WifiOff className="h-4 w-4 shrink-0 text-muted-foreground/60" />
          )}
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${device.isOnline ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>
              {device.isOnline ? "Online" : "Offline"}
            </p>
            <p className="text-xs text-muted-foreground">
              Último heartbeat: {relativeTime(device.heartbeatLagSeconds)}
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              device.isOnline
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px]"
                : "border-border/50 text-muted-foreground text-[10px]"
            }
          >
            {device.isOnline ? "Ativo" : "Inativo"}
          </Badge>
        </div>

        {/* Details grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Detail label="Hostname" value={device.hostname} mono={false} />
          <Detail label="Sistema operacional" value={device.os} mono={false} />
          <Detail label="Versão do agente" value={device.agentVersion} mono />
          <Detail label="Device ID" value={device.deviceId.slice(0, 16) + "…"} mono />
        </div>

        {!device.isOnline && (
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            O agente enterprise não enviou heartbeat nos últimos 5 minutos. Verifique se o serviço está rodando na máquina.
          </p>
        )}
      </CardContent>
    </Card>
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
        {value ?? <span className="text-muted-foreground italic">—</span>}
      </p>
    </div>
  );
}
