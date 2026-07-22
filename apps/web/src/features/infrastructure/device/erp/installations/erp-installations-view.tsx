"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { formatDateTime } from "@/features/remote/interface/host-details/host-details.helpers";
import { Building2, ChevronDown, ChevronRight, Database, HardDrive, Server } from "lucide-react";

type Props = { details: RemoteHostDetails };

export function ErpInstallationsView({ details }: Props) {
  const installations = details.erpInstallations;
  const [expandedId, setExpandedId] = useState<string | null>(installations[0]?.id ?? null);

  if (!installations.length) {
    return <div className="rounded-xl border border-dashed border-border/50 bg-card p-6 text-center text-sm text-muted-foreground">Nenhuma instalação Syspro validada pelo agente neste dispositivo.</div>;
  }

  return (
    <div className="space-y-4">
      {installations.map((installation) => {
        const expanded = expandedId === installation.id;
        const running = installation.serviceStatus === "running";
        return (
          <article key={installation.id} className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
            <button type="button" onClick={() => setExpandedId(expanded ? null : installation.id)} className="flex w-full items-center justify-between p-5 text-left hover:bg-muted/30">
              <span className="flex min-w-0 items-center gap-3">
                <span className="rounded-lg bg-primary/10 p-2 text-primary"><Server className="h-5 w-5" /></span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2"><span className="truncate font-semibold">{installation.rootPath}</span>{running && <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">Em execução</span>}</span>
                  <span className="block truncate text-xs text-muted-foreground">{installation.version ?? "Versão sem leitura"} · {installation.discoverySources.join(", ") || "Fonte não informada"}</span>
                  <span className="block text-xs text-muted-foreground">{installation.runtimeType ?? "Runtime pendente"} · {installation.configuredPort ? `porta ${installation.configuredPort}` : installation.requestedPort ? `porta ${installation.requestedPort} em conflito` : "porta não informada"} · {installation.runtimeStatus}</span>
                </span>
              </span>
              {expanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
            </button>
            {expanded && <div className="space-y-5 border-t border-border/50 bg-background/30 p-5">
              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 lg:grid-cols-3">
                <PathDetail icon={<HardDrive className="h-3.5 w-3.5" />} label="Diretório raiz" value={installation.rootPath} />
                <PathDetail icon={<Server className="h-3.5 w-3.5" />} label="Servidor" value={installation.serverPath} />
                <PathDetail icon={<Server className="h-3.5 w-3.5" />} label="Executável" value={installation.executablePath} />
                <PathDetail icon={<Database className="h-3.5 w-3.5" />} label="Dados" value={installation.dataPath} />
                <PathDetail icon={<HardDrive className="h-3.5 w-3.5" />} label="Configuração" value={installation.configPath} />
                <PathDetail icon={<Server className="h-3.5 w-3.5" />} label="Execução" value={`${installation.serviceStatus ?? "Sem serviço identificado"}${installation.processPid ? ` · PID ${installation.processPid}` : ""}`} />
              </div>
              <section className="rounded-lg border border-border/40 bg-card/50 p-4"><h5 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground"><Building2 className="h-3.5 w-3.5 text-primary" /> Empresas atendidas</h5>{installation.companies.length ? <div className="flex flex-wrap gap-2">{installation.companies.filter((company) => company.active).map((company) => <span key={company.id} className="rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium"><b className="mr-1 text-primary">{company.role === "PRIMARY" ? "Principal" : "Secundária"}</b>{company.name}</span>)}</div> : <p className="text-xs text-muted-foreground">Nenhuma empresa vinculada a esta instalação.</p>}</section>
              <p className="text-xs text-muted-foreground">Última coleta: {formatDateTime(installation.lastSeenAt)}</p>
            </div>}
          </article>
        );
      })}
    </div>
  );
}

function PathDetail({ icon, label, value }: { icon: ReactNode; label: string; value: string | null }) {
  return <div className="rounded-lg border border-border/40 bg-card/50 p-3"><span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{icon}{label}</span><p className="mt-1 truncate font-mono text-xs">{value ?? "Sem leitura"}</p></div>;
}
