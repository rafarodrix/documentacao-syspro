"use client";

import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from "@dosc-syspro/ui";
import { Network, Activity } from "lucide-react";
import { formatDateTime } from "../../host-details.helpers";
import { cn } from "@/lib/utils";

type Props = {
  networkSnapshot: Record<string, unknown> | null;
  networkSnapshotAt: string | null;
};

export function DiagnosticsNetworkView({ networkSnapshot, networkSnapshotAt }: Props) {
  const displayDate = networkSnapshotAt ? formatDateTime(networkSnapshotAt) : "Nunca";

  const interfaces = useMemo(() => {
    if (!networkSnapshot || !Array.isArray(networkSnapshot.interfaces)) return [];
    
    return networkSnapshot.interfaces.map((iface: any) => {
      const name = (iface.name || iface.description || "Interface Desconhecida") as string;
      const mac = (iface.macAddress || iface.mac || "") as string;
      const ipv4 = Array.isArray(iface.ipv4) ? iface.ipv4.join(", ") : ((iface.ipv4 || "") as string);
      const ipv6 = Array.isArray(iface.ipv6) ? iface.ipv6.join(", ") : ((iface.ipv6 || "") as string);
      const gateway = Array.isArray(iface.defaultGateway) ? iface.defaultGateway.join(", ") : ((iface.defaultGateway || "") as string);
      const dns = Array.isArray(iface.dnsServers) ? iface.dnsServers.join(", ") : ((iface.dnsServers || "") as string);
      const type = (iface.interfaceType || "Desconhecido") as string;
      const isUp = iface.isUp === true || iface.status === "up";

      return {
        id: name + mac,
        name,
        mac,
        ipv4,
        ipv6,
        gateway,
        dns,
        type,
        isUp,
      };
    });
  }, [networkSnapshot]);

  if (interfaces.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="border-border/50">
          <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
            <div>
              <CardTitle className="text-lg">Interfaces de Rede</CardTitle>
            </div>
            <Badge variant="outline" className="w-fit border-border/60 bg-background/70 text-muted-foreground">
              Última coleta: {displayDate}
            </Badge>
          </CardHeader>
          <CardContent className="p-8 text-center text-muted-foreground bg-muted/10">
            Nenhuma interface de rede reportada no inventário.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Interfaces de Rede</CardTitle>
            <CardDescription>
              Placas e adaptadores de rede físicos ou virtuais identificados no dispositivo.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit border-border/60 bg-background/70 text-muted-foreground">
            Última coleta: {displayDate}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {interfaces.map((iface) => (
              <div key={iface.id} className={cn(
                "rounded-xl border p-5 space-y-4",
                iface.isUp ? "border-border/60 bg-background/50 shadow-sm" : "border-border/30 bg-muted/20 opacity-70"
              )}>
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", iface.isUp ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                      <Network className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{iface.name}</h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{iface.mac || "Sem MAC"}</span>
                        <span>•</span>
                        <span>{iface.type}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={iface.isUp ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"}>
                      {iface.isUp && <Activity className="h-3 w-3 mr-1" />}
                      {iface.isUp ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">IPv4</p>
                    <p className="font-mono text-foreground">{iface.ipv4 || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">IPv6</p>
                    <p className="font-mono text-foreground truncate" title={iface.ipv6}>{iface.ipv6 || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">Gateway</p>
                    <p className="font-mono text-foreground">{iface.gateway || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">DNS</p>
                    <p className="font-mono text-foreground truncate" title={iface.dns}>{iface.dns || "N/A"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
