import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RemotePlatformOverview } from "@/features/remote/domain/model";
import { RemotePlatformControls } from "@/features/remote/interface/remote-controls";

export function RemoteAccessSettingsTab({ overview }: { overview: RemotePlatformOverview }) {
  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Acesso Remoto</CardTitle>
          <CardDescription>
            Configuracao de hosts, associacao por empresa e preparacao operacional da plataforma remota.
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

      <RemotePlatformControls overview={overview} />

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Hosts configurados recentemente</CardTitle>
          <CardDescription>Referencias operacionais para validar cadastro, provider e escopo por empresa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {overview.recentHosts.length ? (
            overview.recentHosts.map((host) => (
              <div key={host.id} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{host.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {host.companyName ?? "Sem empresa"}
                      {host.environment ? ` | ${host.environment}` : ""}
                      {host.provider ? ` | ${host.provider}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                    {host.status}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum host configurado ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
