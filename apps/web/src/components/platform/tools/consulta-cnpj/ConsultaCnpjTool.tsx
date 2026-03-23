"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, Copy, ExternalLink, Info, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const RECEITA_CNPJ_URL =
  "https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/cnpjreva_solicitacao.asp";
const REDESIM_EMPRESAS_URL = "https://consultacnpj.redesim.gov.br/minhas-empresas";

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function isValidCnpj(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;

  const calcDigit = (base: string, factors: number[]) => {
    const total = base
      .split("")
      .reduce((sum, digit, index) => sum + Number(digit) * factors[index], 0);
    const mod = total % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const base = digits.slice(0, 12);
  const firstDigit = calcDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calcDigit(`${base}${firstDigit}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits === `${base}${firstDigit}${secondDigit}`;
}

export function ConsultaCnpjTool() {
  const searchParams = useSearchParams();
  const initialCnpj = searchParams.get("cnpj") ?? "";
  const [cnpj, setCnpj] = useState(formatCnpj(initialCnpj));
  const digits = useMemo(() => cnpj.replace(/\D/g, ""), [cnpj]);
  const cnpjReady = digits.length === 14;
  const cnpjValid = cnpjReady && isValidCnpj(cnpj);

  const status = useMemo(() => {
    if (!digits.length) return { label: "Informe um CNPJ", tone: "outline" as const };
    if (!cnpjReady) return { label: "CNPJ incompleto", tone: "secondary" as const };
    if (!cnpjValid) return { label: "CNPJ inválido", tone: "destructive" as const };
    return { label: "CNPJ válido para consulta", tone: "default" as const };
  }, [digits.length, cnpjReady, cnpjValid, cnpj]);

  async function handleCopy() {
    if (!cnpjReady) {
      toast.error("Informe um CNPJ completo antes de copiar.");
      return;
    }

    try {
      await navigator.clipboard.writeText(digits);
      toast.success("CNPJ copiado.");
    } catch {
      toast.error("Não foi possível copiar o CNPJ.");
    }
  }

  function openReceita() {
    if (!cnpjValid) {
      toast.error("Informe um CNPJ válido para abrir a consulta oficial.");
      return;
    }
    window.open(RECEITA_CNPJ_URL, "_blank", "noopener,noreferrer");
    toast.info("Consulta oficial aberta em nova aba. Cole o CNPJ no portal da Receita.");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Consulta CNPJ</h1>
        <p className="text-muted-foreground">
          Fluxo oficial sem certificado digital para abrir o comprovante de inscrição e situação cadastral.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Consulta pública da Receita Federal</CardTitle>
                <CardDescription>Sem scraping, sem certificado e sem dependência de API paga.</CardDescription>
              </div>
            </div>
            <Badge variant={status.tone}>{status.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <div className="space-y-2">
              <label className="text-sm font-medium">CNPJ</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={cnpj}
                  onChange={(event) => setCnpj(formatCnpj(event.target.value))}
                  placeholder="00.000.000/0000-00"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={handleCopy} className="w-full gap-2 md:w-auto">
                <Copy className="h-4 w-4" />
                Copiar
              </Button>
            </div>

            <div className="flex items-end">
              <Button type="button" onClick={openReceita} className="w-full gap-2 md:w-auto">
                <ExternalLink className="h-4 w-4" />
                Abrir consulta oficial
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Melhor opção viável hoje
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>Consulta pública oficial da Receita Federal.</li>
                <li>Sem certificado digital.</li>
                <li>Sem custo de integração.</li>
                <li>Baixo risco jurídico e operacional.</li>
              </ul>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4 text-primary" />
                Limitações
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>Não é API oficial gratuita para automação.</li>
                <li>Preenchimento final ocorre no portal externo.</li>
                <li>Para integração sistêmica robusta, o caminho é API paga.</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary" className="gap-2">
              <a href={RECEITA_CNPJ_URL} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Portal da Receita
              </a>
            </Button>
            <Button asChild variant="ghost" className="gap-2">
              <a href={REDESIM_EMPRESAS_URL} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                REDESIM / Minhas Empresas
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
