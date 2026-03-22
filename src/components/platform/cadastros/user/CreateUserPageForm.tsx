"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createUserSchema, type CreateUserInput } from "@/core/application/schema/user-schema";
import { createUserAction, updateUserAction } from "@/actions/platform/user-actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader2,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Shield,
  UserRound,
  IdCard,
  Plus,
  X,
} from "lucide-react";

const ROLE = {
  ADMIN: "ADMIN",
  DEVELOPER: "DEVELOPER",
  SUPORTE: "SUPORTE",
  CLIENTE_ADMIN: "CLIENTE_ADMIN",
  CLIENTE_USER: "CLIENTE_USER",
} as const;

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
  mode?: "create" | "edit";
  userId?: string;
  initialData?: Partial<CreateUserInput> & { additionalCompanyIds?: string[] };
}

type SectionId = "acesso" | "identidade" | "perfil";

type SectionConfig = {
  id: SectionId;
  title: string;
  description: string;
  icon: ElementType;
  fields: string[];
};

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

export function CreateUserPageForm({
  companies,
  context,
  isAdmin,
  backHref,
  mode = "create",
  userId,
  initialData,
}: CreateUserPageFormProps) {
  const router = useRouter();
  const defaultRole = context === "SYSTEM" ? ROLE.SUPORTE : ROLE.CLIENTE_USER;
  const [currentSection, setCurrentSection] = useState<SectionId>("acesso");
  const [additionalCompanyIds, setAdditionalCompanyIds] = useState<string[]>(
    () => (Array.isArray(initialData?.additionalCompanyIds) ? initialData.additionalCompanyIds.filter(Boolean) : []),
  );
  const [additionalCompaniesOpen, setAdditionalCompaniesOpen] = useState(false);
  const [additionalCompaniesQuery, setAdditionalCompaniesQuery] = useState("");

  const sections: SectionConfig[] = useMemo(
    () => [
      {
        id: "acesso",
        title: "Acesso",
        description: context === "SYSTEM" ? "Perfil interno" : "Empresa e perfil",
        icon: Shield,
        fields: context === "CLIENT" ? ["companyId", "role"] : ["role"],
      },
      {
        id: "identidade",
        title: "Identidade",
        description: "Dados principais de login",
        icon: UserRound,
        fields: mode === "create" ? ["name", "email", "password"] : ["name", "email"],
      },
      {
        id: "perfil",
        title: "Perfil",
        description: "Dados complementares",
        icon: IdCard,
        fields: ["jobTitle", "phone", "cpf"],
      },
    ],
    [context, mode],
  );

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
      ...(initialData ?? {}),
    },
    mode: "onTouched",
  });

  const { errors, dirtyFields, isSubmitting, isDirty } = form.formState;
  const primaryCompanyId = form.watch("companyId");
  const availableAdditionalCompanies = useMemo(
    () => companies.filter((company) => company.id !== primaryCompanyId),
    [companies, primaryCompanyId],
  );
  const filteredAdditionalCompanies = useMemo(() => {
    const normalizedQuery = additionalCompaniesQuery.trim().toLowerCase();
    if (!normalizedQuery) return availableAdditionalCompanies;
    return availableAdditionalCompanies.filter((company) => {
      const name = (company.nomeFantasia || company.razaoSocial).toLowerCase();
      const documentId = company.razaoSocial.toLowerCase();
      return name.includes(normalizedQuery) || documentId.includes(normalizedQuery);
    });
  }, [additionalCompaniesQuery, availableAdditionalCompanies]);
  const selectedAdditionalCompanies = useMemo(
    () =>
      additionalCompanyIds
        .map((id) => companies.find((company) => company.id === id))
        .filter((company): company is CompanyOption => Boolean(company)),
    [additionalCompanyIds, companies],
  );

  useEffect(() => {
    if (!primaryCompanyId) return;
    setAdditionalCompanyIds((prev) => prev.filter((id) => id !== primaryCompanyId));
  }, [primaryCompanyId]);

  const sectionStateMap = useMemo(() => {
    return sections.reduce<Record<SectionId, "error" | "ready" | "idle">>((acc, section) => {
      const hasError = section.fields.some((field) => hasPath(errors, field));
      if (hasError) {
        acc[section.id] = "error";
        return acc;
      }
      const touched = section.fields.some((field) => hasPath(dirtyFields, field));
      acc[section.id] = touched ? "ready" : "idle";
      return acc;
    }, {} as Record<SectionId, "error" | "ready" | "idle">);
  }, [dirtyFields, errors, sections]);

  const onSubmit: SubmitHandler<CreateUserInput> = async (data) => {
    const payload: CreateUserInput & { additionalCompanyIds?: string[] } = { ...data };
    if (context === "SYSTEM") payload.companyId = undefined;
    if (context === "CLIENT") payload.additionalCompanyIds = additionalCompanyIds;
    if (mode === "edit" && !payload.password) payload.password = undefined;

    const result =
      mode === "edit" && userId
        ? await updateUserAction(userId, payload)
        : await createUserAction(payload);

    if (!result.success) {
      toast.error(result.message ?? (mode === "edit" ? "Erro ao atualizar usuario." : "Erro ao cadastrar usuario."));
      return;
    }

    toast.success(result.message ?? (mode === "edit" ? "Usuario atualizado com sucesso." : "Usuario cadastrado com sucesso."));
    router.push(backHref);
    router.refresh();
  };

  const current = sections.find((s) => s.id === currentSection) ?? sections[0];
  const currentIndex = Math.max(sections.findIndex((s) => s.id === current.id), 0);
  const progressPct = Math.round(((currentIndex + 1) / sections.length) * 100);

  return (
    <div className="relative w-full min-h-[calc(100vh-140px)] rounded-2xl border border-border/50 bg-card/95 overflow-hidden shadow-xl">
      <div className="flex items-center justify-between gap-4 border-b border-border/50 px-6 py-4 bg-gradient-to-r from-muted/30 via-background to-muted/20">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight inline-flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary/70" />
            {mode === "edit"
              ? context === "SYSTEM"
                ? "Editar Analista de Sistemas"
                : "Editar Usuario"
              : context === "SYSTEM"
                ? "Novo Analista de Sistemas"
                : "Novo Usuario"}
          </h2>
          <p className="text-sm text-muted-foreground">{current.title} - {current.description}</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => router.push(backHref)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div className="border-b border-border/50 px-6 py-3 bg-muted/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progresso do cadastro</span>
          <span className="font-medium text-foreground">{currentIndex + 1}/{sections.length}</span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
          <div className="h-1.5 rounded-full bg-primary transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-[calc(100vh-260px)]">
          <aside className="w-56 border-r border-border/50 bg-muted/20 p-3 space-y-1 backdrop-blur-sm">
            {sections.map((section) => {
              const Icon = section.icon;
              const isCurrent = section.id === currentSection;
              const state = sectionStateMap[section.id];
              const hasError = state === "error";
              const isReady = state === "ready";

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
                      {isReady && !hasError && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                      {hasError && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground/70 truncate">{section.description}</p>
                    {isReady && !hasError && (
                      <Badge variant="outline" className="mt-1 h-5 rounded-full border-emerald-500/30 bg-emerald-500/10 px-2 text-[10px] text-emerald-600">
                        Pronto
                      </Badge>
                    )}
                  </div>
                  {isCurrent && <ChevronRight className="h-3.5 w-3.5 text-primary/70 mt-1" />}
                </button>
              );
            })}
          </aside>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto p-6">
              <div key={currentSection} className="animate-in fade-in slide-in-from-right-2 duration-200">
                  {currentSection === "acesso" && (
                    <Card className="border-border/60 bg-card/95">
                      <CardHeader><CardTitle className="text-base">Escopo e Permissoes</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                          {context === "CLIENT" && (
                            <FormField
                              control={form.control}
                              name="companyId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Empresa</FormLabel>
                                  <Select
                                    onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}
                                    value={field.value && companies.some((company) => company.id === field.value) ? field.value : "__none__"}
                                  >
                                    <FormControl>
                                      <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="__none__">Selecione...</SelectItem>
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

                          {context === "CLIENT" && companies.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <label className="text-sm font-medium leading-none">Empresas adicionais</label>
                                <Popover open={additionalCompaniesOpen} onOpenChange={setAdditionalCompaniesOpen}>
                                  <PopoverTrigger asChild>
                                    <Button type="button" variant="outline" size="sm" className="gap-1.5">
                                      <Plus className="h-3.5 w-3.5" />
                                      Adicionar empresa
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent align="end" className="w-[360px] p-3">
                                    <div className="space-y-2">
                                      <Input
                                        value={additionalCompaniesQuery}
                                        onChange={(event) => setAdditionalCompaniesQuery(event.target.value)}
                                        placeholder="Buscar empresa..."
                                      />
                                      <div className="max-h-56 overflow-auto rounded-md border border-border/60 bg-muted/20 p-1">
                                        {filteredAdditionalCompanies.length === 0 ? (
                                          <p className="px-2 py-3 text-xs text-muted-foreground">Nenhuma empresa encontrada.</p>
                                        ) : (
                                          filteredAdditionalCompanies.map((company) => {
                                            const checked = additionalCompanyIds.includes(company.id);
                                            return (
                                              <label
                                                key={company.id}
                                                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60 cursor-pointer"
                                              >
                                                <Checkbox
                                                  checked={checked}
                                                  onCheckedChange={(value) => {
                                                    setAdditionalCompanyIds((prev) =>
                                                      value === true
                                                        ? Array.from(new Set([...prev, company.id]))
                                                        : prev.filter((id) => id !== company.id),
                                                    );
                                                  }}
                                                />
                                                <span className="line-clamp-1">{company.nomeFantasia || company.razaoSocial}</span>
                                              </label>
                                            );
                                          })
                                        )}
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <div className="rounded-md border border-border/60 bg-muted/10 p-2">
                                {selectedAdditionalCompanies.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">Nenhuma empresa adicional vinculada.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {selectedAdditionalCompanies.map((company) => (
                                      <Badge key={company.id} variant="secondary" className="gap-1 rounded-md pl-2 pr-1 py-1">
                                        <span className="max-w-[220px] truncate">{company.nomeFantasia || company.razaoSocial}</span>
                                        <button
                                          type="button"
                                          className="rounded p-0.5 hover:bg-background/60"
                                          onClick={() =>
                                            setAdditionalCompanyIds((prev) => prev.filter((id) => id !== company.id))
                                          }
                                          aria-label={`Remover ${company.nomeFantasia || company.razaoSocial}`}
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                O mesmo usuario pode ser vinculado a mais de uma empresa.
                              </p>
                            </div>
                          )}

                          <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nivel de acesso</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {context === "CLIENT" && (
                                      <>
                                        <SelectItem value={ROLE.CLIENTE_USER}>Usuario</SelectItem>
                                        <SelectItem value={ROLE.CLIENTE_ADMIN}>Gestor da Unidade</SelectItem>
                                      </>
                                    )}
                                    {context === "SYSTEM" && (
                                      <>
                                        <SelectItem value={ROLE.SUPORTE}>Suporte</SelectItem>
                                        <SelectItem value={ROLE.DEVELOPER}>Desenvolvedor</SelectItem>
                                        {isAdmin && <SelectItem value={ROLE.ADMIN}>Admin</SelectItem>}
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
                  )}

                  {currentSection === "identidade" && (
                    <Card className="border-border/60 bg-card/95">
                      <CardHeader><CardTitle className="text-base">Dados do Usuario</CardTitle></CardHeader>
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

                          {mode === "create" && (
                            <FormField
                              control={form.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Senha de acesso</FormLabel>
                                  <FormControl><Input type="password" placeholder="Minimo 6 caracteres" {...field} value={toInputValue(field.value)} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                      </CardContent>
                    </Card>
                  )}

                  {currentSection === "perfil" && (
                    <Card className="border-border/60 bg-card/95">
                      <CardHeader><CardTitle className="text-base">Informacoes complementares</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
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
                  )}
              </div>
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
                <Button type="button" variant="ghost" onClick={() => router.push(backHref)}>Cancelar</Button>
                <Button type="submit" className="gap-2" disabled={isSubmitting || !isDirty}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {mode === "edit" ? "Salvar Alteracoes" : "Salvar Cadastro"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}

