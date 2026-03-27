import { KeyRound, Monitor, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RemotePlatformOverview } from "@/features/remote/domain/model";
import { RemotePlatformControls } from "@/features/remote/interface/remote-controls";
import { RemoteModuleSettingsForm } from "@/components/platform/app/settings/RemoteModuleSettingsForm";

export function RemoteAccessSettingsTab({ overview }: { overview: RemotePlatformOverview }) {
  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Modulo remoto</CardTitle>
          <CardDescription>
            Esta aba fica reservada para parametros globais do modulo. A operacao diaria de hosts, vinculos e sessoes acontece em Plataforma Remota.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Hosts</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{overview.hostStats.total}</p>
            <p className="text-sm text-muted-foreground">Total configurado no escopo atual.</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sessoes abertas</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {overview.sessionStats.requested + overview.sessionStats.started}
            </p>
            <p className="text-sm text-muted-foreground">Requested + Started para operacao imediata.</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Escopo</p>
            <p className="mt-2 text-sm font-medium text-foreground">{overview.tenantScope.summary}</p>
            <p className="text-sm text-muted-foreground">
              {overview.tenantScope.isGlobalView ? "Visao global" : `${overview.tenantScope.companyCount} empresa(s)`}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="space-y-2">
          <CardTitle className="text-lg">Configuracoes globais previstas</CardTitle>
          <CardDescription>
            A base operacional foi movida para a rota do modulo. Este espaco concentra o que for global e transversal ao agente remoto.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
            <div className="mb-2 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Tokens e segredos</p>
            </div>
            <p className="text-sm text-muted-foreground">
              `REMOTE_DISCOVERY_TOKEN`, chave publica do RustDesk e defaults do bootstrap devem ficar centralizados aqui.
            </p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Politicas do agente</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Intervalo de heartbeat, versao alvo do RustDesk e defaults operacionais do bootstrap/sync.
            </p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Governanca</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Controle de quem pode operar hosts e administrar o onboarding tecnico do ambiente remoto.
            </p>
          </div>
        </CardContent>
      </Card>

      <RemoteModuleSettingsForm companyOptions={overview.companyOptions} />

      <RemotePlatformControls overview={overview} />
    </div>
  );
}
