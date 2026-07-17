"use client";

import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from "@dosc-syspro/ui";
import { Network, Activity, Globe } from "lucide-react";
import { formatDateTime } from "../../host-details.helpers";
import { cn } from "@/lib/utils";

type Props = {
  networkSnapshot: Record<string, unknown> | null;
  networkSnapshotAt: string | null;
};

export function DiagnosticsNetworkView({ networkSnapshot, networkSnapshotAt }: Props) {
  const displayDate = networkSnapshotAt ? formatDateTime(networkSnapshotAt) : "Nunca";

  const dnsServers = useMemo(() => {
    if (!networkSnapshot || !Array.isArray(networkSnapshot.dnsServers)) return [];
    return networkSnapshot.dnsServers as string[];
  }, [networkSnapshot]);

  const adapters = useMemo(() => {
    if (!networkSnapshot) return [];
    
    // Support both new `adapters` and old `interfaces` just in case
    const arr = Array.isArray(networkSnapshot.adapters) 
      ? networkSnapshot.adapters 
      : (Array.isArray(networkSnapshot.interfaces) ? networkSnapshot.interfaces : []);
    
    return arr.map((iface: any, idx: number) => {
      const name = (iface.name || iface.description || "Interface Desconhecida") as string;
      const friendlyName = (iface.friendlyName as string) || "";
      const mac = (iface.macAddress || iface.mac || "") as string;
      
      const addresses: string[] = Array.isArray(iface.addresses) ? iface.addresses : [];
      // Fallback for older agents that split ipv4/ipv6
      const oldIpv4 = Array.isArray(iface.ipv4) ? iface.ipv4 : (iface.ipv4 ? [iface.ipv4] : []);
      const oldIpv6 = Array.isArray(iface.ipv6) ? iface.ipv6 : (iface.ipv6 ? [iface.ipv6] : []);
      const finalAddresses = addresses.length > 0 ? addresses : [...oldIpv4, ...oldIpv6];

      const type = (iface.interfaceType || "Adaptador Físico/Virtual") as string;
      const isUp = iface.up === true || iface.isUp === true || iface.status === "up";
      const mtu = iface.mtu;
      const flags = Array.isArray(iface.flags) ? iface.flags : [];

      return {
        id: name + mac + idx,
        name,
        friendlyName,
        mac,
        addresses: finalAddresses,
        type,
        isUp,
        mtu,
        flags,
      };
    });
  }, [networkSnapshot]);

  if (adapters.length === 0 && dnsServers.length === 0) {
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
            Nenhuma informação de rede reportada no inventário.
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
            <CardTitle className="text-lg">Configuração Global</CardTitle>
            <CardDescription>
              Servidores DNS reportados pelo sistema.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit border-border/60 bg-background/70 text-muted-foreground">
            Última coleta: {displayDate}
          </Badge>
        </CardHeader>
        <CardContent>
          {dnsServers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {dnsServers.map((dns, idx) => (
                <div key={idx} className="flex items-center space-x-2 bg-muted px-3 py-1.5 rounded-md border border-border">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm">{dns}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">DNS não reportado.</span>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Adaptadores de Rede</CardTitle>
            <CardDescription>
              Placas e adaptadores de rede identificados no dispositivo.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {adapters.map((iface) => (
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
                      <h4 className="font-semibold text-foreground">{iface.friendlyName || iface.name}</h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{iface.mac || "Sem MAC"}</span>
                        {iface.mtu ? (
                          <>
                            <span>•</span>
                            <span>MTU {iface.mtu}</span>
                          </>
                        ) : null}
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

                <div className="text-sm space-y-2">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">Endereços IP</p>
                    {iface.addresses.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {iface.addresses.map((ip, idx) => (
                          <span key={idx} className="font-mono text-foreground bg-muted px-2 py-0.5 rounded text-xs border border-border/50">
                            {ip}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs italic">Nenhum endereço atribuído</p>
                    )}
                  </div>
                  
                  {iface.flags.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">Flags do Adaptador</p>
                      <div className="flex flex-wrap gap-1.5">
                        {iface.flags.map((flag: string, idx: number) => (
                          <span key={idx} className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded-sm">
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
