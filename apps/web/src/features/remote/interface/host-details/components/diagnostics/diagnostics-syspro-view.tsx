"use client";

import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { Building2, Folder, Server } from "lucide-react";
import { formatDateTime, readSysproInstallationGroups } from "../../host-details.helpers";

type Props = {
  sysproVersionSnapshot: Record<string, unknown> | null;
  sysproVersionSnapshotAt: string | null;
};

export function DiagnosticsSysproView({ sysproVersionSnapshot, sysproVersionSnapshotAt }: Props) {
  const displaySnapshotDate = sysproVersionSnapshotAt ? formatDateTime(sysproVersionSnapshotAt) : "Nunca";
  const groups = readSysproInstallationGroups(sysproVersionSnapshot);

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader className="flex flex-col space-y-2 pb-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle className="text-lg">Instalacoes Syspro</CardTitle>
            <CardDescription>
              Diretorios e instancias de servidor validadas fisicamente pelo agente nesta maquina.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit border-border/60 bg-background/70 text-muted-foreground">
            Ultima coleta: {displaySnapshotDate}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {groups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 p-8 text-center">
              <Folder className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-foreground">Nenhuma instalacao Syspro descoberta</p>
              <p className="mt-1 text-xs text-muted-foreground">
                O agente ainda nao validou nenhuma instancia de servidor relevante nesta maquina.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {groups.map((group) => (
                <div key={group.id} className="rounded-xl border border-border/50 bg-background/50 p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-base text-foreground">{group.rootPath}</span>
                    <Badge variant="outline" className="border-border/60 bg-background/70 text-muted-foreground">
                      {group.classification ?? "UNKNOWN"}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-4">
                    {group.serverInstances.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/40 bg-background/40 p-4 text-sm text-muted-foreground">
                        Nenhuma instancia de servidor validada neste diretorio.
                      </div>
                    ) : null}

                    {group.serverInstances.map((server) => (
                      <div key={server.id} className="rounded-xl border border-border/40 bg-background/60 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Server className="h-4 w-4 text-primary" />
                          <span className="font-medium text-foreground">{server.rootPath}</span>
                          <Badge
                            variant={server.validationStatus === "VALIDATED" ? "outline" : "destructive"}
                            className="border-border/60 bg-background/70"
                          >
                            {server.validationStatus ?? "UNKNOWN"}
                          </Badge>
                        </div>

                        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <span className="block text-xs text-muted-foreground">Versao</span>
                            <span className="font-mono text-foreground">
                              {server.productVersion ?? server.fileVersion ?? "Sem leitura"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-xs text-muted-foreground">Atualizado em</span>
                            <span>{server.updatedAt ? formatDateTime(server.updatedAt) : "Sem leitura"}</span>
                          </div>
                          <div>
                            <span className="block text-xs text-muted-foreground">Executavel</span>
                            <span>{server.executableSizeMb ? `${server.executableSizeMb.toFixed(1)} MB` : "Sem leitura"}</span>
                          </div>
                          <div>
                            <span className="block text-xs text-muted-foreground">Diretorios de dados</span>
                            <span>{server.dataDirectories.map((entry) => entry.path).join(", ") || "Sem leitura"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
