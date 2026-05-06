"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DashboardSefazConfiguredRoute,
  DashboardSefazStatus,
} from "@dosc-syspro/contracts/dashboard";
import { getSefazOperationalProfile } from "@dosc-syspro/contracts";
import { Activity, Globe2, Map, RadioTower, RefreshCw, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { SefazStatusWidget } from "../platform/app/dashboard/sefaz-status-widget";
import { SefazNationalGrid } from "./sefaz-national-grid";
import { cn } from "../../lib/utils";

const REFRESH_INTERVAL_MS = 60_000;

type SefazLiveData = {
  focusUfs: string[];
  scopedStatuses: DashboardSefazStatus[];
  nationalStatuses: DashboardSefazStatus[];
  configuredRoutes: DashboardSefazConfiguredRoute[];
};

async function fetchSefazStatus(): Promise<SefazLiveData | null> {
  try {
    const res = await fetch("/api/dashboard/sefaz", { cache: "no-store" });
    if (!res.ok) return null;
    const body = await res.json();
    if (!body.success || !body.data) return null;
    return {
      focusUfs: body.data.focusUfs,
      scopedStatuses: body.data.sefazStatuses,
      nationalStatuses: body.data.sefazNationalStatuses,
      configuredRoutes: body.data.sefazConfiguredRoutes,
    };
  } catch {
    return null;
  }
}

type ScopeKey = string;

function buildRouteKey(uf: string, service: "NFE" | "NFCE") {
  return `${uf}:${service}`;
}

function groupSefazByUF(sefazStatuses: DashboardSefazStatus[]) {
  const ufs = Array.from(new Set(sefazStatuses.map((item) => item.uf))).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );

  return ufs.map((uf) => ({
    uf,
    nfe: sefazStatuses.find((item) => item.uf === uf && item.service === "NFE"),
    nfce: sefazStatuses.find((item) => item.uf === uf && item.service === "NFCE"),
  }));
}

function rankStatus(status?: DashboardSefazStatus["status"]) {
  if (status === "OFFLINE") return 3;
  if (status === "UNSTABLE") return 2;
  if (status === "ONLINE") return 1;
  return 0;
}

function aggregateNationalServiceStatus(
  service: "NFE" | "NFCE",
  nationalStatuses: DashboardSefazStatus[],
  activeRouteSet: Set<string>,
): DashboardSefazStatus | undefined {
  const candidates = nationalStatuses.filter(
    (item) => activeRouteSet.has(buildRouteKey(item.uf, item.service)) && item.service === service,
  );
  if (!candidates.length) return undefined;

  const worst = [...candidates].sort((left, right) => {
    const rankDiff = rankStatus(right.status) - rankStatus(left.status);
    if (rankDiff !== 0) return rankDiff;
    return left.latency - right.latency;
  })[0];

  return {
    ...worst,
    uf: "NACIONAL",
    latency: Math.round(candidates.reduce((sum, item) => sum + item.latency, 0) / candidates.length),
  };
}

