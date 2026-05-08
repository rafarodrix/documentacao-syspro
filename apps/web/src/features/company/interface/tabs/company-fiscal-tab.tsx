"use client";

import { useFormContext } from "react-hook-form";
import {
  INDICADOR_IE_VALUES,
  TAX_REGIME_VALUES,
  type CreateCompanyInput,
} from "@dosc-syspro/contracts/company";
import type { CompanyOption } from "@/features/company/application/company-view.types";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Card, CardContent } from "@dosc-syspro/ui";
import { Building2, FileText, Users2, ListTree } from "lucide-react";

interface CompanyFiscalTabProps {
  companies: CompanyOption[];
}

const READONLY_BLOCK_CLASS =
  "space-y-3 rounded-xl border border-border/50 bg-muted/5 p-4";

export function CompanyFiscalTab({ companies }: CompanyFiscalTabProps) {
  const form = useFormContext<CreateCompanyInput>();
  const toInputValue = (value: unknown) => (typeof value === "string" ? value : "");
  const toSelectValue = (value: unknown) => (typeof value === "string" ? value : "__none__");

  const secondaryCnaes = form.watch("cnaesSecundarios") ?? [];
  const companyPartners = form.watch("qsa") ?? [];

  return (
    <div className="space-y-6">
      {/* Regime e inscricoes */}
      <Card className="border-border/60 bg-card shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-md bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Regime tributario e inscricoes</p>
            <p className="text-xs text-muted-foreground">Dados fiscais obrigatorios para emissao de notas e integracao com o SYSPRO.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="regimeTributario"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Regime Tributario</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}
                  value={toSelectValue(field.value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">Nao definido</SelectItem>
                    {TAX_REGIME_VALUES.map((regime) => (
                      <SelectItem key={regime} value={regime}>
                        {regime.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="indicadorIE"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Indicador IE</FormLabel>
                <Select onValueChange={field.onChange} value={toInputValue(field.value)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={INDICADOR_IE_VALUES[0]}>Contribuinte</SelectItem>
                    <SelectItem value={INDICADOR_IE_VALUES[1]}>Isento</SelectItem>
                    <SelectItem value={INDICADOR_IE_VALUES[2]}>Nao contribuinte</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="inscricaoEstadual"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inscricao Estadual</FormLabel>
                <FormControl>
                  <Input {...field} value={toInputValue(field.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="inscricaoMunicipal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inscricao Municipal</FormLabel>
                <FormControl>
                  <Input {...field} value={toInputValue(field.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cnae"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CNAE Principal</FormLabel>
                <FormControl>
                  <Input placeholder="0000-0/00" {...field} value={toInputValue(field.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cnaeDescricao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descricao CNAE Principal</FormLabel>
                <FormControl>
                  <Input placeholder="Descricao da atividade" {...field} value={toInputValue(field.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="codSuframa"
          render={({ field }) => (
            <FormItem className="max-w-xs">
              <FormLabel>Codigo SUFRAMA</FormLabel>
              <FormControl>
                <Input {...field} value={toInputValue(field.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        </CardContent>
      </Card>

      {/* CNAEs Secundarios (readonly — preenchido via CNPJ) */}
      <div className={READONLY_BLOCK_CLASS}>
        <div className="flex items-center gap-2 mb-2">
          <ListTree className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">CNAEs secundarios</p>
            <p className="text-xs text-muted-foreground">Importados automaticamente via consulta de CNPJ.</p>
          </div>
        </div>
        {secondaryCnaes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {secondaryCnaes.map((item, i) => (
              <div
                key={`${item.code}-${i}`}
                className="rounded-lg border border-border/50 bg-background/80 px-3 py-2 text-xs"
              >
                <span className="font-semibold text-foreground">{item.code}</span>
                <span className="ml-2 text-muted-foreground">{item.description}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Nenhum CNAE secundario importado ainda.</p>
        )}
      </div>

      {/* QSA */}
      <div className={READONLY_BLOCK_CLASS}>
        <div className="flex items-center gap-2 mb-2">
          <Users2 className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">QSA — Quadro societario</p>
            <p className="text-xs text-muted-foreground">Responsaveis retornados pela base publica de CNPJ.</p>
          </div>
        </div>
        {companyPartners.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {companyPartners.map((partner, i) => (
              <div
                key={`${partner.name}-${i}`}
                className="rounded-lg border border-border/50 bg-background/80 px-3 py-2 text-xs"
              >
                <p className="font-semibold text-foreground">{partner.name}</p>
                <p className="text-muted-foreground">
                  {[partner.qualification, partner.entryDate].filter(Boolean).join(" • ") ||
                    "Sem detalhes adicionais"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Nenhum responsavel importado ainda.</p>
        )}
      </div>

      {/* Estrutura empresarial */}
      <Card className="border-border/60 bg-card shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Estrutura empresarial</p>
            <p className="text-xs text-muted-foreground">
              Hierarquia da empresa no grupo e escritorio contabil vinculado.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="parentCompanyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa Matriz</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}
                  value={toSelectValue(field.value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">Nao definida</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.nomeFantasia || company.razaoSocial}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="accountingFirmId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Escritorio Contabil</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}
                  value={toSelectValue(field.value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">Nao definido</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.nomeFantasia || company.razaoSocial}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        </CardContent>
      </Card>
    </div>
  );
}
