"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { CompanySegment, CompanyStatus, IndicadorIE } from "@prisma/client";
import { createCompanySchema, type CreateCompanyInput } from "@/core/application/schema/company-schema";
import { createCompanyAction } from "@/actions/admin/company-actions";
import { COMPANY_SEGMENT_LABELS } from "@/core/config/company-segments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";

interface CreateCompanyPageFormProps {
  backHref: string;
}

export function CreateCompanyPageForm({ backHref }: CreateCompanyPageFormProps) {
  const router = useRouter();

  const form = useForm<CreateCompanyInput>({
    resolver: zodResolver(createCompanySchema) as any,
    defaultValues: {
      cnpj: "",
      razaoSocial: "",
      nomeFantasia: "",
      segment: undefined,
      status: CompanyStatus.ACTIVE,
      indicadorIE: IndicadorIE.NAO_CONTRIBUINTE,
      emailContato: "",
      telefone: "",
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
  });

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

  return (
    <div className="w-full min-h-[calc(100vh-220px)] rounded-2xl border border-border/50 bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-border/50 px-6 py-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Nova Empresa</h2>
          <p className="text-sm text-muted-foreground">Cadastro em tela dedicada, sem modal.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => router.push(backHref)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Identificacao</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl><Input placeholder="00.000.000/0000-00" {...field} /></FormControl>
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
                      <Select onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)} value={(field.value as string) ?? "__none__"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Nao definido</SelectItem>
                          {Object.values(CompanySegment).map((segment) => (
                            <SelectItem key={segment} value={segment}>{COMPANY_SEGMENT_LABELS[segment]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="razaoSocial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razao Social</FormLabel>
                    <FormControl><Input placeholder="Razao social" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nomeFantasia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Fantasia</FormLabel>
                    <FormControl><Input placeholder="Nome fantasia" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Status e Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={CompanyStatus.ACTIVE}>Ativo</SelectItem>
                          <SelectItem value={CompanyStatus.INACTIVE}>Inativo</SelectItem>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={IndicadorIE.CONTRIBUINTE}>Contribuinte</SelectItem>
                          <SelectItem value={IndicadorIE.ISENTO}>Isento</SelectItem>
                          <SelectItem value={IndicadorIE.NAO_CONTRIBUINTE}>Nao contribuinte</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl><Input placeholder="(00) 00000-0000" {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="emailContato"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail de Contato</FormLabel>
                    <FormControl><Input type="email" placeholder="contato@empresa.com" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observacoes</FormLabel>
                    <FormControl><Textarea rows={4} placeholder="Observacoes internas" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => router.push(backHref)}>Cancelar</Button>
            <Button type="submit" className="gap-2" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Empresa
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
