import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatDateTime, getSysproUpdateHealthMeta } from "../utils";
import { cn } from "@/lib/utils";

export function HostTechnicalTab({
  details,
  host,
  machineIpv4,
  windowsComputerName,
  sysproServerInstallations,
  firebirdData,
}: {
  details: any;
  host: any;
  machineIpv4: string | null;
  windowsComputerName: string | null;
  sysproServerInstallations: any[];
  firebirdData: { name: string | null; version: string | null; processRunning: boolean | null };
}) {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg">Informacoes tecnicas da maquina</CardTitle>
        <CardDescription>Base de diagnostico rapido para atendimento tecnico.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Nome da maquina</p>
            <p className="mt-1 text-sm text-foreground">{windowsComputerName ?? "Sem leitura do agente"}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">IPv4 da maquina</p>
            <p className="mt-1 text-sm text-foreground">{machineIpv4 ?? "Sem leitura"}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">IP reportado (agente)</p>
            <p className="mt-1 text-sm text-foreground">{host.lastKnownIp ?? "Sem leitura"}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">RustDesk ID</p>
            <p className="mt-1 text-sm text-foreground">{host.rustdeskId ?? "Sem leitura"}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
          <p className="text-sm font-medium text-foreground">Dados Syspro Server</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Considera somente instalacoes com caminho `\\Syspro\\Server\\SysproServer.exe`.
          </p>
          {sysproServerInstallations.length ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {sysproServerInstallations.map((context) => {
                const entry = context.update;
                const company = context.company;
                const health = getSysproUpdateHealthMeta({
                  isServerHost: entry.isServerHost,
                  lastFileWriteAt: entry.lastFileWriteAt,
                });
                return (
                  <div key={entry.id} className="rounded-xl border border-border/40 bg-background/60 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Caminho</p>
                    <p className="mt-1 break-all font-mono text-xs text-foreground">{entry.path}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Ultima atualizacao</p>
                    <p className="mt-1 text-sm text-foreground">{formatDateTime(entry.lastFileWriteAt)}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Servidor / Porta / Protocolo</p>
                    <p className="mt-1 text-sm text-foreground">
                      {(company?.serverHost ?? "Sem vinculo")} : {company?.serverPort ?? "-"} ({company?.serverProtocol ?? "-"})
                    </p>
                    <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Topologia detectada</p>
                    <p className="mt-1 text-sm text-foreground">
                      Client: {entry.hasClientFolder === null ? "Sem leitura" : entry.hasClientFolder ? "Sim" : "Nao"} | Dll:{" "}
                      {entry.hasDllFolder === null ? "Sem leitura" : entry.hasDllFolder ? "Sim" : "Nao"}
                    </p>
                    <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Firebird</p>
                    <p className="mt-1 text-sm text-foreground">
                      {entry.firebirdVersion || entry.firebirdPath
                        ? `${entry.firebirdVersion ?? "versao n/d"} (${entry.firebirdPath ?? "caminho n/d"})`
                        : "Sem leitura"}
                    </p>
                    <div className={cn("mt-2 rounded-lg border px-2 py-1 text-xs", health.className)}>
                      {health.label} - {health.detail}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Nenhum Syspro Server detectado nesta maquina.</p>
          )}
        </div>

        <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
          <p className="text-sm font-medium text-foreground">Dados Firebird</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border/40 bg-background/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Produto</p>
              <p className="mt-1 text-sm text-foreground">{firebirdData.name ?? "Sem leitura"}</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-background/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Versao</p>
              <p className="mt-1 text-sm text-foreground">{firebirdData.version ?? "Sem leitura"}</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-background/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Processo fbserver</p>
              <p className="mt-1 text-sm text-foreground">
                {firebirdData.processRunning === null ? "Sem leitura" : firebirdData.processRunning ? "Em execucao" : "Parado"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
