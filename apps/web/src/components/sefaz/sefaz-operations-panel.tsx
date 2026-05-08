"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DashboardSefazConfiguredRoute,
  DashboardSefazStatus,
} from "@dosc-syspro/contracts/dashboard";
import { Activity, Map, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@dosc-syspro/ui";
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
  const orderedFocusUfs = (groupedFocus.length ? groupedFocus.map((g) => g.uf) : effectiveFocusUfs).filter(Boolean);

  const activeRouteSet = useMemo(
    () =>
      new Set(
        effectiveConfiguredRoutes
          .filter((route) => route.active)
          .map((route) => buildRouteKey(route.uf, route.service)),
      ),
    [effectiveConfiguredRoutes],
  );

  const nationalNfe = useMemo(
    () => aggregateNationalServiceStatus("NFE", effectiveNationalStatuses, activeRouteSet),
    [effectiveNationalStatuses, activeRouteSet],
  );
  const nationalNfce = useMemo(
    () => aggregateNationalServiceStatus("NFCE", effectiveNationalStatuses, activeRouteSet),
    [effectiveNationalStatuses, activeRouteSet],
  );

  const nationalNfeActive = effectiveConfiguredRoutes.some((r) => r.active && r.service === "NFE");
  const nationalNfceActive = effectiveConfiguredRoutes.some((r) => r.active && r.service === "NFCE");

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
        {/* Status por estado + Nacional lado a lado */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
          {groupedFocus.map((group) => (
            <SefazStatusWidget
              key={group.uf}
              title={`SEFAZ ${group.uf}`}
              nfe={group.nfe}
              nfce={group.nfce}
              nfeActive={activeRouteSet.has(buildRouteKey(group.uf, "NFE"))}
              nfceActive={activeRouteSet.has(buildRouteKey(group.uf, "NFCE"))}
            />
          ))}
          <SefazStatusWidget
            title="SEFAZ Nacional"
            nfe={nationalNfe}
            nfce={nationalNfce}
            nfeActive={nationalNfeActive}
            nfceActive={nationalNfceActive}
          />
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
