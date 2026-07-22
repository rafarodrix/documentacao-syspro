"use client";

import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";

type Props = { details: RemoteHostDetails };

export function ErpComponentsView({ details }: Props) {
  const firebird = Array.from(new Map(details.installationContexts.filter((context) => context.update.firebirdPath || context.update.firebirdVersion).map((context) => [context.update.firebirdPath ?? context.update.firebirdVersion!, context.update])).values());

  return <div className="space-y-4"><div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm"><h3 className="mb-4 text-lg font-semibold">Componentes detectados</h3><div className="grid grid-cols-1 gap-4 md:grid-cols-2">{details.erpInstallations.map((installation) => <ComponentCard key={installation.id} name="Syspro Server" status={installation.serviceStatus} detail={installation.serverPath ?? installation.executablePath ?? "Caminho sem leitura"} />)}{firebird.map((update) => <ComponentCard key={update.path} name="Firebird" status={update.firebirdVersion ?? "Detectado"} detail={update.firebirdPath ?? "Caminho sem leitura"} />)}{!details.erpInstallations.length && !firebird.length && <p className="text-sm text-muted-foreground">Nenhum componente ERP confirmado pela última coleta.</p>}</div></div></div>;
}

function ComponentCard({ name, status, detail }: { name: string; status: string | null; detail: string }) {
  return <div className="rounded-lg border border-border/50 bg-background/40 p-4"><div className="flex items-center justify-between gap-3"><span className="font-medium">{name}</span><span className="rounded-full border border-border px-2 py-0.5 text-xs">{status ?? "Sem estado"}</span></div><p className="mt-2 break-all font-mono text-xs text-muted-foreground">{detail}</p></div>;
}
