"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEFAZ_ENDPOINTS } from "@/core/constants/sefaz-endpoints";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

export function SefazNationalGrid({ data }: { data: any[] }) {
  const getStatusByUf = (uf: string, service: 'NFE' | 'NFCE') => {
    return data?.find(d => d.uf === uf && d.service === service);
  };

  // Pegamos a lista única de UFs das suas constantes
  const ufs = Array.from(new Set(SEFAZ_ENDPOINTS.map(e => e.uf)));

  return (
    <Card className="col-span-4 border-border/60 bg-background/40 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          Monitor Nacional de Disponibilidade
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {ufs.map((uf) => {
            const nfe = getStatusByUf(uf, 'NFE');
            const nfce = getStatusByUf(uf, 'NFCE');

            return (
              <div key={uf} className="p-3 rounded-xl border border-border/50 bg-muted/5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm">{uf}</span>
                  <Badge variant="outline" className="text-[9px] px-1 h-4">Sefaz</Badge>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">NF-e</span>
                    <StatusIcon status={nfe?.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">NFC-e</span>
                    <StatusIcon status={nfce?.status} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusIcon({ status }: { status?: string }) {
  if (status === 'ONLINE') return <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />;
  if (status === 'UNSTABLE') return <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />;
  return <div className="h-2 w-2 rounded-full bg-destructive" />;
}