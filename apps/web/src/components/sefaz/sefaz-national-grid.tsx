"use client";

import { SEFAZ_UFS } from "@dosc-syspro/contracts";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { EmptyState } from "@/components/patterns";
import { cn } from "@/lib/utils";

type SefazStatusItem = {
  uf: string;
  service: "NFE" | "NFCE" | "CTE" | "MDFE";
  status?: string | null;
};

export interface SefazNationalGridProps {
  data: SefazStatusItem[];
  focusUfs?: string[];
  activeRouteKeys?: string[];
}

export function SefazNationalGrid({
  data,
  focusUfs = [],
  activeRouteKeys = [],
}: SefazNationalGridProps) {
  const highlightedUfs = new Set(
    focusUfs.map((item) => item.trim().toUpperCase()).filter(Boolean),
  );
  const activeRouteSet = new Set(activeRouteKeys);
  const hasNationalData = data.length > 0 || activeRouteSet.size > 0;

  const getVirtualUf = (uf: string, service: "NFE" | "NFCE" | "CTE" | "MDFE"): string => {
    if (service === "MDFE") return "SVRS";
    if (service === "CTE") return ["MG", "SP", "PR"].includes(uf) ? uf : "SVRS";
    if (service === "NFE") {
      if (["MG", "SP", "RS", "PR", "AM", "BA", "CE", "GO", "MS", "MT", "PE"].includes(uf)) return uf;
      if (["MA", "PA"].includes(uf)) return "SVAN";
      return "SVRS";
    }
    if (service === "NFCE") {
      if (["MG", "SP", "RS", "PR", "AM", "BA", "CE", "GO", "MS", "MT", "PE", "PI"].includes(uf)) return uf;
      if (["MA", "PA"].includes(uf)) return "SVAN";
      return "SVRS";
    }
    return uf;
  };

  const getStatusByUf = (uf: string, service: "NFE" | "NFCE" | "CTE" | "MDFE") => {
    const targetUf = getVirtualUf(uf, service);
    return data.find((item) => item.uf === targetUf && item.service === service);
  };

  const hasRoute = (uf: string, service: "NFE" | "NFCE" | "CTE" | "MDFE") => {
    const targetUf = getVirtualUf(uf, service);
    return activeRouteSet.has(`${targetUf}:${service}`) || data.some((item) => item.uf === targetUf && item.service === service);
  };

  return (
    <Card className="border-border/60 bg-background/40 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Monitor nacional de disponibilidade</CardTitle>
      </CardHeader>
      <CardContent>
        {hasNationalData ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {SEFAZ_UFS.map((uf) => {
              const showNfe = hasRoute(uf, "NFE");
              const showNfce = hasRoute(uf, "NFCE");
              const showCte = hasRoute(uf, "CTE");
              const showMdfe = hasRoute(uf, "MDFE");
              const nfe = getStatusByUf(uf, "NFE");
              const nfce = getStatusByUf(uf, "NFCE");
              const cte = getStatusByUf(uf, "CTE");
              const mdfe = getStatusByUf(uf, "MDFE");

              return (
                <div
                  key={uf}
                  className={cn(
                    "space-y-2 rounded-xl border border-border/50 bg-muted/5 p-3",
                    highlightedUfs.has(uf) && "border-primary/40 bg-primary/5",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{uf}</span>
                    <Badge variant="outline" className="h-4 px-1 text-[9px]">
                      {highlightedUfs.has(uf) ? "Minha UF" : "SEFAZ"}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    {showNfe ? (
                      <StatusLine
                        label="NFe"
                        status={nfe?.status}
                        active={activeRouteSet.has(`${getVirtualUf(uf, "NFE")}:NFE`)}
                      />
                    ) : null}
                    {showNfce ? (
                      <StatusLine
                        label="NFCe"
                        status={nfce?.status}
                        active={activeRouteSet.has(`${getVirtualUf(uf, "NFCE")}:NFCE`)}
                      />
                    ) : null}
                    {showCte ? (
                      <StatusLine
                        label="CTe"
                        status={cte?.status}
                        active={activeRouteSet.has(`${getVirtualUf(uf, "CTE")}:CTE`)}
                      />
                    ) : null}
                    {showMdfe ? (
                      <StatusLine
                        label="MDFe"
                        status={mdfe?.status}
                        active={activeRouteSet.has(`${getVirtualUf(uf, "MDFE")}:MDFE`)}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Sem monitor nacional"
            description="Nao ha rotas ou leituras disponiveis para montar a grade nacional neste escopo."
            compact
            dashed
            className="min-h-56 border-border/40"
          />
        )}
      </CardContent>
    </Card>
  );
}

function StatusLine({
  label,
  status,
  active,
}: {
  label: string;
  status?: string | null;
  active: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <StatusIcon status={status} active={active} />
    </div>
  );
}

function StatusIcon({ status, active }: { status?: string | null; active: boolean }) {
  if (!active) return <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />;
  if (status === "ONLINE") {
    return <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />;
  }
  if (status === "UNSTABLE") return <div className="h-2 w-2 rounded-full animate-pulse bg-amber-500" />;
  if (!status) return <div className="h-2 w-2 rounded-full border border-slate-400/80 bg-transparent" />;
  return <div className="h-2 w-2 rounded-full bg-destructive" />;
}
