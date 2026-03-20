"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { createUserSchema, type CreateUserInput } from "@/core/application/schema/user-schema";
import { createUserAction } from "@/actions/admin/user-actions";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";

interface CompanyOption {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
}

interface CreateUserPageFormProps {
  companies: CompanyOption[];
  context: "CLIENT" | "SYSTEM";
  isAdmin: boolean;
  backHref: string;
}

export function CreateUserPageForm({ companies, context, isAdmin, backHref }: CreateUserPageFormProps) {
  const router = useRouter();
  const defaultRole = context === "SYSTEM" ? Role.SUPORTE : Role.CLIENTE_USER;
  const toInputValue = (value: unknown) => (typeof value === "string" ? value : "");

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: defaultRole,
      companyId: context === "CLIENT" ? "" : undefined,
      jobTitle: "",
      phone: "",
      cpf: "",
    },
  });

  const onSubmit: SubmitHandler<CreateUserInput> = async (data) => {
    if (context === "SYSTEM") data.companyId = undefined;
    const result = await createUserAction(data);

    if (!result.success) {
      toast.error(result.message ?? "Erro ao cadastrar usuario.");
      return;
    }

    toast.success(result.message ?? "Usuario cadastrado com sucesso.");
    router.push(backHref);
    router.refresh();
  };

  return (
    <div className="w-full min-h-[calc(100vh-220px)] rounded-2xl border border-border/50 bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-border/50 px-6 py-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {context === "SYSTEM" ? "Novo Analista de Sistemas" : "Novo Usuario"}
          </h2>
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
              <CardTitle className="text-base">Escopo e Permissoes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {context === "CLIENT" && (
                <FormField
                  control={form.control}
                  name="companyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empresa</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a empresa" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
              )}

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nivel de acesso</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {context === "CLIENT" && (
                          <>
                            <SelectItem value={Role.CLIENTE_USER}>Usuario</SelectItem>
                            <SelectItem value={Role.CLIENTE_ADMIN}>Gestor da Unidade</SelectItem>
                          </>
                        )}
                        {context === "SYSTEM" && (
                          <>
                            <SelectItem value={Role.SUPORTE}>Suporte</SelectItem>
                            <SelectItem value={Role.DEVELOPER}>Desenvolvedor</SelectItem>
                            {isAdmin && <SelectItem value={Role.ADMIN}>Admin</SelectItem>}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Dados do Usuario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl><Input placeholder="Nome completo" {...field} value={toInputValue(field.value)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl><Input type="email" placeholder="usuario@empresa.com" {...field} value={toInputValue(field.value)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha de acesso</FormLabel>
                    <FormControl><Input type="password" placeholder="Minimo 8 caracteres" {...field} value={toInputValue(field.value)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo</FormLabel>
                      <FormControl><Input placeholder="Cargo" {...field} value={toInputValue(field.value)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl><Input placeholder="(00) 00000-0000" {...field} value={toInputValue(field.value)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl><Input placeholder="000.000.000-00" {...field} value={toInputValue(field.value)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => router.push(backHref)}>Cancelar</Button>
            <Button type="submit" className="gap-2" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Cadastro
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
