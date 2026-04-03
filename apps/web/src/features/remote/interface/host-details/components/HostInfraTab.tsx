import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatDateTime } from "../utils";

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
}: {
  details: any;
  systemSnapshot: any;
  networkSnapshot: any;
  softwareSnapshot: any[];
  hardwareIdentity: any;
  diskSnapshot: any[];
  sysproProcessSnapshot: any[];
  windowsUpdateStatus: any;
  rebootPending: boolean | null;
}) {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg">Infra da maquina</CardTitle>
        <CardDescription>Telemetria de sistema, rede, inventario e snapshots raw.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
          <p className="text-sm font-medium text-foreground">Hardware e conectividade reportados pelo agente</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sistema operacional</p>
              <p className="mt-2 text-sm text-foreground">
                {typeof systemSnapshot?.osCaption === "string" && systemSnapshot.osCaption.trim()
                  ? systemSnapshot.osCaption
                  : "Sem leitura"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Atualizado em {formatDateTime(details.agentTelemetry.systemSnapshotAt)}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Memoria / Disco</p>
              <p className="mt-2 text-sm text-foreground">
                RAM livre: {typeof systemSnapshot?.freeRamMb === "number" ? `${systemSnapshot.freeRamMb} MB` : "-"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Disco livre C: {typeof systemSnapshot?.diskFreeGb === "number" ? `${systemSnapshot.diskFreeGb} GB` : "-"}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Rede</p>
              <p className="mt-2 text-sm text-foreground">
                Gateway: {typeof networkSnapshot?.defaultGateway === "string" && networkSnapshot.defaultGateway.trim()
                  ? networkSnapshot.defaultGateway
                  : "Sem leitura"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Atualizado em {formatDateTime(details.agentTelemetry.networkSnapshotAt)}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Inventario de software</p>
              <p className="mt-2 text-sm text-foreground">{softwareSnapshot.length} item(ns)</p>
              <p className="mt-1 text-xs text-muted-foreground">Atualizado em {formatDateTime(details.agentTelemetry.softwareSnapshotAt)}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Hardware e discos</p>
              <p className="mt-2 text-sm text-foreground">
                Modelo: {typeof hardwareIdentity?.systemModel === "string" && hardwareIdentity.systemModel.trim()
                  ? hardwareIdentity.systemModel
                  : "Sem leitura"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Volumes: {diskSnapshot.length} | Atualizado em {formatDateTime(details.agentTelemetry.diskSnapshotAt)}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Saude operacional</p>
              <p className="mt-2 text-sm text-foreground">
                Reboot pendente: {rebootPending === null ? "Sem leitura" : rebootPending ? "Sim" : "Nao"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Processos Syspro em alerta: {sysproProcessSnapshot.filter((entry) => entry["running"] === false).length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Updates pendentes: {typeof windowsUpdateStatus?.["pendingCount"] === "number" ? windowsUpdateStatus["pendingCount"] : "-"}
              </p>
            </div>
          </div>
          <details className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">Snapshots raw (hardware/rede/software)</summary>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">
              {JSON.stringify(
                {
                  systemSnapshot: systemSnapshot ?? { status: "Sem leitura" },
                  networkSnapshot: networkSnapshot ?? { status: "Sem leitura" },
                  softwareSnapshot: softwareSnapshot.length ? softwareSnapshot : [{ status: "Sem leitura" }],
                  hardwareIdentity: hardwareIdentity ?? { status: "Sem leitura" },
                  diskSnapshot: diskSnapshot.length ? diskSnapshot : [{ status: "Sem leitura" }],
                  sysproProcessSnapshot: sysproProcessSnapshot.length ? sysproProcessSnapshot : [{ status: "Sem leitura" }],
                  windowsUpdateStatus: windowsUpdateStatus ?? { status: "Sem leitura" },
                  rebootPending: rebootPending,
                },
                null,
                2
              )}
            </pre>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}
