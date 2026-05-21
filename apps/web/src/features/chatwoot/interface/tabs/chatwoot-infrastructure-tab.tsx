"use client";

import Link from "next/link";
import { Clock3, Loader2, Monitor, Waypoints } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { useChatwootDashboard } from "../chatwoot-dashboard-context";
import {
  EmptyState,
  InlineLoading,
  InlineWarning,
  RemoteHostStatusBadges,
  formatRelativeDate,
} from "../chatwoot-dashboard-ui";
import { getRemoteOperationalStatusMeta } from "@/features/remote/domain";

export function ChatwootInfrastructureTab() {
  const {
    resolved,
    linkedCompanies,
    contextCompanyId,
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

  const hasMultipleLinkedCompanies = linkedCompanies.length > 1;
  const needsContextSelection = hasMultipleLinkedCompanies && !contextCompanyId;
  const canUseInfrastructure = canOpenInfrastructureHosts && !needsContextSelection;
  const recommendedOperationalMeta = recommendedHost
    ? getRemoteOperationalStatusMeta(recommendedHost.operationalStatus)
    : null;

  return (
    <Card className="border-border/30 bg-background/50 backdrop-blur shadow-sm transition-all duration-300 hover:border-primary/10">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Monitor className="h-4 w-4 text-primary" />
              Infraestrutura
            </CardTitle>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs border-border/30 bg-background/40 hover:bg-background/60"
            onClick={() => setHostReloadToken((current) => current + 1)}
          >
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recommended host */}
        {canUseInfrastructure && recommendedHost ? (
          <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-background/40 hover:bg-background/60 hover:border-primary/30 backdrop-blur transition-all duration-300 shadow-md p-3">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/40 via-purple-500/40 to-primary/40" />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{recommendedHost.name}</p>
                  <RemoteHostStatusBadges host={recommendedHost} />
                </div>
                {recommendedHost.agent.lastHeartbeatAt ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="h-3 w-3" />
                    Visto {formatRelativeDate(recommendedHost.agent.lastHeartbeatAt)}
                  </p>
                ) : recommendedOperationalMeta ? (
                  <p className="mt-1 text-xs text-muted-foreground">{recommendedOperationalMeta.description}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 gap-1.5 px-3 text-xs shadow-sm shadow-primary/20"
                  onClick={() => handleStartHostSession(recommendedHost)}
                  disabled={isStartingSession || !recommendedHost.agent.rustdeskId?.trim()}
                >
                  {isStartingSession && startingHostId === recommendedHost.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Acessar
                </Button>
                <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs border-border/30 bg-background/40 hover:bg-background/60">
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
        {!isLoadingHosts && !hostError && !canUseInfrastructure ? (
          <EmptyState
            label={
              needsContextSelection
                ? "Escolha a empresa em contexto no topo do painel para listar os hosts corretos."
                : "Selecione uma empresa em contexto para carregar os hosts desta conversa."
            }
          />
        ) : null}
        {!isLoadingHosts && !hostError && canUseInfrastructure && companyHosts.length === 0 ? (
          <EmptyState label="Nenhum host encontrado para esta empresa." />
        ) : null}

        {/* Remaining hosts */}
        {!isLoadingHosts && !hostError && canUseInfrastructure && companyHosts.length > 0 ? (
          <div className="space-y-1.5">
            {companyHosts.filter((host) => host.id !== recommendedHost?.id).map((host) => {
              const operationalMeta = getRemoteOperationalStatusMeta(host.operationalStatus);

              return (
                <div key={host.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-background/40 px-3 py-2 backdrop-blur transition-all duration-300 shadow-sm hover:border-primary/20">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{host.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <RemoteHostStatusBadges host={host} />
                      {host.agent.lastHeartbeatAt ? (
                        <span className="inline-flex items-center gap-1 text-[10px]">
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
                      className="h-8 px-3 text-xs border-border/30 bg-background/40 hover:bg-background/60"
                      onClick={() => handleStartHostSession(host)}
                      disabled={isStartingSession || !host.agent.rustdeskId?.trim()}
                    >
                      {isStartingSession && startingHostId === host.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      Acessar
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="h-8 px-2.5 text-xs hover:bg-background/40">
                      <Link
                        href={`/portal/infraestrutura/hosts/${host.id}${resolved.ticketNumber ? `?ticketNumber=${encodeURIComponent(resolved.ticketNumber)}` : ""}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Portal
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
          className="mt-1 h-9 w-full gap-2 text-xs border border-border/30 bg-background/40 hover:bg-background/60 shadow-sm transition-all duration-300"
          disabled={!canUseInfrastructure}
        >
          <Link href={resolved.infrastructureHostsHref} target="_blank" rel="noreferrer">
            <Waypoints className="h-4 w-4 text-primary" />
            Ver toda a infraestrutura
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
