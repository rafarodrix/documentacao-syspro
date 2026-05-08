"use client";

import Link from "next/link";
import { Clock3, Loader2, Monitor, Waypoints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Monitor className="h-4 w-4 text-primary" />
              Infraestrutura da empresa
            </CardTitle>
            <CardDescription>
              Hosts vinculados a esta empresa para acesso rapido e abertura na Infraestrutura do portal.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setHostReloadToken((current) => current + 1)}
          >
            Atualizar hosts
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendedHost ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Host recomendado</p>
                <p className="mt-1 truncate text-sm font-semibold text-foreground">{recommendedHost.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{recommendedHost.agent.rustdeskId || "Sem RustDesk ID"}</span>
                  {recommendedHost.agent.lastHeartbeatAt ? (
                    <span>Heartbeat em {formatRelativeDate(recommendedHost.agent.lastHeartbeatAt)}</span>
                  ) : null}
                  <ContextBadge tone={recommendedHost.agent.rustdeskId?.trim() ? "good" : "warn"}>
                    {recommendedHost.agent.rustdeskId?.trim() ? "Pronto para acesso" : "Sem acesso remoto"}
                  </ContextBadge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleStartHostSession(recommendedHost)}
                  disabled={isStartingSession || !recommendedHost.agent.rustdeskId?.trim()}
                >
                  {isStartingSession && startingHostId === recommendedHost.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {recommendedHost.agent.rustdeskId?.trim() ? "Acessar host" : "Sem acesso remoto"}
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/portal/infraestrutura/hosts/${recommendedHost.id}${resolved.ticketNumber ? `?ticketNumber=${encodeURIComponent(resolved.ticketNumber)}` : ""}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir host
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {isLoadingHosts ? <InlineLoading label="Carregando hosts reais da infraestrutura da empresa..." /> : null}
        {hostError ? <InlineWarning message={hostError} /> : null}
        {!isLoadingHosts && !hostError && companyHosts.length === 0 ? (
          <EmptyState label="Nenhum host recente encontrado para esta empresa." />
        ) : null}
        {!isLoadingHosts && !hostError && companyHosts.length > 0 ? (
          <div className="space-y-2">
            {companyHosts.filter((host) => host.id !== recommendedHost?.id).map((host) => (
              <div key={host.id} className="rounded-lg border border-border/60 bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{host.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {host.companyName || resolved.companyName || "Empresa nao identificada"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="break-all font-mono">{host.agent.rustdeskId || "Sem RustDesk ID"}</span>
                      {host.agent.lastHeartbeatAt ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          {formatRelativeDate(host.agent.lastHeartbeatAt)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartHostSession(host)}
                      disabled={isStartingSession || !host.agent.rustdeskId?.trim()}
                    >
                      {isStartingSession && startingHostId === host.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Acessar
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={`/portal/infraestrutura/hosts/${host.id}${resolved.ticketNumber ? `?ticketNumber=${encodeURIComponent(resolved.ticketNumber)}` : ""}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir no portal
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <Button asChild variant="secondary" className="w-full gap-2" disabled={!canOpenInfrastructureHosts}>
          <Link href={resolved.infrastructureHostsHref} target="_blank" rel="noreferrer">
            <Waypoints className="h-4 w-4" />
            Abrir infraestrutura completa
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
