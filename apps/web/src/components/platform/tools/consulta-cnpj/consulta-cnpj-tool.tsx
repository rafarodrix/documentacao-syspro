"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  FileSearch,
  MapPin,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCNPJ, formatPhone } from "@/lib/formatters";
import { lookupCompanyProfileByCnpjAction } from "@/features/company/application/company-write.actions";
import type { CompanyRegistryLookupResponse } from "@/features/company/application/company-view.types";

type LookupProfile = NonNullable<CompanyRegistryLookupResponse["profile"]>;

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isValidCnpj(value: string) {
  const digits = onlyDigits(value);
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

function formatDate(value?: string) {
  if (!value) return "Nao informado";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

function formatAddress(profile: LookupProfile) {
  const address = profile.address;
  if (!address) return "Nao informado";

  const line = [address.street, address.number, address.complement].filter(Boolean).join(", ");
  const locality = [address.district, address.city, address.state].filter(Boolean).join(" - ");
  const cep = address.cep ? `${address.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2")}` : undefined;

  return [line, locality, cep].filter(Boolean).join(" | ") || "Nao informado";
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right text-sm font-medium text-foreground">{value || "Nao informado"}</span>
    </div>
  );
}

export function ConsultaCnpjTool() {
  const searchParams = useSearchParams();
  const initialCnpj = searchParams.get("cnpj") ?? "";
  const [cnpj, setCnpj] = useState(formatCNPJ(initialCnpj));
  const [isLoading, setIsLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<CompanyRegistryLookupResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const digits = useMemo(() => onlyDigits(cnpj), [cnpj]);
  const cnpjReady = digits.length === 14;
  const cnpjValid = cnpjReady && isValidCnpj(cnpj);
  const profile = lookupResult?.profile;

  const status = useMemo(() => {
    if (!digits.length) return { label: "Informe um CNPJ para consultar", tone: "outline" as const };
    if (!cnpjReady) return { label: "CNPJ incompleto", tone: "secondary" as const };
    if (!cnpjValid) return { label: "CNPJ invalido", tone: "destructive" as const };
    return { label: "Pronto para consulta", tone: "default" as const };
  }, [cnpjReady, cnpjValid, digits.length]);

  async function handleLookup() {
    if (!cnpjReady) {
      toast.error("Informe um CNPJ completo.");
      return;
    }

    if (!cnpjValid) {
      toast.error("Informe um CNPJ valido.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const result = await lookupCompanyProfileByCnpjAction(digits);
    if (!result.success || !result.data) {
      setLookupResult(null);
      setErrorMessage(result.message || "Nao foi possivel consultar o CNPJ.");
      toast.error(result.message || "Nao foi possivel consultar o CNPJ.");
      setIsLoading(false);
      return;
    }

    setLookupResult(result.data);
    toast.success("CNPJ consultado com sucesso.");
    setIsLoading(false);
  }

  useEffect(() => {
    if (onlyDigits(initialCnpj).length === 14 && isValidCnpj(initialCnpj)) {
      void handleLookup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Consulta CNPJ</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Consulte os dados cadastrais de uma empresa por CNPJ.
            </p>
          </div>
        </div>

        <Badge variant={status.tone} className="w-fit">
          {status.label}
        </Badge>
      </div>

      <Card className="border-border/60 bg-card shadow-sm">
        <CardContent className="p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <label htmlFor="tool-cnpj" className="text-sm font-medium text-foreground">
                CNPJ
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="tool-cnpj"
                  value={cnpj}
                  onChange={(event) => setCnpj(formatCNPJ(event.target.value))}
                  placeholder="00.000.000/0000-00"
                  className="h-11 border-border/60 bg-background pl-9"
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button type="button" onClick={handleLookup} disabled={isLoading} className="h-11 gap-2 px-5">
                <FileSearch className={cn("h-4 w-4", isLoading && "animate-pulse")} />
                {isLoading ? "Consultando" : "Consultar CNPJ"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {errorMessage ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{errorMessage}</CardContent>
        </Card>
      ) : null}

      {profile ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryStat label="Razao social" value={profile.legalName || "Nao informado"} />
            <SummaryStat label="Nome fantasia" value={profile.tradeName || "Nao informado"} />
            <SummaryStat label="CNPJ" value={formatCNPJ(profile.cnpj)} />
            <SummaryStat label="Situacao" value={profile.status || profile.taxRegistrationStatus || "Nao informado"} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Dados cadastrais</CardTitle>
                    <CardDescription>Retorno normalizado da API compartilhada de empresas.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <DetailRow label="Natureza juridica" value={profile.legalNature} />
                <Separator />
                <DetailRow label="Porte" value={profile.size} />
                <Separator />
                <DetailRow label="Matriz / filial" value={profile.branchType} />
                <Separator />
                <DetailRow label="Data de abertura" value={formatDate(profile.openingDate)} />
                <Separator />
                <DetailRow
                  label="CNAE principal"
                  value={[profile.primaryCnae, profile.primaryCnaeDescription].filter(Boolean).join(" - ")}
                />
                <Separator />
                <DetailRow label="Endereco" value={formatAddress(profile)} />
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-2 text-sky-600 dark:text-sky-300">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Contato e composicao</CardTitle>
                    <CardDescription>Dados complementares retornados na consulta do CNPJ.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <DetailRow label="Email" value={profile.email} />
                <Separator />
                <DetailRow label="Telefone" value={profile.phone ? formatPhone(profile.phone) : undefined} />
                <Separator />
                <DetailRow label="CNAEs secundarios" value={String(profile.secondaryCnaes?.length ?? 0)} />
                <Separator />
                <DetailRow label="Quadro societario" value={String(profile.partners?.length ?? 0)} />
              </CardContent>
            </Card>
          </div>

          {profile.partners?.length ? (
            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Quadro societario</CardTitle>
                <CardDescription>Socios retornados pela consulta compartilhada.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {profile.partners.map((partner, index) => (
                    <div key={`${partner.name}-${index}`} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                      <p className="text-sm font-semibold text-foreground">{partner.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{partner.qualification || "Qualificacao nao informada"}</p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Entrada: <span className="font-medium text-foreground">{formatDate(partner.entryDate)}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
