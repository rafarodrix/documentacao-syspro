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
            <CardTitle className="text-lg">Instalações Syspro</CardTitle>
            <CardDescription>
              Grupos, componentes e instâncias validadas fisicamente pelo agente nesta máquina.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit border-border/60 bg-background/70 text-muted-foreground">
            Última coleta: {displaySnapshotDate}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {groups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 p-8 text-center">
              <Folder className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-foreground">Nenhuma topologia Syspro descoberta</p>
              <p className="mt-1 text-xs text-muted-foreground">
                O agente ainda não validou nenhuma instância de servidor ou grupo relevante nesta máquina.
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
                    {group.confidence ? (
                      <Badge variant="outline" className="border-border/60 bg-background/70 text-muted-foreground">
                        {group.confidence}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm">
                    <div>
                      <span className="block text-xs text-muted-foreground">Papéis</span>
                      <span>{group.roles.join(", ") || "Sem leitura"}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground">Clientes</span>
                      <span>{group.clientInstances.length}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground">Servidores</span>
                      <span>{group.serverInstances.length}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground">Evidências</span>
                      <span>{group.discoveryEvidence.join(", ") || "Sem leitura"}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4">
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

                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm">
                          <div>
                            <span className="block text-xs text-muted-foreground">Versão</span>
                            <span className="font-mono text-foreground">
                              {server.productVersion ?? server.fileVersion ?? "Sem leitura"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-xs text-muted-foreground">Atualizado em</span>
                            <span>{server.updatedAt ? formatDateTime(server.updatedAt) : "Sem leitura"}</span>
                          </div>
                          <div>
                            <span className="block text-xs text-muted-foreground">Origem da data</span>
                            <span>{server.updateSource ?? "Sem leitura"}</span>
                          </div>
                          <div>
                            <span className="block text-xs text-muted-foreground">Executável</span>
                            <span>{server.executableSizeMb ? `${server.executableSizeMb.toFixed(1)} MB` : "Sem leitura"}</span>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
                          <div>
                            <span className="block text-xs text-muted-foreground">Arquivos validados</span>
                            <span>{server.validationEvidence.join(", ") || "Sem leitura"}</span>
                          </div>
                          <div>
                            <span className="block text-xs text-muted-foreground">Diretórios de dados</span>
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
