"use client";

import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

type Props = { details: RemoteHostDetails };

export function ErpDiagnosticsView({ details }: Props) {
  const diagnostics = details.erpInstallations.flatMap((installation) => {
    const entries: Array<{ id: string; title: string; description: string }> = [];
    if (!installation.executablePath) entries.push({ id: `${installation.id}-exe`, title: "Executável sem leitura", description: `${installation.rootPath} não informou SysproServer.exe validado.` });
    if (!installation.configPath) entries.push({ id: `${installation.id}-config`, title: "Configuração sem leitura", description: `${installation.rootPath} não informou SysproServer.ini.` });
    if (installation.serviceStatus && installation.serviceStatus !== "running") entries.push({ id: `${installation.id}-service`, title: "Serviço não está em execução", description: `${installation.rootPath}: ${installation.serviceStatus}.` });
    return entries;
  });
  if (!details.erpInstallations.length) diagnostics.push({ id: "no-installations", title: "Nenhuma instalação confirmada", description: "O agente ainda não enviou uma instalação Syspro validada para este dispositivo." });

  return <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm"><h3 className="mb-4 text-lg font-semibold">Diagnóstico</h3><div className="space-y-3">{diagnostics.length ? diagnostics.map((diagnostic) => <div key={diagnostic.id} className="flex gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm"><AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" /><div><p className="font-semibold">{diagnostic.title}</p><p className="text-xs text-muted-foreground">{diagnostic.description}</p></div></div>) : <div className="flex gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div><p className="font-semibold">Sem divergências confirmadas</p><p className="text-xs text-muted-foreground">A última coleta não indicou problemas de configuração ou execução.</p></div></div>}</div></div>;
}
