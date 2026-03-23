import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RemotePlatformOverview, RemotePlatformStatus } from "@/features/remote/domain/model";
import { Building2, Database, KeyRound, LaptopMinimal, ShieldCheck, Waypoints } from "lucide-react";

const statusLabel: Record<RemotePlatformStatus, string> = {
  planned: "Planejado",
  foundation: "Fundacao",
  in_progress: "Em andamento",
  blocked: "Bloqueado",
};

const statusVariant: Record<RemotePlatformStatus, string> = {
  planned: "bg-muted text-muted-foreground border-border",
  foundation: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-300",
  in_progress: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-300",
  blocked: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-300",
};

export function RemotePlatformOverviewPanel({ overview }: { overview: RemotePlatformOverview }) {
  return (
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-3 border-border/50 bg-background/70 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                Estrutura inicial
              </Badge>
              <Badge variant="outline" className="border-border/60 bg-muted/50 text-muted-foreground">
                MVP remoto
              </Badge>
            </div>
            <CardTitle className="text-3xl tracking-tight">{overview.title}</CardTitle>
            <CardDescription className="max-w-3xl text-base leading-relaxed">
              {overview.summary}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LaptopMinimal className="h-5 w-5 text-primary" />
              Engine remota
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{overview.recommendedEngine}</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5 text-primary" />
              Cofre de segredos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{overview.secretVault}</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-primary" />
              Backup base
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{overview.backupStrategy}</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              Escopo por empresa
            </CardTitle>
            <CardDescription>{overview.companyFilterRule}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {overview.accessPolicies.map((policy) => (
              <div key={policy.role} className="rounded-lg border border-border/50 bg-muted/20 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{policy.role}</h3>
                  <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                    {policy.scope === "global" ? "Global" : "Por empresa"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{policy.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Modulos-base</h2>
          <p className="text-sm text-muted-foreground">Recorte inicial para persistencia, API e interface do MVP.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {overview.modules.map((module) => (
            <Card key={module.id} className="border-border/50">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusVariant[module.status]}`}>
                    {statusLabel[module.status]}
                  </span>
                </div>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Proximo passo:</span> {module.nextStep}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Waypoints className="h-5 w-5 text-primary" />
              Endpoints previstos
            </CardTitle>
            <CardDescription>Contratos HTTP iniciais do fluxo remoto.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.endpoints.map((endpoint) => (
              <div key={`${endpoint.method}-${endpoint.path}`} className="flex flex-col gap-1 rounded-lg border border-border/50 bg-muted/20 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">{endpoint.method}</span>
                  <code className="text-xs sm:text-sm">{endpoint.path}</code>
                </div>
                <p className="text-sm text-muted-foreground">{endpoint.purpose}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Roadmap por fases
            </CardTitle>
            <CardDescription>Sequencia recomendada para sair do shell e chegar a operacao real.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {overview.roadmap.map((phase) => (
              <div key={phase.id} className="rounded-lg border border-border/50 bg-muted/20 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">{phase.title}</h3>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusVariant[phase.status]}`}>
                    {statusLabel[phase.status]}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{phase.summary}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Modelo inicial de RemoteHost</CardTitle>
            <CardDescription>`companyId` e obrigatorio para filtrar hosts por tenant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">id:</span> {overview.hostModel.id}
            </p>
            <p>
              <span className="font-medium text-foreground">companyId:</span> {overview.hostModel.companyId}
            </p>
            <p>
              <span className="font-medium text-foreground">name:</span> {overview.hostModel.name}
            </p>
            <p>
              <span className="font-medium text-foreground">environment:</span> {overview.hostModel.environment}
            </p>
            <p>
              <span className="font-medium text-foreground">provider:</span> {overview.hostModel.provider}
            </p>
            <p>
              <span className="font-medium text-foreground">status:</span> {overview.hostModel.status}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Modelo inicial de RemoteSession</CardTitle>
            <CardDescription>`companyId` e proprio para auditar e filtrar sessoes sem depender so do host.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">id:</span> {overview.sessionModel.id}
            </p>
            <p>
              <span className="font-medium text-foreground">companyId:</span> {overview.sessionModel.companyId}
            </p>
            <p>
              <span className="font-medium text-foreground">hostId:</span> {overview.sessionModel.hostId}
            </p>
            <p>
              <span className="font-medium text-foreground">requestedByUserId:</span> {overview.sessionModel.requestedByUserId}
            </p>
            <p>
              <span className="font-medium text-foreground">startedByUserId:</span> {overview.sessionModel.startedByUserId}
            </p>
            <p>
              <span className="font-medium text-foreground">status:</span> {overview.sessionModel.status}
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
