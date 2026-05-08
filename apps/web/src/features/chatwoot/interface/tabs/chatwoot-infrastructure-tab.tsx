"use client";

import Link from "next/link";
import { Clock3, Loader2, Monitor, Waypoints } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { useChatwootDashboard } from "../chatwoot-dashboard-context";
import {
  ContextBadge,
  EmptyState,
  InlineLoading,
  InlineWarning,
  formatRelativeDate,
} from "../chatwoot-dashboard-ui";

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

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Monitor className="h-4 w-4 text-primary" />
              Infraestrutura
            </CardTitle>
            <CardDescription>Hosts desta empresa para acesso remoto e abertura no portal.</CardDescription>
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
      <CardContent className="space-y-2">

        {/* Recommended host */}
        {recommendedHost ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{recommendedHost.name}</p>
                  <ContextBadge tone={recommendedHost.agent.rustdeskId?.trim() ? "good" : "warn"}>
                    {recommendedHost.agent.rustdeskId?.trim() ? "Online" : "Sem acesso"}
                  </ContextBadge>
                </div>
                {recommendedHost.agent.lastHeartbeatAt ? (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="h-3 w-3" />
                    Visto {formatRelativeDate(recommendedHost.agent.lastHeartbeatAt)}
                  </p>
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
            {companyHosts.filter((host) => host.id !== recommendedHost?.id).map((host) => (
              <div key={host.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{host.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <ContextBadge tone={host.agent.rustdeskId?.trim() ? "good" : "warn"}>
                      {host.agent.rustdeskId?.trim() ? "Online" : "Sem acesso"}
                    </ContextBadge>
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
            ))}
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
