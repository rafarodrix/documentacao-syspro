"use client";

import { SEFAZ_UFS } from "@dosc-syspro/contracts";
import { Badge } from "@dosc-syspro/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";

type SefazStatusItem = {
  uf: string;
  service: "NFE" | "NFCE";
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

  const getStatusByUf = (uf: string, service: "NFE" | "NFCE") => {
    if (!activeRouteSet.has(`${uf}:${service}`)) return undefined;
    return data.find((item) => item.uf === uf && item.service === service);
  };

  return (
    <Card className="border-border/60 bg-background/40 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Monitor nacional de disponibilidade
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {SEFAZ_UFS.map((uf) => {
            const nfe = getStatusByUf(uf, "NFE");
            const nfce = getStatusByUf(uf, "NFCE");

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
                  <StatusLine label="NFe" status={nfe?.status} active={activeRouteSet.has(`${uf}:NFE`)} />
                  <StatusLine label="NFCe" status={nfce?.status} active={activeRouteSet.has(`${uf}:NFCE`)} />
                </div>
              </div>
            );
          })}
        </div>
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
  if (!active) {
    return <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />;
  }

  if (status === "ONLINE") {
    return (
      <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
    );
  }

  if (status === "UNSTABLE") {
    return <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />;
  }

  if (!status) {
    return <div className="h-2 w-2 rounded-full border border-slate-400/80 bg-transparent" />;
  }

  return <div className="h-2 w-2 rounded-full bg-destructive" />;
}
