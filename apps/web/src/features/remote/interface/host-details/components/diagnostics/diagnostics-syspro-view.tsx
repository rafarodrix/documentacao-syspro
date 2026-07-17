"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from "@dosc-syspro/ui";
import { Folder, Info, Server, Building2, TerminalSquare } from "lucide-react";
import { formatDateTime } from "../../host-details.helpers";

type Props = {
  sysproVersionSnapshot: Array<Record<string, unknown>> | null;
  sysproVersionSnapshotAt: string | null;
};

export function DiagnosticsSysproView({ sysproVersionSnapshot, sysproVersionSnapshotAt }: Props) {
  const displaySnapshotDate = sysproVersionSnapshotAt ? formatDateTime(sysproVersionSnapshotAt) : "Nunca";

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Instalações Syspro</CardTitle>
            <CardDescription>
              Lista de instalações detectadas fisicamente no disco pelo Go Agent.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit border-border/60 bg-background/70 text-muted-foreground">
            Última coleta: {displaySnapshotDate}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {(!sysproVersionSnapshot || sysproVersionSnapshot.length === 0) ? (
            <div className="rounded-xl border border-dashed border-border/40 p-8 text-center bg-muted/10">
              <Folder className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-foreground">Nenhuma pasta física localizada</p>
              <p className="mt-1 text-xs text-muted-foreground">O agente não identificou diretórios correspondentes ao padrão do Syspro no momento.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {sysproVersionSnapshot.map((folder, idx) => {
                const path = typeof folder["path"] === "string" ? folder["path"] : "Desconhecido";
                const exeVersion = typeof folder["exeVersion"] === "string" ? folder["exeVersion"] : null;
                const exeExists = folder["exeExists"] === true;
                const exeSizeMB = typeof folder["exeSizeMB"] === "number" ? folder["exeSizeMB"] : null;

                return (
                  <div key={`${path}-${idx}`} className="rounded-xl border border-border/50 bg-background/50 shadow-sm p-5 space-y-4 flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Server className="h-5 w-5 text-primary shrink-0" />
                        <span className="font-semibold text-base text-foreground">
                          Syspro Server / Executável
                        </span>
                        {!exeExists && (
                          <Badge variant="destructive" className="ml-2 text-[10px] py-0 border-transparent shadow-none bg-red-500/10 text-red-700 dark:text-red-400">
                            Atenção
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mt-4">
                        <div className="text-sm">
                          <span className="text-muted-foreground block text-xs">Diretório Raiz</span>
                          <span className="font-mono break-all">{path}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground block text-xs">Versão Detectada</span>
                          {exeExists ? (
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">v{exeVersion ?? "Não lida"}</span>
                          ) : (
                            <span className="text-muted-foreground">Sem executável</span>
                          )}
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground block text-xs">Origem</span>
                          <span>Autodescoberta pelo agente</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground block text-xs">Validação</span>
                          {exeExists ? (
                            <span className="text-emerald-600 dark:text-emerald-400">Executável confirmado ({exeSizeMB?.toFixed(1)} MB)</span>
                          ) : (
                            <span className="text-red-500 dark:text-red-400">Executável não encontrado na pasta</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
