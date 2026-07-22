"use client";

import { FormEvent, useState } from "react";
import { Search, Link2, FileText, ShieldCheck } from "lucide-react";
import { Button, Input, Badge } from "@dosc-syspro/ui";
import { normalizeNcm } from "@/lib/utils";
import { formatPercent } from "@/lib/formatters";

type LookupResponse = {
  ok: boolean;
  ncm: string;
  summary: { anexos: number; classTrib: number; cst: number };
  anexos: Array<{ id: string; code: string | null; externalKey: string; title: string | null; category: string | null }>;
  classifications: Array<{
    code: string;
    description: string;
    anexo: string | null;
    cst: { code: string; description: string } | null;
    pRedIBS: string | number | null;
    pRedCBS: string | number | null;
    tipoAliquota: string | null;
    link: string | null;
  }>;
  csts: Array<{ code: string; description: string }>;
};

function normalizeNcmInput(value: string) {
  return normalizeNcm(value);
}

export function TaxNcmLookup() {
  const [ncm, setNcm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResponse | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const value = normalizeNcmInput(ncm);
    if (value.length !== 8) {
      setError("Informe um NCM com 8 digitos.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/tax/ncm-lookup?ncm=${value}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "Falha ao consultar NCM.");
        return;
      }
      setResult(data as LookupResponse);
    } catch {
      setError("Erro de conexao ao consultar NCM.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={onSubmit} className="rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">NCM</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={ncm}
                onChange={(e) => setNcm(normalizeNcmInput(e.target.value))}
                placeholder="Ex.: 22030000"
                className="pl-9 font-mono"
              />
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Consultando..." : "Consultar por NCM"}
          </Button>
        </div>
      </form>

      {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}

      {result ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
            <h3 className="mb-2 text-sm font-semibold text-primary">Resumo executivo</h3>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <div className="rounded-md border border-border bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">cClassTrib principal</p>
                <p className="font-mono font-medium">{result.classifications[0]?.code ?? "-"}</p>
              </div>
              <div className="rounded-md border border-border bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">CST principal</p>
                <p className="font-mono font-medium">{result.classifications[0]?.cst?.code ?? result.csts[0]?.code ?? "-"}</p>
              </div>
              <div className="rounded-md border border-border bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">Anexo relacionado</p>
                <p className="font-mono font-medium">{result.classifications[0]?.anexo ?? result.anexos[0]?.code ?? "-"}</p>
              </div>
              <div className="rounded-md border border-border bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">Base legal</p>
                {result.classifications[0]?.link ? (
                  <a className="inline-flex items-center gap-1 font-medium underline" href={result.classifications[0].link} target="_blank" rel="noreferrer">
                    <Link2 className="h-3 w-3" />
                    Abrir referencia
                  </a>
                ) : (
                  <p className="font-medium">-</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Resultado consolidado para NCM {result.ncm}</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Anexos: {result.summary.anexos}</Badge>
              <Badge variant="outline">ClassTrib: {result.summary.classTrib}</Badge>
              <Badge variant="outline">CST: {result.summary.cst}</Badge>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4" />
              cClassTrib e CST encontrados
            </h4>
            {result.classifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma classificacao associada encontrada para este NCM.</p>
            ) : (
              <div className="space-y-2">
                {result.classifications.map((item) => (
                  <div key={item.code} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="font-mono">{item.code}</Badge>
                      {item.cst ? <Badge variant="secondary">CST {item.cst.code}</Badge> : null}
                      {item.anexo ? <Badge variant="outline">Anexo {item.anexo}</Badge> : null}
                    </div>
                    <p className="mt-2 text-sm">{item.description}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Red. IBS: {formatPercent(Number(item.pRedIBS ?? 0))}</span>
                      <span>Red. CBS: {formatPercent(Number(item.pRedCBS ?? 0))}</span>
                      {item.tipoAliquota ? <span>Aliquota: {item.tipoAliquota}</span> : null}
                      {item.link ? (
                        <a className="inline-flex items-center gap-1 underline" href={item.link} target="_blank" rel="noreferrer">
                          <Link2 className="h-3 w-3" />
                          Base legal
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4" />
              Anexos relacionados
            </h4>
            {result.anexos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem anexos relacionados identificados para este NCM.</p>
            ) : (
              <div className="space-y-2">
                {result.anexos.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {item.code ?? item.externalKey}
                      </Badge>
                      {item.category ? <Badge variant="secondary">{item.category}</Badge> : null}
                    </div>
                    <p className="mt-2 text-sm">{item.title ?? "Sem titulo"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
