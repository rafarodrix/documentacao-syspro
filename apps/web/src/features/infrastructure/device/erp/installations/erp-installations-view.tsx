"use client";

import { useState } from "react";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { formatDateTime, readSysproInstallationGroups } from "@/features/remote/interface/host-details/host-details.helpers";
import { ChevronDown, ChevronRight, Server, Database, Building2, HardDrive, Cpu, Activity } from "lucide-react";

type Props = {
  details: RemoteHostDetails;
};

export function ErpInstallationsView({ details }: Props) {
  const groups = readSysproInstallationGroups(details.agentTelemetry.sysproVersionSnapshot);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(groups[0]?.id ?? null);

  const toggleExpand = (id: string) => {
    setExpandedGroupId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 bg-card p-6 text-sm text-muted-foreground text-center">
          Nenhuma instalação Syspro validada pelo agente neste dispositivo.
        </div>
      ) : (
        groups.map((group) => {
          const isExpanded = expandedGroupId === group.id;
          const server = group.serverInstances[0];
          const execution = server?.execution;

          return (
            <div key={group.id} className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden transition-all">
              {/* Card Header (Clickable Expandable) */}
              <div
                onClick={() => toggleExpand(group.id)}
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Server className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-semibold text-foreground">{group.rootPath}</h4>
                      {execution?.serviceStatus === "running" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Em Execução
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Classificação: {group.classification ?? "Sem leitura"} • Fontes: {group.discoveryEvidence.join(", ") || "Filesystem"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground hidden sm:inline-block">
                    {server?.productVersion || server?.fileVersion || "v1.0.0"}
                  </span>
                  {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                </div>
              </div>

              {/* Expandable Details Section */}
              {isExpanded && (
                <div className="border-t border-border/50 bg-background/30 p-5 space-y-6">
                  {/* General Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div className="p-3 rounded-lg border border-border/40 bg-card/50 space-y-1">
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <HardDrive className="h-3.5 w-3.5 text-primary" /> Diretorio Raiz & Servidor
                      </span>
                      <p className="font-mono text-xs text-foreground truncate">{server?.rootPath ?? group.rootPath}</p>
                    </div>

                    <div className="p-3 rounded-lg border border-border/40 bg-card/50 space-y-1">
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-primary" /> Executavel
                      </span>
                      <p className="font-mono text-xs text-foreground truncate">{server?.executablePath ?? "Sem leitura"}</p>
                    </div>

                    <div className="p-3 rounded-lg border border-border/40 bg-card/50 space-y-1">
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Database className="h-3.5 w-3.5 text-primary" /> Diretório de Dados
                      </span>
                      <p className="font-mono text-xs text-foreground truncate">
                        {server?.dataDirectories.map((d) => d.path).join(", ") || "Sem leitura"}
                      </p>
                    </div>
                  </div>

                  {/* Technical Execution State */}
                  <div className="rounded-lg border border-border/40 bg-card/50 p-4 space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-primary" /> Estado Técnico da Instância
                    </h5>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Serviço Windows</span>
                        <span className="font-semibold text-foreground">{execution?.serviceStatus ?? "Desconhecido"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Processo PID</span>
                        <span className="font-mono font-semibold text-foreground">{execution?.pid ?? "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Versao do Produto</span>
                        <span className="font-semibold text-foreground">{server?.productVersion ?? "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Ultima Atualizacao</span>
                        <span className="font-semibold text-foreground">{formatDateTime(server?.updatedAt ?? null)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Companies Served Linkage */}
                  <div className="rounded-lg border border-border/40 bg-card/50 p-4 space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-primary" /> Empresas Atendidas por esta Instalação
                    </h5>

                    {server?.companyHints && server.companyHints.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {server.companyHints.map((comp, idx) => (
                          <div key={idx} className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-foreground">
                            <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                              {comp.companyId ?? "Empresa"}
                            </span>
                            <span>{comp.companyName || comp.path || "Empresa Syspro"}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Nenhuma empresa associada diretamente a este diretório.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
