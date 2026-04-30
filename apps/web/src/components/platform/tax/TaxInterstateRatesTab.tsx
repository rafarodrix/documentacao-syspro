"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  buildDefaultInterstateIcmsSettings,
  type InterstateIcmsSettings,
} from "@dosc-syspro/contracts/settings";
import { SEFAZ_UFS } from "@dosc-syspro/contracts";
import { updateInterstateIcmsSettingsAction } from "@/features/settings/application/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Landmark, RefreshCw, RotateCcw, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaxInterstateRatesTabProps {
  initialRows: InterstateIcmsSettings;
}

export function TaxInterstateRatesTab({ initialRows }: TaxInterstateRatesTabProps) {
  const [rows, setRows] = useState<InterstateIcmsSettings>(initialRows);
  const [isSaving, startSaving] = useTransition();
  const defaults = useMemo(() => buildDefaultInterstateIcmsSettings(), []);

  const handleCellChange = (origin: string, destination: string, value: string) => {
    const parsed = Number(value.replace(",", "."));
    setRows((prev) =>
      prev.map((row) =>
        row.origin === origin
          ? {
              ...row,
              rates: {
                ...row.rates,
                [destination]: Number.isFinite(parsed) ? parsed : 0,
              },
            }
          : row,
      ),
    );
  };

  const restoreDefaults = () => {
    setRows(defaults);
    toast.success("Tabela interestadual padrao carregada.");
  };

  const handleSave = () => {
    startSaving(async () => {
      const result = await updateInterstateIcmsSettingsAction(rows);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? "Tabela interestadual salva.");
    });
  };

  return (
    <Card className="border-border/50 bg-background/60 shadow-sm backdrop-blur-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-primary" />
              ICMS interestadual
            </CardTitle>
            <CardDescription>
              Ajuste a matriz de aliquotas por origem e destino. A diagonal representa a aliquota interna da UF.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={restoreDefaults}>
              <RotateCcw className="h-4 w-4" />
              Restaurar padrao
            </Button>
            <Button type="button" size="sm" className="gap-2" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar tabela
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">Base inicial 2026</Badge>
          <Badge variant="outline">Diagonal = aliquota interna</Badge>
          <Badge variant="outline">Fora da diagonal = operacao interestadual</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="min-w-[1280px] border-collapse text-xs">
            <thead>
              <tr className="bg-muted/40">
                <th className="sticky left-0 z-20 min-w-[90px] border-b border-r border-border/50 bg-muted/70 px-3 py-2 text-left font-semibold text-foreground">
                  Origem
                </th>
                {SEFAZ_UFS.map((uf) => (
                  <th
                    key={uf}
                    className="min-w-[72px] border-b border-border/50 px-2 py-2 text-center font-semibold text-foreground"
                  >
                    {uf}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.origin} className="border-b border-border/30">
                  <th className="sticky left-0 z-10 border-r border-border/50 bg-background px-3 py-2 text-left font-semibold text-foreground">
                    {row.origin}
                  </th>
                  {SEFAZ_UFS.map((destination) => {
                    const isDiagonal = row.origin === destination;
                    return (
                      <td
                        key={`${row.origin}-${destination}`}
                        className={cn(
                          "px-1.5 py-1.5 text-center",
                          isDiagonal && "bg-primary/5",
                        )}
                      >
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          min="0"
                          max="40"
                          value={row.rates[destination]}
                          onChange={(event) => handleCellChange(row.origin, destination, event.target.value)}
                          className={cn(
                            "h-8 min-w-[60px] text-center text-xs tabular-nums",
                            isDiagonal && "border-primary/30",
                          )}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
