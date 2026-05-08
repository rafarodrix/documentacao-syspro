"use client";

import Link from "next/link";
import { Clock3, Loader2, Monitor, Waypoints } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { useChatwootDashboard } from "../chatwoot-dashboard-context";
import {
  EmptyState,
  InlineLoading,
  InlineWarning,
  RemoteHostStatusBadges,
  formatRelativeDate,
  getRemoteHostSummary,
} from "../chatwoot-dashboard-ui";
import { getRemoteOperationalStatusMeta } from "@/features/remote/domain";

export function ChatwootInfrastructureTab() {
  const {
    resolved,
    companyHosts,
    isLoadingHosts,
    hostError,
    recommendedHost,
    startingHostId,
    isStartingSession,
    canOpenInfrastructureHosts,
    setHostReloadToken,
    handleStartHostSession,
  } = useChatwootDashboard();

  const recommendedOperationalMeta = recommendedHost
    ? getRemoteOperationalStatusMeta(recommendedHost.operationalStatus)
    : null;
  const recommendedSummary = getRemoteHostSummary(recommendedHost);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Monitor className="h-4 w-4 text-primary" />
              Infraestrutura
            </CardTitle>
            <CardDescription>Hosts e atalhos operacionais da empresa em contexto.</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setHostReloadToken((current) => current + 1)}
            className="shrink-0"
          >
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Empresa</p>
            <p className="mt-1 truncate text-sm font-semibold text-foreground">{resolved.companyName || "Sem vinculo"}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Hosts</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{companyHosts.length} disponive{companyHosts.length !== 1 ? "is" : "l"}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recomendado</p>
            <p className="mt-1 truncate text-sm font-semibold text-foreground">{recommendedSummary.value}</p>
          </div>
        </div>

        {/* Recommended host */}
        {recommendedHost ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{recommendedHost.name}</p>
                  <RemoteHostStatusBadges host={recommendedHost} />
                </div>
                {recommendedHost.agent.lastHeartbeatAt ? (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="h-3 w-3" />
                    Visto {formatRelativeDate(recommendedHost.agent.lastHeartbeatAt)}
                  </p>
                ) : recommendedOperationalMeta ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{recommendedOperationalMeta.description}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartHostSession(recommendedHost)}
                  disabled={isStartingSession || !recommendedHost.agent.rustdeskId?.trim()}
                >
                  {isStartingSession && startingHostId === recommendedHost.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Acessar
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/portal/infraestrutura/hosts/${recommendedHost.id}${resolved.ticketNumber ? `?ticketNumber=${encodeURIComponent(resolved.ticketNumber)}` : ""}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver no portal
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* List states */}
        {isLoadingHosts ? <InlineLoading label="Carregando hosts..." /> : null}
        {hostError ? <InlineWarning message={hostError} /> : null}
        {!isLoadingHosts && !hostError && companyHosts.length === 0 ? (
          <EmptyState label="Nenhum host encontrado para esta empresa." />
        ) : null}

        {/* Remaining hosts */}
        {!isLoadingHosts && !hostError && companyHosts.length > 0 ? (
          <div className="space-y-1.5">
            {companyHosts.filter((host) => host.id !== recommendedHost?.id).map((host) => {
              const operationalMeta = getRemoteOperationalStatusMeta(host.operationalStatus);

              return (
                <div key={host.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{host.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <RemoteHostStatusBadges host={host} />
                      {host.agent.lastHeartbeatAt ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          {formatRelativeDate(host.agent.lastHeartbeatAt)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleStartHostSession(host)}
                    disabled={isStartingSession || !host.agent.rustdeskId?.trim()}
                  >
                    {isStartingSession && startingHostId === host.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Acessar
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link
                      href={`/portal/infraestrutura/hosts/${host.id}${resolved.ticketNumber ? `?ticketNumber=${encodeURIComponent(resolved.ticketNumber)}` : ""}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver
                    </Link>
                  </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <Button
          asChild
          variant="secondary"
          className="mt-1 w-full gap-2"
          disabled={!canOpenInfrastructureHosts}
        >
          <Link href={resolved.infrastructureHostsHref} target="_blank" rel="noreferrer">
            <Waypoints className="h-4 w-4" />
            Ver toda a infraestrutura
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
