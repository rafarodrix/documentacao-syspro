"use client";

import { useMemo, useState } from "react";
import type {
  DashboardSefazConfiguredRoute,
  DashboardSefazStatus,
} from "@dosc-syspro/contracts/dashboard";
import { getSefazOperationalProfile } from "@dosc-syspro/contracts";
import { Activity, Globe2, RadioTower, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { SefazStatusWidget } from "../platform/app/dashboard/SefazStatusWidget";
import { SefazNationalGrid } from "./SefazNationalGrid";
import { cn } from "../../lib/utils";

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
  const candidates = nationalStatuses.filter((item) => activeRouteSet.has(buildRouteKey(item.uf, item.service)) && item.service === service);
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
}: {
  focusUfs: string[];
  scopedStatuses: DashboardSefazStatus[];
  nationalStatuses: DashboardSefazStatus[];
  configuredRoutes: DashboardSefazConfiguredRoute[];
}) {
  const groupedFocus = useMemo(() => groupSefazByUF(scopedStatuses), [scopedStatuses]);
  const availableFocusUfs = groupedFocus.map((item) => item.uf);
  const orderedFocusUfs = (availableFocusUfs.length ? availableFocusUfs : focusUfs).filter(Boolean);
  const nationalScopeKey = "__NATIONAL__";
  const [selectedScope, setSelectedScope] = useState<ScopeKey>(orderedFocusUfs[0] ?? nationalScopeKey);

  const activeRouteSet = useMemo(
    () =>
      new Set(
        configuredRoutes
          .filter((route) => route.active)
          .map((route) => buildRouteKey(route.uf, route.service)),
      ),
    [configuredRoutes],
  );

  const selectedGroup =
    groupedFocus.find((item) => item.uf === selectedScope) ?? {
      uf: selectedScope,
      nfe: nationalStatuses.find((item) => item.uf === selectedScope && item.service === "NFE"),
      nfce: nationalStatuses.find((item) => item.uf === selectedScope && item.service === "NFCE"),
    };

  const selectedNationalNfe = useMemo(
    () => aggregateNationalServiceStatus("NFE", nationalStatuses, activeRouteSet),
    [nationalStatuses, activeRouteSet],
  );
  const selectedNationalNfce = useMemo(
    () => aggregateNationalServiceStatus("NFCE", nationalStatuses, activeRouteSet),
    [nationalStatuses, activeRouteSet],
  );

  const selectedUf = selectedScope === nationalScopeKey ? null : selectedScope;
  const selectedProfile = selectedUf ? getSefazOperationalProfile(selectedUf) : null;
  const nfeActive = selectedUf ? activeRouteSet.has(buildRouteKey(selectedUf, "NFE")) : configuredRoutes.some((route) => route.active && route.service === "NFE");
  const nfceActive = selectedUf ? activeRouteSet.has(buildRouteKey(selectedUf, "NFCE")) : configuredRoutes.some((route) => route.active && route.service === "NFCE");

  return (
    <Card className="border-border/50 bg-card/70">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-amber-500" />
              Operacao SEFAZ
            </CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
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
      <CardContent>
        <Tabs defaultValue="operacional" className="space-y-4">
          <TabsList className="h-auto flex-wrap bg-muted/40 p-1">
            <TabsTrigger value="operacional">Operacional</TabsTrigger>
            <TabsTrigger value="disponibilidade">Disponibilidade</TabsTrigger>
          </TabsList>

          <TabsContent value="operacional" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {orderedFocusUfs.map((uf) => (
                <Button
                  key={uf}
                  type="button"
                  variant={selectedScope === uf ? "default" : "outline"}
                  size="sm"
                  className={cn("h-8 min-w-12 px-3", selectedScope === uf && "shadow-sm")}
                  onClick={() => setSelectedScope(uf)}
                >
                  {uf}
                </Button>
              ))}
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
                      value={`${configuredRoutes.filter((route) => route.active).length} monitoradas`}
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
          </TabsContent>

          <TabsContent value="disponibilidade" className="space-y-4">
            <SefazNationalGrid
              data={nationalStatuses}
              focusUfs={orderedFocusUfs}
              activeRouteKeys={Array.from(activeRouteSet)}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
