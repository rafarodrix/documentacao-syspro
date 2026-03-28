import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { RemotePlatformOverview, RemotePlatformStatus } from "@/features/remote/domain/model";
import { RemotePlatformControls } from "@/features/remote/interface/remote-controls";
import { Building2, Database, KeyRound, LaptopMinimal } from "lucide-react";

const statusLabel: Record<RemotePlatformStatus, string> = {
  planned: "Planejado",
  foundation: "Fundacao",
  in_progress: "Em andamento",
  blocked: "Bloqueado",
};

const statusVariant: Record<RemotePlatformStatus, string> = {
  planned:     "border-border/60 bg-muted/50 text-muted-foreground",
  foundation:  "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  in_progress: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  blocked:     "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
};

type OverviewStat = {
  label: string;
  value: number;
};

type RecentItem = {
  id: string;
  primary: string;
  secondary: string;
  tertiary?: string;
  status: string;
};

const statsGridClassBySize: Record<number, string> = {
  4: "grid-cols-2 sm:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-5",
};

function StatsStrip({ stats }: { stats: OverviewStat[] }) {
  const gridClass = statsGridClassBySize[stats.length] ?? "grid-cols-2";

  return (
    <div className={`grid gap-2 rounded-lg border border-border/50 bg-muted/20 p-3 ${gridClass}`}>
      {stats.map(({ label, value }) => (
        <div key={label} className="text-center">
          <p className="text-lg font-semibold text-foreground">{value}</p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}

function RecentItemCard({
  title,
  stats,
  items,
  emptyMessage,
}: {
  title: string;
  stats: OverviewStat[];
  items: RecentItem[];
  emptyMessage: string;
}) {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <StatsStrip stats={stats} />

        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.primary}</p>
                  <p className="text-xs text-muted-foreground">{item.secondary}</p>
                  {item.tertiary ? (
                    <p className="text-xs text-muted-foreground">{item.tertiary}</p>
                  ) : null}
                </div>
                <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                  {item.status}
                </Badge>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function RemotePlatformOverviewPanel({ overview }: { overview: RemotePlatformOverview }) {
  return (
    <div className="space-y-8">
      <RemotePlatformControls overview={overview} />

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
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">Escopo efetivo da sessao</p>
                <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                  {overview.tenantScope.isGlobalView ? "Global" : "Por empresa"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{overview.tenantScope.summary}</p>
              {!overview.tenantScope.isGlobalView && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Empresas no escopo: {overview.tenantScope.companyCount}
                </p>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
            {overview.accessPolicies.map((policy) => (
              <div key={policy.role} className="rounded-lg border border-border/50 bg-muted/20 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{policy.role}</p>
                  <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                    {policy.scope === "global" ? "Global" : "Por empresa"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{policy.description}</p>
              </div>
            ))}
            </div>
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
                  <Badge variant="outline" className={statusVariant[module.status]}>
                    {statusLabel[module.status]}
                  </Badge>
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

      <section className="grid gap-6 lg:grid-cols-2">
        <RecentItemCard
          title="Hosts persistidos"
          stats={[
            { label: "Total", value: overview.hostStats.total },
            { label: "Ativos", value: overview.hostStats.active },
            { label: "Manutenção", value: overview.hostStats.maintenance },
            { label: "Inativos", value: overview.hostStats.inactive },
          ]}
          items={overview.recentHosts.map((host) => ({
            id: host.id,
            primary: host.name,
            secondary: `${host.companyName ?? "Sem empresa"}${host.environment ? ` | ${host.environment}` : ""}`,
            status: host.status,
          }))}
          emptyMessage="Nenhum host remoto persistido ainda."
        />

        <RecentItemCard
          title="Sessoes persistidas"
          stats={[
            { label: "Total", value: overview.sessionStats.total },
            { label: "Req.", value: overview.sessionStats.requested },
            { label: "Init.", value: overview.sessionStats.started },
            { label: "Ended", value: overview.sessionStats.ended },
            { label: "Failed", value: overview.sessionStats.failed },
          ]}
          items={overview.recentSessions.map((session) => ({
            id: session.id,
            primary: session.hostName,
            secondary: `${session.companyName ?? "Sem empresa"} | Solicitado por ${session.requestedByName ?? session.requestedByUserId}`,
            tertiary: session.ticketNumber ? `Ticket #${session.ticketNumber}` : undefined,
            status: session.status,
          }))}
          emptyMessage="Nenhuma sessao remota persistida ainda."
        />
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xl font-semibold text-foreground">Endpoints previstos</p>
          <p className="text-sm text-muted-foreground">Contratos HTTP iniciais do fluxo remoto.</p>
        </div>
        <Card className="border-border/50">
          <CardContent className="space-y-3 pt-6">
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
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xl font-semibold text-foreground">Roadmap por fases</p>
          <p className="text-sm text-muted-foreground">Sequencia recomendada para sair do shell e chegar a operacao real.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {overview.roadmap.map((phase) => (
            <Card key={phase.id} className="border-border/50">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">{phase.title}</CardTitle>
                  <Badge variant="outline" className={statusVariant[phase.status]}>
                    {statusLabel[phase.status]}
                  </Badge>
                </div>
                <CardDescription>{phase.summary}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <Accordion type="single" collapsible>
          <AccordionItem value="technical-reference" className="rounded-lg border border-border/50 bg-muted/10 px-4">
            <AccordionTrigger className="py-3 text-sm font-medium text-foreground hover:no-underline">
            Referência técnica — contratos de modelo
            </AccordionTrigger>
            <AccordionContent>
            <div className="mt-3 grid gap-6 lg:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Modelo inicial de RemoteHost</CardTitle>
                  <CardDescription>`companyId` e obrigatorio para filtrar hosts por tenant.</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    {[
                      { key: "id", value: overview.hostModel.id },
                      { key: "companyId", value: overview.hostModel.companyId },
                      { key: "name", value: overview.hostModel.name },
                      { key: "environment", value: overview.hostModel.environment },
                      { key: "provider", value: overview.hostModel.provider },
                      { key: "status", value: overview.hostModel.status },
                    ].map(({ key, value }) => (
                      <div key={key} className="flex gap-2">
                        <dt className="w-28 shrink-0 font-mono text-xs text-muted-foreground">{key}</dt>
                        <dd className="text-foreground">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Modelo inicial de RemoteSession</CardTitle>
                  <CardDescription>`companyId` e proprio para auditar e filtrar sessoes sem depender so do host.</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    {[
                      { key: "id", value: overview.sessionModel.id },
                      { key: "companyId", value: overview.sessionModel.companyId },
                      { key: "hostId", value: overview.sessionModel.hostId },
                      { key: "ticketId", value: overview.sessionModel.ticketId ?? "null" },
                      { key: "ticketNumber", value: overview.sessionModel.ticketNumber ?? "null" },
                      { key: "requestedByUserId", value: overview.sessionModel.requestedByUserId },
                      { key: "startedByUserId", value: overview.sessionModel.startedByUserId },
                      { key: "status", value: overview.sessionModel.status },
                    ].map(({ key, value }) => (
                      <div key={key} className="flex gap-2">
                        <dt className="w-36 shrink-0 font-mono text-xs text-muted-foreground">{key}</dt>
                        <dd className="text-foreground">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>

              <Card className="border-border/50 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Recorte tecnico de auditoria</CardTitle>
                  <CardDescription>Contrato-base para registrar solicitacao, inicio, encerramento e origem da sessao.</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    {[
                      { key: "id", value: overview.sessionAuditModel.id },
                      { key: "sessionId", value: overview.sessionAuditModel.sessionId },
                      { key: "action", value: overview.sessionAuditModel.action },
                      { key: "source", value: overview.sessionAuditModel.source },
                      { key: "actorUserId", value: overview.sessionAuditModel.actorUserId ?? "null" },
                      { key: "hostId", value: overview.sessionAuditModel.hostId ?? "null" },
                      { key: "ticketNumber", value: overview.sessionAuditModel.ticketNumber ?? "null" },
                      { key: "occurredAt", value: overview.sessionAuditModel.occurredAt },
                      { key: "summary", value: overview.sessionAuditModel.summary },
                      { key: "metadata", value: overview.sessionAuditModel.metadata },
                    ].map(({ key, value }) => (
                      <div key={key} className="flex gap-2">
                        <dt className="w-32 shrink-0 font-mono text-xs text-muted-foreground">{key}</dt>
                        <dd className="text-foreground">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
}
