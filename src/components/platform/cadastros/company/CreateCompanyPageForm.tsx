"use client";

import { useState } from "react";
import type { ElementType } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { CompanySegment, CompanyStatus, IndicadorIE, TaxRegime } from "@prisma/client";
import { createCompanySchema, type CreateCompanyInput } from "@/core/application/schema/company-schema";
import { createCompanyAction } from "@/actions/admin/company-actions";
import { COMPANY_SEGMENT_LABELS } from "@/core/config/company-segments";
import { useAddressLookup } from "@/hooks/use-address-lookup";
import { formatCNPJ, formatPhone } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MagicCard } from "@/components/magicui/magic-card";
import { ShineBorder } from "@/components/magicui/shine-border";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  ChevronRight,
  FileText,
  Landmark,
  Loader2,
  MapPin,
  Phone as PhoneIcon,
  Sparkles,
  Save,
  Search,
} from "lucide-react";

interface CompanyOption {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
}

interface CreateCompanyPageFormProps {
  backHref: string;
  companies: CompanyOption[];
}

type SectionId = "geral" | "fiscal" | "estrutura" | "endereco" | "contato";

const SECTIONS: Array<{ id: SectionId; title: string; description: string; icon: ElementType; fields: string[] }> = [
  {
    id: "geral",
    title: "Identificacao",
    description: "Dados cadastrais",
    icon: Building2,
    fields: ["cnpj", "segment", "status", "razaoSocial", "nomeFantasia", "logoUrl", "dataFundacao"],
  },
  {
    id: "fiscal",
    title: "Fiscal",
    description: "Regime e inscricoes",
    icon: FileText,
    fields: ["regimeTributario", "crt", "indicadorIE", "inscricaoEstadual", "inscricaoMunicipal", "cnae", "codSuframa"],
  },
  {
    id: "estrutura",
    title: "Estrutura",
    description: "Hierarquia empresarial",
    icon: Landmark,
    fields: ["parentCompanyId", "accountingFirmId"],
  },
  {
    id: "endereco",
    title: "Endereco",
    description: "Localizacao e IBGE",
    icon: MapPin,
    fields: [
      "address.cep",
      "address.pais",
      "address.description",
      "address.logradouro",
      "address.numero",
      "address.complemento",
      "address.bairro",
      "address.cidade",
      "address.estado",
      "address.codigoIbgeCidade",
      "address.codigoIbgeEstado",
    ],
  },
  {
    id: "contato",
    title: "Contato",
    description: "Canais de comunicacao",
    icon: PhoneIcon,
    fields: ["emailContato", "emailFinanceiro", "telefone", "whatsapp", "website", "observacoes"],
  },
];

function hasPath(obj: unknown, path: string): boolean {
  if (!obj || typeof obj !== "object") return false;
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in (current as Record<string, unknown>))) return false;
    current = (current as Record<string, unknown>)[part];
  }
  return !!current;
}

