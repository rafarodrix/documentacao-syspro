"use client";

import { useMemo, useState } from "react";
import type { DashboardSefazStatus } from "@dosc-syspro/contracts/dashboard";
import { getSefazOperationalProfile } from "@dosc-syspro/contracts";
import { Activity, RadioTower, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SefazStatusWidget } from "@/components/platform/app/dashboard/SefazStatusWidget";
import { SefazNationalGrid } from "./SefazNationalGrid";
import { cn } from "@/lib/utils";

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

function describeStatus(status?: DashboardSefazStatus) {
  if (!status) return "Nao monitorada";
  if (status.status === "ONLINE") return "Operacional";
  if (status.status === "UNSTABLE") return "Instavel";
  return "Indisponivel";
}

export function SefazOperationsPanel({
  focusUfs,
  scopedStatuses,
  nationalStatuses,
}: {
  focusUfs: string[];
  scopedStatuses: DashboardSefazStatus[];
  nationalStatuses: DashboardSefazStatus[];
}) {
  const groupedFocus = useMemo(() => groupSefazByUF(scopedStatuses), [scopedStatuses]);
  const availableFocusUfs = groupedFocus.map((item) => item.uf);
  const orderedFocusUfs = (availableFocusUfs.length ? availableFocusUfs : focusUfs).filter(Boolean);
  const [selectedUf, setSelectedUf] = useState<string>(orderedFocusUfs[0] ?? "MG");

  const selectedGroup =
    groupedFocus.find((item) => item.uf === selectedUf) ?? {
      uf: selectedUf,
      nfe: undefined,
      nfce: undefined,
    };
  const profile = getSefazOperationalProfile(selectedUf);

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/70">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-amber-500" />
                Cobertura SEFAZ das empresas vinculadas
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                A leitura prioriza as UFs das empresas ligadas ao usuario e compara com o panorama nacional.
              </p>
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
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {orderedFocusUfs.map((uf) => (
              <Button
                key={uf}
                type="button"
                variant={selectedUf === uf ? "default" : "outline"}
                size="sm"
                className={cn("h-8 min-w-12 px-3", selectedUf === uf && "shadow-sm")}
                onClick={() => setSelectedUf(uf)}
              >
                {uf}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
            <div className="grid gap-4 md:grid-cols-2">
              <SefazStatusWidget uf={selectedGroup.uf} nfe={selectedGroup.nfe} nfce={selectedGroup.nfce} />

              <Card className="border-border/50 bg-background/40 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Topologia operacional da UF</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <InfoRow
                    icon={RadioTower}
                    label="Autorizador principal"
                    value={profile?.mainAuthorizer ?? "Nao mapeado"}
                  />
                  <InfoRow
                    icon={Activity}
                    label="Consulta cadastro"
                    value={profile?.cadastroAuthorizer ?? "Consulta estadual ou nao aplicavel"}
                  />
                  <InfoRow
                    icon={ShieldAlert}
                    label="Contingencia"
                    value={profile?.contingencyAuthorizer ?? "Sem contingencia mapeada"}
                  />

                  <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground">NFe:</span> {describeStatus(selectedGroup.nfe)}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">NFCe:</span> {describeStatus(selectedGroup.nfce)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/50 bg-background/40 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Como saber se a consulta esta funcionando</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Quando a UF aparece como <span className="font-medium text-foreground">operacional</span>, a ultima consulta da rota ativa respondeu com sucesso.
                </p>
                <p>
                  Se aparecer <span className="font-medium text-foreground">instavel</span> ou{" "}
                  <span className="font-medium text-foreground">indisponivel</span>, o monitor detectou degradacao real na rota vinculada.
                </p>
                <p>
                  UFs sem medicao ativa ficam sem destaque operacional no mosaico nacional. Isso mostra que a rota ainda nao esta sendo monitorada no ambiente atual.
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <SefazNationalGrid data={nationalStatuses} focusUfs={orderedFocusUfs} />
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/10 p-3">
      <div className="mt-0.5 rounded-md bg-primary/10 p-1.5 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="space-y-0.5">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