function ScopeMeta({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
      <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

export function SefazOperationsPanel({
  focusUfs,
  scopedStatuses,
  nationalStatuses,
  configuredRoutes,
  canViewAvailability = false,
}: {
  focusUfs: string[];
  scopedStatuses: DashboardSefazStatus[];
  nationalStatuses: DashboardSefazStatus[];
  configuredRoutes: DashboardSefazConfiguredRoute[];
  canViewAvailability?: boolean;
}) {
  const [liveData, setLiveData] = useState<SefazLiveData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    const data = await fetchSefazStatus();
    if (data) {
      setLiveData(data);
      setLastUpdated(new Date());
    }
    if (manual) setIsRefreshing(false);
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => refresh(), REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  const effectiveScopedStatuses = liveData?.scopedStatuses ?? scopedStatuses;
  const effectiveNationalStatuses = liveData?.nationalStatuses ?? nationalStatuses;
  const effectiveConfiguredRoutes = liveData?.configuredRoutes ?? configuredRoutes;
  const effectiveFocusUfs = liveData?.focusUfs ?? focusUfs;

  const groupedFocus = useMemo(() => groupSefazByUF(effectiveScopedStatuses), [effectiveScopedStatuses]);
  const availableFocusUfs = groupedFocus.map((item) => item.uf);
  const orderedFocusUfs = (availableFocusUfs.length ? availableFocusUfs : effectiveFocusUfs).filter(Boolean);
  const nationalScopeKey = "__NATIONAL__";
  const [selectedScope, setSelectedScope] = useState<ScopeKey>(orderedFocusUfs[0] ?? nationalScopeKey);

  const activeRouteSet = useMemo(
    () =>
      new Set(
        effectiveConfiguredRoutes
          .filter((route) => route.active)
          .map((route) => buildRouteKey(route.uf, route.service)),
      ),
    [effectiveConfiguredRoutes],
  );

  const selectedGroup =
    groupedFocus.find((item) => item.uf === selectedScope) ?? {
      uf: selectedScope,
      nfe: effectiveNationalStatuses.find((item) => item.uf === selectedScope && item.service === "NFE"),
      nfce: effectiveNationalStatuses.find((item) => item.uf === selectedScope && item.service === "NFCE"),
    };

  const selectedNationalNfe = useMemo(
    () => aggregateNationalServiceStatus("NFE", effectiveNationalStatuses, activeRouteSet),
    [effectiveNationalStatuses, activeRouteSet],
  );
  const selectedNationalNfce = useMemo(
    () => aggregateNationalServiceStatus("NFCE", effectiveNationalStatuses, activeRouteSet),
    [effectiveNationalStatuses, activeRouteSet],
  );

  const selectedUf = selectedScope === nationalScopeKey ? null : selectedScope;
  const selectedProfile = selectedUf ? getSefazOperationalProfile(selectedUf) : null;
  const nfeActive = selectedUf
    ? activeRouteSet.has(buildRouteKey(selectedUf, "NFE"))
    : effectiveConfiguredRoutes.some((route) => route.active && route.service === "NFE");
  const nfceActive = selectedUf
    ? activeRouteSet.has(buildRouteKey(selectedUf, "NFCE"))
    : effectiveConfiguredRoutes.some((route) => route.active && route.service === "NFCE");

  return (
    <Card className="border-border/50 bg-card/70">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-amber-500" />
              Operacao SEFAZ
            </CardTitle>
            {lastUpdated ? (
              <p className="text-[11px] text-muted-foreground">
                Atualizado em {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
              onClick={() => refresh(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
              {isRefreshing ? "Atualizando..." : "Atualizar"}
            </Button>
            <Badge variant="outline" className="gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Online
            </Badge>
            <Badge variant="outline" className="gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Instavel
            </Badge>
            <Badge variant="outline" className="gap-1">
              <span className="h-2 w-2 rounded-full bg-destructive" />
              Offline
            </Badge>
            <Badge variant="outline" className="gap-1">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
              Desativado
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Monitoramento por autorizador */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {orderedFocusUfs.map((uf) => {
              const nfe = effectiveScopedStatuses.find((s) => s.uf === uf && s.service === "NFE");
              const nfce = effectiveScopedStatuses.find((s) => s.uf === uf && s.service === "NFCE");
              const statuses = [nfe, nfce].filter(Boolean) as DashboardSefazStatus[];
              const avgLatency = statuses.length
                ? Math.round(statuses.reduce((sum, s) => sum + s.latency, 0) / statuses.length)
                : null;
              const hasOffline = statuses.some((s) => s.status === "OFFLINE");
              const hasUnstable = statuses.some((s) => s.status === "UNSTABLE");
              const dotColor = hasOffline
                ? "bg-destructive"
                : hasUnstable
                  ? "bg-amber-500"
                  : statuses.length > 0
                    ? "bg-emerald-500"
                    : "bg-muted-foreground/40";
              return (
                <Button
                  key={uf}
                  type="button"
                  variant={selectedScope === uf ? "default" : "outline"}
                  size="sm"
                  className={cn("h-8 gap-1.5 px-3", selectedScope === uf && "shadow-sm")}
                  onClick={() => setSelectedScope(uf)}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
                  {uf}
                  {avgLatency !== null ? (
                    <span className={cn("text-[10px] tabular-nums", selectedScope === uf ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {avgLatency}ms
                    </span>
                  ) : null}
                </Button>
              );
            })}
            <Button
              type="button"
              variant={selectedScope === nationalScopeKey ? "default" : "outline"}
              size="sm"
              className={cn("h-8 px-3", selectedScope === nationalScopeKey && "shadow-sm")}
              onClick={() => setSelectedScope(nationalScopeKey)}
            >
              <Globe2 className="mr-2 h-3.5 w-3.5" />
              Ambiente nacional
            </Button>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
            <SefazStatusWidget
              title={selectedUf ? `SEFAZ ${selectedUf}` : "SEFAZ Ambiente nacional"}
              nfe={selectedUf ? selectedGroup.nfe : selectedNationalNfe}
              nfce={selectedUf ? selectedGroup.nfce : selectedNationalNfce}
              nfeActive={nfeActive}
              nfceActive={nfceActive}
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {selectedUf ? (
                <>
                  <ScopeMeta
                    icon={RadioTower}
                    label="Autorizador principal"
                    value={selectedProfile?.mainAuthorizer ?? "Nao mapeado"}
                  />
                  <ScopeMeta
                    icon={Activity}
                    label="Consulta cadastro"
                    value={selectedProfile?.cadastroAuthorizer ?? "Consulta estadual ou nao aplicavel"}
                  />
                  <ScopeMeta
                    icon={ShieldAlert}
                    label="Contingencia"
                    value={selectedProfile?.contingencyAuthorizer ?? "Sem contingencia mapeada"}
                  />
                </>
              ) : (
                <>
                  <ScopeMeta
                    icon={Globe2}
                    label="Rotas ativas"
                    value={`${effectiveConfiguredRoutes.filter((route) => route.active).length} monitoradas`}
                  />
                  <ScopeMeta
                    icon={Activity}
                    label="Escopo"
                    value="Leitura consolidada das rotas ativas no ambiente"
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Disponibilidade Nacional */}
        {canViewAvailability ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-t border-border/50 pt-4">
              <Map className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">Disponibilidade Nacional</h3>
            </div>
            <SefazNationalGrid
              data={effectiveNationalStatuses}
              focusUfs={orderedFocusUfs}
              activeRouteKeys={Array.from(activeRouteSet)}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