export function CreateCompanyPageForm({ backHref, companies }: CreateCompanyPageFormProps) {
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState<SectionId>("geral");
  const toInputValue = (value: unknown) => (typeof value === "string" ? value : "");
  const toSelectValue = (value: unknown) => (typeof value === "string" ? value : "__none__");

  const form = useForm<CreateCompanyInput>({
    resolver: zodResolver(createCompanySchema) as any,
    defaultValues: {
      cnpj: "",
      razaoSocial: "",
      nomeFantasia: "",
      segment: undefined,
      logoUrl: "",
      status: CompanyStatus.ACTIVE,
      indicadorIE: IndicadorIE.NAO_CONTRIBUINTE,
      regimeTributario: undefined,
      crt: "",
      inscricaoEstadual: "",
      inscricaoMunicipal: "",
      cnae: "",
      codSuframa: "",
      parentCompanyId: "",
      accountingFirmId: "",
      emailContato: "",
      emailFinanceiro: "",
      telefone: "",
      whatsapp: "",
      website: "",
      observacoes: "",
      address: {
        description: "Sede",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        pais: "BR",
        codigoIbgeCidade: "",
        codigoIbgeEstado: "",
      },
    },
    mode: "onTouched",
  });

  const { errors, dirtyFields, isSubmitting, isDirty } = form.formState;
  const { isLoadingCep, handleCepChange } = useAddressLookup(form.setValue);

  const sectionHasErrors = (sectionId: SectionId) => {
    const section = SECTIONS.find((s) => s.id === sectionId);
    return section ? section.fields.some((field) => hasPath(errors, field)) : false;
  };

  const sectionIsDirty = (sectionId: SectionId) => {
    const section = SECTIONS.find((s) => s.id === sectionId);
    return section ? section.fields.some((field) => hasPath(dirtyFields, field)) : false;
  };

  const onSubmit: SubmitHandler<CreateCompanyInput> = async (data) => {
    const result = await createCompanyAction(data);
    if (!result.success) {
      toast.error(result.message ?? "Erro ao cadastrar empresa.");
      return;
    }

    toast.success(result.message ?? "Empresa cadastrada com sucesso.");
    router.push(backHref);
    router.refresh();
  };

  const current = SECTIONS.find((s) => s.id === currentSection) ?? SECTIONS[0];

  return (
    <div className="relative w-full min-h-[calc(100vh-140px)] rounded-2xl border border-border/50 bg-card/95 overflow-hidden shadow-xl">
      <ShineBorder borderWidth={1} duration={16} shineColor={["#2dd4bf", "#60a5fa", "#a78bfa"]} />
      <div className="flex items-center justify-between gap-4 border-b border-border/50 px-6 py-4 bg-gradient-to-r from-muted/30 via-background to-muted/20">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight inline-flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary/70" />
            Nova Empresa
          </h2>
          <p className="text-sm text-muted-foreground">{current.title} - {current.description}</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => router.push(backHref)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-[calc(100vh-260px)]">
          <aside className="w-56 border-r border-border/50 bg-muted/20 p-3 space-y-1 backdrop-blur-sm">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isCurrent = section.id === currentSection;
              const hasError = sectionHasErrors(section.id);
              const changed = sectionIsDirty(section.id);

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setCurrentSection(section.id)}
                  className={cn(
                    "group w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all border",
                    isCurrent ? "bg-primary/10 border-primary/20 shadow-sm" : "hover:bg-muted/70 border-transparent hover:border-border/50",
                  )}
                >
                  <div className={cn("mt-0.5 p-1.5 rounded-md", isCurrent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground", hasError && "bg-destructive/10 text-destructive")}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className={cn("text-sm font-medium truncate", isCurrent ? "text-primary" : "text-foreground", hasError && "text-destructive")}>
                        {section.title}
                      </p>
                      {changed && !hasError && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                      {hasError && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground/70 truncate">{section.description}</p>
                  </div>
                  {isCurrent && <ChevronRight className="h-3.5 w-3.5 text-primary/70 mt-1" />}
                </button>
              );
            })}
          </aside>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto p-6">
              {currentSection === "geral" && (
                <MagicCard className="rounded-xl">
                <Card className="border-border/60 bg-card/95">
                  <CardHeader><CardTitle className="text-base">Identificacao</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={form.control} name="cnpj" render={({ field }) => (
                        <FormItem><FormLabel>CNPJ</FormLabel><FormControl><Input placeholder="00.000.000/0000-00" {...field} value={toInputValue(field.value)} onChange={(event) => field.onChange(formatCNPJ(event.target.value))} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="segment" render={({ field }) => (
                        <FormItem><FormLabel>Segmento</FormLabel><Select onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)} value={toSelectValue(field.value)}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="__none__">Nao definido</SelectItem>{Object.values(CompanySegment).map((segment) => <SelectItem key={segment} value={segment}>{COMPANY_SEGMENT_LABELS[segment]}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={toInputValue(field.value)}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value={CompanyStatus.ACTIVE}>Ativo</SelectItem><SelectItem value={CompanyStatus.INACTIVE}>Inativo</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="razaoSocial" render={({ field }) => (
                      <FormItem><FormLabel>Razao Social</FormLabel><FormControl><Input placeholder="Razao social" {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="nomeFantasia" render={({ field }) => (
                        <FormItem><FormLabel>Nome Fantasia</FormLabel><FormControl><Input placeholder="Nome fantasia" {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="logoUrl" render={({ field }) => (
                        <FormItem><FormLabel>URL da Logo</FormLabel><FormControl><Input placeholder="https://..." {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="dataFundacao" render={({ field }) => (
                      <FormItem><FormLabel>Data de Fundacao</FormLabel><FormControl><Input type="date" value={field.value instanceof Date ? field.value.toISOString().slice(0, 10) : ""} onChange={(event) => field.onChange(event.target.value || undefined)} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </CardContent>
                </Card>
                </MagicCard>
              )}

              {currentSection === "fiscal" && (
                <MagicCard className="rounded-xl">
                <Card className="border-border/60 bg-card/95">
                  <CardHeader><CardTitle className="text-base">Fiscal</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={form.control} name="regimeTributario" render={({ field }) => (
                        <FormItem><FormLabel>Regime Tributario</FormLabel><Select onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)} value={toSelectValue(field.value)}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="__none__">Nao definido</SelectItem>{Object.values(TaxRegime).map((regime) => <SelectItem key={regime} value={regime}>{regime.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="crt" render={({ field }) => (
                        <FormItem><FormLabel>CRT</FormLabel><FormControl><Input placeholder="1, 2, 3 ou 4" {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="indicadorIE" render={({ field }) => (
                        <FormItem><FormLabel>Indicador IE</FormLabel><Select onValueChange={field.onChange} value={toInputValue(field.value)}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value={IndicadorIE.CONTRIBUINTE}>Contribuinte</SelectItem><SelectItem value={IndicadorIE.ISENTO}>Isento</SelectItem><SelectItem value={IndicadorIE.NAO_CONTRIBUINTE}>Nao contribuinte</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="inscricaoEstadual" render={({ field }) => (
                        <FormItem><FormLabel>Inscricao Estadual</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="inscricaoMunicipal" render={({ field }) => (
                        <FormItem><FormLabel>Inscricao Municipal</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="cnae" render={({ field }) => (
                        <FormItem><FormLabel>CNAE</FormLabel><FormControl><Input placeholder="0000-0/00" {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="codSuframa" render={({ field }) => (
                        <FormItem><FormLabel>Codigo SUFRAMA</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </CardContent>
                </Card>
                </MagicCard>
              )}

              {currentSection === "estrutura" && (
                <MagicCard className="rounded-xl">
                <Card className="border-border/60 bg-card/95">
                  <CardHeader><CardTitle className="text-base">Estrutura</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="parentCompanyId" render={({ field }) => (
                      <FormItem><FormLabel>Empresa Matriz</FormLabel><Select onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)} value={toSelectValue(field.value)}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="__none__">Nao definida</SelectItem>{companies.map((company) => <SelectItem key={company.id} value={company.id}>{company.nomeFantasia || company.razaoSocial}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="accountingFirmId" render={({ field }) => (
                      <FormItem><FormLabel>Escritorio Contabil</FormLabel><Select onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)} value={toSelectValue(field.value)}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="__none__">Nao definido</SelectItem>{companies.map((company) => <SelectItem key={company.id} value={company.id}>{company.nomeFantasia || company.razaoSocial}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )} />
                  </CardContent>
                </Card>
                </MagicCard>
              )}

              {currentSection === "endereco" && (
                <MagicCard className="rounded-xl">
                <Card className="border-border/60 bg-card/95">
                  <CardHeader><CardTitle className="text-base">Endereco</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={form.control} name="address.cep" render={({ field }) => (
                        <FormItem><FormLabel>CEP</FormLabel><FormControl><div className="relative"><Input placeholder="00000-000" {...field} value={toInputValue(field.value)} onChange={(event) => handleCepChange(event.target.value)} />{isLoadingCep ? <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" /> : <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />}</div></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="address.pais" render={({ field }) => (
                        <FormItem><FormLabel>Pais</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="address.description" render={({ field }) => (
                        <FormItem><FormLabel>Descricao do Endereco</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="address.logradouro" render={({ field }) => (
                      <FormItem><FormLabel>Logradouro</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={form.control} name="address.numero" render={({ field }) => (
                        <FormItem><FormLabel>Numero</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="address.complemento" render={({ field }) => (
                        <FormItem><FormLabel>Complemento</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="address.bairro" render={({ field }) => (
                        <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="address.cidade" render={({ field }) => (
                        <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="address.estado" render={({ field }) => (
                        <FormItem><FormLabel>UF</FormLabel><FormControl><Input {...field} maxLength={2} className="uppercase" value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="address.codigoIbgeCidade" render={({ field }) => (
                        <FormItem><FormLabel>Codigo IBGE Cidade</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="address.codigoIbgeEstado" render={({ field }) => (
                        <FormItem><FormLabel>Codigo IBGE Estado</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </CardContent>
                </Card>
                </MagicCard>
              )}

              {currentSection === "contato" && (
                <MagicCard className="rounded-xl">
                <Card className="border-border/60 bg-card/95">
                  <CardHeader><CardTitle className="text-base">Contato</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="emailContato" render={({ field }) => (
                        <FormItem><FormLabel>E-mail Comercial</FormLabel><FormControl><Input type="email" placeholder="comercial@empresa.com.br" {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="emailFinanceiro" render={({ field }) => (
                        <FormItem><FormLabel>E-mail Financeiro</FormLabel><FormControl><Input type="email" placeholder="financeiro@empresa.com.br" {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={form.control} name="telefone" render={({ field }) => (
                        <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} onChange={(event) => field.onChange(formatPhone(event.target.value))} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="whatsapp" render={({ field }) => (
                        <FormItem><FormLabel>WhatsApp</FormLabel><FormControl><Input {...field} value={toInputValue(field.value)} onChange={(event) => field.onChange(formatPhone(event.target.value))} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="website" render={({ field }) => (
                        <FormItem><FormLabel>Website</FormLabel><FormControl><Input placeholder="https://www.empresa.com.br" {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="observacoes" render={({ field }) => (
                      <FormItem><FormLabel>Observacoes</FormLabel><FormControl><Textarea rows={4} placeholder="Observacoes internas" {...field} value={toInputValue(field.value)} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </CardContent>
                </Card>
                </MagicCard>
              )}
            </div>

            <div className="border-t border-border/50 px-6 py-4 flex items-center justify-between">
              <div>
                {Object.keys(errors).length > 0 && (
                  <Badge variant="destructive" className="text-[11px] gap-1 font-medium">
                    <AlertCircle className="h-3 w-3" />
                    Campos invalidos
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => router.push(backHref)}>
                  Cancelar
                </Button>
                <Button type="submit" className="gap-2" disabled={isSubmitting || !isDirty}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar Empresa
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
