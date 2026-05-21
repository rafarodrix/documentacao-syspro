"use client";

import { useFormContext } from "react-hook-form";
import { COMPANY_SEGMENT_VALUES, type CreateCompanyInput } from "@dosc-syspro/contracts/company";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button, Badge, Card, CardContent } from "@dosc-syspro/ui";
import { ClipboardList, Loader2, Search, Sparkles, Building2 } from "lucide-react";
import { COMPANY_SEGMENT_LABELS } from "@/features/company/domain/company-segments";
import { formatCNPJ } from "@/lib/formatters";
import { cn, onlyDigits } from "@/lib/utils";

interface CompanyIdentificationTabProps {
  canEditCnpj: boolean;
  isImportingCnpj: boolean;
  lastImportedCnpj: string | null;
  justImported: boolean;
  onImportCnpj: (options?: { force?: boolean }) => Promise<void>;
  setLastImportedCnpj: (v: string | null) => void;
}

export function CompanyIdentificationTab({
  canEditCnpj,
  isImportingCnpj,
  lastImportedCnpj,
  justImported,
  onImportCnpj,
  setLastImportedCnpj,
}: CompanyIdentificationTabProps) {
  const form = useFormContext<CreateCompanyInput>();

  const toInputValue = (value: unknown) => (typeof value === "string" ? value : "");
  const toSelectValue = (value: unknown) => (typeof value === "string" ? value : "__none__");

  return (
    <div className="space-y-6">
      {/* Banner CNPJ highlight */}
      <Card className={cn(
        "border transition-all duration-500",
        justImported
          ? "border-primary/40 bg-primary/5 shadow-[0_0_24px_0_hsl(var(--primary)/0.12)]"
          : "border-border/60 bg-card shadow-sm",
      )}>
      <CardContent className="space-y-4 p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Identificacao fiscal</p>
            <p className="text-xs text-muted-foreground">Informe o CNPJ para preenchimento automatico via Receita Federal</p>
          </div>
          {justImported && (
            <Badge className="ml-auto gap-1 border-primary/30 bg-primary/10 text-primary text-[10px]" variant="outline">
              <Sparkles className="h-3 w-3" />
              Preenchido automaticamente
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
          <FormField
            control={form.control}
            name="cnpj"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CNPJ</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      placeholder="00.000.000/0000-00"
                      {...field}
                      disabled={!canEditCnpj}
                      value={toInputValue(field.value)}
                      className={cn(justImported && "ring-1 ring-primary/30")}
                      onChange={(e) => {
                        const formatted = formatCNPJ(e.target.value);
                        const digits = onlyDigits(formatted);
                        if (digits !== lastImportedCnpj) setLastImportedCnpj(null);
                        field.onChange(formatted);
                      }}
                      onBlur={() => {
                        const digits = onlyDigits(field.value);
                        if (digits.length === 14 && digits !== lastImportedCnpj && !isImportingCnpj) {
                          void onImportCnpj();
                        }
                      }}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => void onImportCnpj({ force: true })}
                    disabled={isImportingCnpj}
                    title="Consultar CNPJ na Receita Federal"
                  >
                    {isImportingCnpj ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Ao informar um CNPJ valido, os dados sao preenchidos automaticamente.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="segment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Segmento</FormLabel>
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
                    {COMPANY_SEGMENT_VALUES.map((segment) => (
                      <SelectItem key={segment} value={segment}>
                        {COMPANY_SEGMENT_LABELS[segment]}
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

      {/* Dados cadastrais */}
      <Card className="border-border/60 bg-card shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-md bg-primary/10">
            <ClipboardList className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Dados cadastrais</p>
            <p className="text-xs text-muted-foreground">Razao social, nome fantasia e informacoes de registro.</p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="razaoSocial"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Razao Social</FormLabel>
              <FormControl>
                <Input
                  placeholder="Razao social oficial"
                  {...field}
                  value={toInputValue(field.value)}
                  className={cn(justImported && "ring-1 ring-primary/20 transition-all")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nomeFantasia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Fantasia</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Nome fantasia"
                    {...field}
                    value={toInputValue(field.value)}
                    className={cn(justImported && "ring-1 ring-primary/20 transition-all")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="logoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL da Logo</FormLabel>
                <FormControl>
                  <Input placeholder="https://..." {...field} value={toInputValue(field.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="dataFundacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Fundacao</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={field.value instanceof Date ? field.value.toISOString().slice(0, 10) : ""}
                    onChange={(e) => field.onChange(e.target.value || undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="naturezaJuridica"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Natureza Juridica</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Associacao Privada"
                    {...field}
                    value={toInputValue(field.value)}
                    className={cn(justImported && "ring-1 ring-primary/20 transition-all")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="porte"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Porte</FormLabel>
                <FormControl>
                  <Input
                    placeholder="ME, EPP, DEMAIS..."
                    {...field}
                    value={toInputValue(field.value)}
                    className={cn(justImported && "ring-1 ring-primary/20 transition-all")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="matrizFilial"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Matriz ou Filial</FormLabel>
                <FormControl>
                  <Input
                    placeholder="MATRIZ"
                    {...field}
                    value={toInputValue(field.value)}
                    className={cn(justImported && "ring-1 ring-primary/20 transition-all")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="situacaoCadastral"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Situacao Cadastral</FormLabel>
                <FormControl>
                  <Input
                    placeholder="ATIVA"
                    {...field}
                    value={toInputValue(field.value)}
                    className={cn(justImported && "ring-1 ring-primary/20 transition-all")}
                  />
                </FormControl>
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
