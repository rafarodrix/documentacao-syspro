import type { RemoteHostDetails } from "@/features/remote/domain/model";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatDateTime } from "../host-details.helpers";

type AgentTelemetry = RemoteHostDetails["agentTelemetry"];
type SnapshotRecord = Record<string, unknown> | null;

type HostInfraTabProps = {
  details: RemoteHostDetails;
  systemSnapshot: AgentTelemetry["systemSnapshot"];
  networkSnapshot: AgentTelemetry["networkSnapshot"];
  softwareSnapshot: AgentTelemetry["softwareSnapshot"];
  hardwareIdentity: AgentTelemetry["hardwareIdentity"];
  diskSnapshot: AgentTelemetry["diskSnapshot"];
  sysproProcessSnapshot: AgentTelemetry["sysproProcessSnapshot"];
  windowsUpdateStatus: AgentTelemetry["windowsUpdateStatus"];
  rebootPending: AgentTelemetry["rebootPending"];
};

function readString(snapshot: SnapshotRecord, key: string): string | null {
  const value = snapshot?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(snapshot: SnapshotRecord, key: string): number | null {
  const value = snapshot?.[key];
  return typeof value === "number" ? value : null;
}

export function HostInfraTab({
  details,
  systemSnapshot,
  networkSnapshot,
  softwareSnapshot,
  hardwareIdentity,
  diskSnapshot,
  sysproProcessSnapshot,
  windowsUpdateStatus,
  rebootPending,
}: HostInfraTabProps) {
  const downSysproProcessCount = sysproProcessSnapshot.filter((entry) => entry["running"] === false).length;
  const pendingWindowsUpdates =
    typeof windowsUpdateStatus?.["pendingCount"] === "number" ? windowsUpdateStatus["pendingCount"] : null;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg">Infraestrutura da máquina</CardTitle>
        <CardDescription>Telemetria de sistema, rede, hardware e inventário de software reportados pelo agente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
          <p className="text-sm font-medium text-foreground">Visão geral de hardware e rede</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sistema operacional</p>
              <p className="mt-2 text-sm text-foreground">{readString(systemSnapshot, "osCaption") ?? "Sem leitura"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Atualizado em {formatDateTime(details.agentTelemetry.systemSnapshotAt)}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Memória / Disco</p>
              <p className="mt-2 text-sm text-foreground">
                RAM livre: {readNumber(systemSnapshot, "freeRamMb") !== null ? `${readNumber(systemSnapshot, "freeRamMb")} MB` : "-"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Disco livre C: {readNumber(systemSnapshot, "diskFreeGb") !== null ? `${readNumber(systemSnapshot, "diskFreeGb")} GB` : "-"}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Rede</p>
              <p className="mt-2 text-sm text-foreground">{readString(networkSnapshot, "defaultGateway") ?? "Sem leitura"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Atualizado em {formatDateTime(details.agentTelemetry.networkSnapshotAt)}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Inventário de software</p>
              <p className="mt-2 text-sm text-foreground">{softwareSnapshot.length} item(ns)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Atualizado em {formatDateTime(details.agentTelemetry.softwareSnapshotAt)}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Hardware e discos</p>
              <p className="mt-2 text-sm text-foreground">{readString(hardwareIdentity, "systemModel") ?? "Sem leitura"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Volumes: {diskSnapshot.length} | Atualizado em {formatDateTime(details.agentTelemetry.diskSnapshotAt)}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Saúde operacional</p>
              <p className="mt-2 text-sm text-foreground">
                Reinicialização pendente: {rebootPending === null ? "Sem leitura" : rebootPending ? "Sim" : "Não"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Processos Syspro em alerta: {downSysproProcessCount}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Updates pendentes: {pendingWindowsUpdates ?? "-"}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
