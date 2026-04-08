"use client";

import { useEffect, useMemo, useRef, useState, type ElementType } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createUserSchema, type CreateUserInput } from "@dosc-syspro/contracts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Save,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";
import { CompanyMultiPicker, type CompanyOption } from "./CompanyMultiPicker";

const ROLE = {
  ADMIN: "ADMIN",
  DEVELOPER: "DEVELOPER",
  SUPORTE: "SUPORTE",
  CLIENTE_ADMIN: "CLIENTE_ADMIN",
  CLIENTE_USER: "CLIENTE_USER",
} as const;

type SectionId = "acesso" | "identidade";

type SectionConfig = {
  id: SectionId;
  title: string;
  description: string;
  icon: ElementType;
  fields: string[];
};

type ContactOption = {
  id: string;
  name: string;
  whatsapp?: string | null;
  email?: string | null;
};

export interface CreateUserPageFormProps {
  companies: CompanyOption[];
  context: "CLIENT" | "SYSTEM";
  isAdmin: boolean;
  backHref: string;
  mode?: "create" | "edit";
  userId?: string;
  initialData?: Partial<CreateUserInput> & { additionalCompanyIds?: string[] };
}

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

const toInputValue = (value: unknown) => (typeof value === "string" ? value : "");

function SectionNav({
  sections,
  current,
  stateMap,
  onSelect,
}: {
  sections: SectionConfig[];
  current: SectionId;
  stateMap: Record<SectionId, "error" | "ready" | "idle">;
  onSelect: (id: SectionId) => void;
}) {
  return (
    <aside className="w-full md:w-56 border-b md:border-b-0 md:border-r border-border/50 bg-muted/20 p-3 flex md:flex-col gap-2 md:gap-1 overflow-x-auto md:overflow-x-visible backdrop-blur-sm hide-scrollbar">
      {sections.map((section) => {
        const Icon = section.icon;
        const isCurrent = section.id === current;
        const state = stateMap[section.id];
        const hasError = state === "error";
        const isReady = state === "ready";

        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelect(section.id)}
            className={cn(
              "group shrink-0 w-48 md:w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all border",
              isCurrent
                ? "bg-primary/10 border-primary/20 shadow-sm"
                : "hover:bg-muted/70 border-transparent hover:border-border/50",
            )}
          >
            <div
              className={cn(
                "mt-0.5 p-1.5 rounded-md",
                isCurrent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                hasError && "bg-destructive/10 text-destructive",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p
                  className={cn(
                    "text-sm font-medium truncate",
                    isCurrent ? "text-primary" : "text-foreground",
                    hasError && "text-destructive",
                  )}
                >
                  {section.title}
                </p>
                {isReady && !hasError && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                {hasError && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
              </div>
              <p className="text-[11px] text-muted-foreground/70 truncate">{section.description}</p>
            </div>

            {isCurrent && <ChevronRight className="h-3.5 w-3.5 text-primary/70 mt-1 shrink-0" />}
          </button>
        );
      })}
    </aside>
  );
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

  const [companyIds, setCompanyIds] = useState<string[]>(() => {
    const primary = initialData?.companyId;
    const additional = Array.isArray(initialData?.additionalCompanyIds)
      ? initialData.additionalCompanyIds.filter(Boolean)
      : [];
    return primary ? [primary, ...additional] : additional;
  });

  const [contactSearch, setContactSearch] = useState("");
  const [contactOptions, setContactOptions] = useState<ContactOption[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const primaryCompanyIdRef = useRef<string | undefined>(companyIds[0]);

  const sections: SectionConfig[] = useMemo(
    () => [
      {
        id: "acesso",
        title: "Acesso",
        description: context === "SYSTEM" ? "Perfil interno" : "Empresa e permissoes",
        icon: Shield,
        fields: context === "CLIENT" ? ["companyId", "role"] : ["role"],
      },
      {
        id: "identidade",
        title: "Identidade",
        description: "Dados principais de login",
        icon: UserRound,
        fields:
          context === "CLIENT"
            ? mode === "create"
              ? ["name", "email", "password", "primaryContactId"]
              : ["name", "email", "primaryContactId"]
            : mode === "create"
              ? ["name", "email", "password"]
              : ["name", "email"],
      },
    ],
    [context, mode],
  );

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      email: initialData?.email ?? "",
      password: "",
      role: initialData?.role ?? defaultRole,
      companyId: context === "CLIENT" ? initialData?.companyId ?? "" : undefined,
      primaryContactId: initialData?.primaryContactId ?? "",
    },
    mode: "onTouched",
  });

  const { errors, dirtyFields, isSubmitting, isDirty } = form.formState;

  useEffect(() => {
    if (context !== "CLIENT") return;
    form.setValue("companyId", companyIds[0] ?? "", { shouldDirty: true, shouldValidate: true });
  }, [companyIds, context, form]);

  useEffect(() => {
    if (context !== "CLIENT") return;
    const currentPrimary = companyIds[0];
    const previousPrimary = primaryCompanyIdRef.current;

    if (previousPrimary !== undefined && previousPrimary !== currentPrimary) {
      form.setValue("primaryContactId", "", { shouldDirty: true, shouldValidate: true });
    }

    primaryCompanyIdRef.current = currentPrimary;
  }, [companyIds, context, form]);

  useEffect(() => {
    if (context !== "CLIENT") return;
    const companyId = companyIds[0];
    if (!companyId) {
      setContactOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoadingContacts(true);
        const params = new URLSearchParams({ companyId, limit: "100" });
        if (contactSearch.trim()) {
          params.set("q", contactSearch.trim());
        }

        const response = await fetch(`/api/contacts?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          setContactOptions([]);
          return;
        }

        const payload = (await response.json()) as ContactOption[];
        setContactOptions(Array.isArray(payload) ? payload : []);
      } catch {
        setContactOptions([]);
      } finally {
        setLoadingContacts(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [companyIds, contactSearch, context]);

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

    if (context === "SYSTEM") {
      payload.companyId = undefined;
      payload.primaryContactId = undefined;
    } else {
      payload.companyId = companyIds[0] ?? "";
      payload.additionalCompanyIds = companyIds.slice(1);
      payload.primaryContactId = (data.primaryContactId || "").trim();
    }

    if (mode === "edit" && !payload.password) payload.password = undefined;

    const url = mode === "edit" && userId ? `/api/users/${userId}` : "/api/users";
    const method = mode === "edit" && userId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        toast.error(errData?.message || (mode === "edit" ? "Erro ao atualizar usuario." : "Erro ao cadastrar usuario."));
        return;
      }

      toast.success(mode === "edit" ? "Usuario atualizado com sucesso." : "Usuario cadastrado com sucesso.");
      router.push(backHref);
      router.refresh();
    } catch {
      toast.error("Erro na comunicacao com o servidor.");
    }
  };

  const currentSectionConfig = sections.find((s) => s.id === currentSection) ?? sections[0];
  const currentIndex = Math.max(sections.findIndex((s) => s.id === currentSection), 0);
  const progressPct = Math.round(((currentIndex + 1) / sections.length) * 100);
  const hasErrors = Object.keys(errors).length > 0;

  const title =
    mode === "edit"
      ? context === "SYSTEM"
        ? "Editar Analista de Sistemas"
        : "Editar Usuario"
      : context === "SYSTEM"
        ? "Novo Analista de Sistemas"
        : "Novo Usuario";

  return (
    <div className="relative w-full min-h-[calc(100vh-140px)] rounded-2xl border border-border/50 bg-card/95 overflow-hidden shadow-xl">
      <div className="flex items-center justify-between gap-4 border-b border-border/50 px-6 py-4 bg-gradient-to-r from-muted/30 via-background to-muted/20">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight inline-flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary/70" />
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {currentSectionConfig.title} - {currentSectionConfig.description}
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => router.push(backHref)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div className="border-b border-border/50 px-6 py-3 bg-muted/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Progresso do cadastro</span>
          <span className="font-medium text-foreground">
            {currentIndex + 1}/{sections.length}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div className="h-1.5 rounded-full bg-primary transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col md:flex-row min-h-[calc(100vh-260px)]">
          <SectionNav sections={sections} current={currentSection} stateMap={sectionStateMap} onSelect={setCurrentSection} />

          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto p-6">
              <div key={currentSection} className="animate-in fade-in slide-in-from-right-2 duration-200">
                {currentSection === "acesso" && (
                  <Card className="border-border/60 bg-card/95">
                    <CardHeader>
                      <CardTitle className="text-base">Escopo e Permissoes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {context === "CLIENT" && (
                        <FormField
                          control={form.control}
                          name="companyId"
                          render={({ fieldState }) => (
                            <FormItem>
                              <FormLabel>Empresas vinculadas</FormLabel>
                              <CompanyMultiPicker
                                companies={companies}
                                value={companyIds}
                                onChange={setCompanyIds}
                                error={fieldState.error?.message}
                              />
                              <p className="text-[11px] text-muted-foreground">
                                A primeira empresa selecionada sera a principal. As demais sao vinculos adicionais.
                              </p>
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
                              <FormControl>
                                <Input placeholder="Nome completo" {...field} value={toInputValue(field.value)} />
                              </FormControl>
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
                              <FormControl>
                                <Input type="email" placeholder="usuario@empresa.com" {...field} value={toInputValue(field.value)} />
                              </FormControl>
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
                              <FormControl>
                                <Input type="password" placeholder="Minimo 6 caracteres" {...field} value={toInputValue(field.value)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {context === "CLIENT" && (
                        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                          <div>
                            <p className="text-sm font-medium">Contato principal</p>
                            <p className="text-[11px] text-muted-foreground">
                              Vincula este usuario a um contato da empresa principal selecionada.
                            </p>
                          </div>

                          <Input
                            placeholder="Buscar contato por nome, email ou whatsapp..."
                            value={contactSearch}
                            onChange={(event) => setContactSearch(event.target.value)}
                            disabled={!companyIds[0]}
                          />

                          <FormField
                            control={form.control}
                            name="primaryContactId"
                            render={({ field }) => {
                              const selectValue = toInputValue(field.value) || "__none__";
                              return (
                                <FormItem>
                                  <FormLabel>Contato vinculado</FormLabel>
                                  <Select
                                    onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}
                                    value={selectValue}
                                    disabled={!companyIds[0] || loadingContacts}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue
                                          placeholder={
                                            !companyIds[0]
                                              ? "Selecione a empresa principal primeiro"
                                              : loadingContacts
                                                ? "Carregando contatos..."
                                                : "Selecione um contato"
                                          }
                                        />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="__none__">Sem contato vinculado</SelectItem>
                                      {contactOptions.map((contact) => (
                                        <SelectItem key={contact.id} value={contact.id}>
                                          {contact.name}
                                          {contact.whatsapp ? ` - ${contact.whatsapp}` : contact.email ? ` - ${contact.email}` : ""}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <div className="border-t border-border/50 px-6 py-4 flex items-center justify-between">
              <div>
                {hasErrors && (
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
