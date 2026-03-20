"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { type SefazRoutesInput } from "@/core/application/schema/sefaz-routes-schema";
import { runSefazCheckAction, updateSefazRoutesAction } from "@/actions/platform/settings-actions";
import { buildDefaultSefazRoutes } from "@/core/constants/sefaz-endpoints";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, RefreshCw, CheckCircle2, ListChecks } from "lucide-react";

interface SefazRoutesTabProps {
  initialRoutes: SefazRoutesInput;
}

const EMPTY_ROUTE = {
  uf: "",
  service: "NFE" as const,
  url: "",
  active: true,
};

export function SefazRoutesTab({ initialRoutes }: SefazRoutesTabProps) {
  const [routes, setRoutes] = useState<SefazRoutesInput>(initialRoutes);
  const [isSaving, startSaving] = useTransition();
  const [isChecking, startChecking] = useTransition();
  const presetRoutes = useMemo(() => buildDefaultSefazRoutes(), []);
  const allowedUfs = useMemo(() => Array.from(new Set(presetRoutes.map((item) => item.uf))), [presetRoutes]);
  const duplicateKeys = useMemo(() => {
    const counts = new Map<string, number>();
    routes.forEach((route) => {
      const key = `${route.uf.trim().toUpperCase()}-${route.service}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([key]) => key));
  }, [routes]);

  const hasInvalidRows = useMemo(
    () =>
      routes.some(
        (route) =>
          !/^[A-Za-z]{2,6}$/.test(route.uf.trim()) ||
          !/^https:\/\//i.test(route.url.trim()) ||
          duplicateKeys.has(`${route.uf.trim().toUpperCase()}-${route.service}`)
      ) || routes.length === 0,
    [duplicateKeys, routes],
  );

  const updateRow = (index: number, key: keyof SefazRoutesInput[number], value: string | boolean) => {
    setRoutes((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [key]:
                typeof value === "string" && key === "uf"
                  ? value.toUpperCase()
                  : value,
            }
          : row
      )
    );
  };

  const addRow = () => setRoutes((prev) => [...prev, { ...EMPTY_ROUTE }]);
  const removeRow = (index: number) => setRoutes((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  const replaceWithDefaults = () => {
    setRoutes(presetRoutes);
    toast.success("Catalogo padrao carregado.");
  };

  const mergeWithDefaults = () => {
    const mergedMap = new Map<string, SefazRoutesInput[number]>();
    routes.forEach((route) => {
      const key = `${route.uf.trim().toUpperCase()}-${route.service}`;
      mergedMap.set(key, {
        ...route,
        uf: route.uf.trim().toUpperCase(),
        url: route.url.trim(),
      });
    });
    presetRoutes.forEach((route) => {
      const key = `${route.uf}-${route.service}`;
      if (!mergedMap.has(key)) mergedMap.set(key, route);
    });
    setRoutes(Array.from(mergedMap.values()));
    toast.success("Rotas faltantes adicionadas a partir do catalogo.");
  };

  const handleSave = () => {
    startSaving(async () => {
      const normalized = routes.map((route) => ({
        ...route,
        uf: route.uf.trim().toUpperCase(),
        url: route.url.trim(),
      }));

      const result = await updateSefazRoutesAction(normalized);
      if (!result.success) {
        toast.error(result.error ?? "Erro ao salvar rotas.");
        return;
      }
      toast.success(result.message ?? "Rotas salvas.");
    });
  };

  const handleCheckNow = () => {
    startChecking(async () => {
      const result = await runSefazCheckAction();
      if (!result.success) {
        toast.error(result.error ?? "Erro ao executar verificacao.");
        return;
      }
      toast.success(result.message ?? "Verificacao concluida.");
    });
  };

  return (
    <Card className="border-border/50 shadow-sm bg-background/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Rotas de Verificacao SEFAZ</CardTitle>
        <CardDescription>
          Configure endpoints por UF e servico. Estas rotas sao usadas no monitoramento real do dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="gap-2" onClick={addRow}>
              <Plus className="h-4 w-4" />
              Adicionar rota
            </Button>
            <Button type="button" variant="outline" className="gap-2" onClick={mergeWithDefaults}>
              <ListChecks className="h-4 w-4" />
              Mesclar catalogo
            </Button>
            <Button type="button" variant="outline" className="gap-2" onClick={replaceWithDefaults}>
              <RefreshCw className="h-4 w-4" />
              Carregar padrao
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="gap-2" onClick={handleCheckNow} disabled={isChecking}>
              {isChecking ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Verificar agora
            </Button>
            <Button type="button" className="gap-2" onClick={handleSave} disabled={isSaving || hasInvalidRows || routes.length === 0}>
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar rotas
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 overflow-hidden">
          <div className="grid grid-cols-[90px_130px_1fr_90px_70px] gap-2 bg-muted/30 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>UF</span>
            <span>Servico</span>
            <span>URL</span>
            <span>Ativo</span>
            <span>Acoes</span>
          </div>

          <div className="divide-y divide-border/50">
            {routes.map((route, index) => {
              const ufInvalid = !/^[A-Za-z]{2,6}$/.test(route.uf.trim());
              const urlInvalid = !/^https:\/\//i.test(route.url.trim());
              return (
                <div key={`${route.uf}-${route.service}-${index}`} className="grid grid-cols-[90px_130px_1fr_90px_70px] gap-2 px-3 py-3 items-center">
                  <div className="space-y-1">
                    <Input
                      value={route.uf}
                      maxLength={6}
                      onChange={(event) => updateRow(index, "uf", event.target.value)}
                      className="h-9 uppercase"
                      list="sefaz-ufs"
                    />
                    {ufInvalid && <p className="text-[10px] text-red-500">UF/Autorizador invalido</p>}
                  </div>

                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={route.service}
                    onChange={(event) => updateRow(index, "service", event.target.value)}
                  >
                    <option value="NFE">NFE</option>
                    <option value="NFCE">NFCE</option>
                  </select>

                  <div className="space-y-1">
                    <Input
                      value={route.url}
                      onChange={(event) => updateRow(index, "url", event.target.value)}
                      className="h-9"
                      placeholder="https://..."
                    />
                    {urlInvalid && <p className="text-[10px] text-red-500">URL invalida</p>}
                    {duplicateKeys.has(`${route.uf.trim().toUpperCase()}-${route.service}`) && (
                      <p className="text-[10px] text-red-500">Duplicada para este servico</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch checked={route.active} onCheckedChange={(checked) => updateRow(index, "active", checked)} />
                    {route.active ? (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        ON
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        OFF
                      </Badge>
                    )}
                  </div>

                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(index)} disabled={routes.length === 1}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <Label className="font-medium">Dica operacional:</Label> configure apenas rotas oficiais e mantenha ativas somente as UFs necessarias para reduzir ruido no monitoramento.
        </div>
        <datalist id="sefaz-ufs">
          {allowedUfs.map((uf) => (
            <option key={uf} value={uf} />
          ))}
        </datalist>
      </CardContent>
    </Card>
  );
}

