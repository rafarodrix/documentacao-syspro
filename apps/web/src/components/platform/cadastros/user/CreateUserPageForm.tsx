"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createUserSchema, type CreateUserInput } from "@dosc-syspro/contracts";
import type { Role as PrismaRole } from "@prisma/client";
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
  Building2,
  Link2,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";

const ROLE = {
  ADMIN: "ADMIN",
  DEVELOPER: "DEVELOPER",
  SUPORTE: "SUPORTE",
  CLIENTE_ADMIN: "CLIENTE_ADMIN",
  CLIENTE_USER: "CLIENTE_USER",
} as const;

type ContactOption = {
  id: string;
  name: string;
  whatsapp?: string | null;
  email?: string | null;
  companyId?: string | null;
  companyIds?: string[];
  company?: {
    id: string;
    razaoSocial: string;
    nomeFantasia?: string | null;
  } | null;
  companies?: Array<{
    id: string;
    razaoSocial: string;
    nomeFantasia?: string | null;
  }>;
};

type CompanyOption = {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
};

export interface CreateUserPageFormProps {
  companies: CompanyOption[];
  context: "CLIENT" | "SYSTEM" | "UNIFIED";
  isAdmin: boolean;
  backHref: string;
  mode?: "create" | "edit";
  userId?: string;
  initialData?: Partial<CreateUserInput>;
  allowedRoles?: PrismaRole[];
}

const toInputValue = (value: unknown) => (typeof value === "string" ? value : "");

export function CreateUserPageForm({
  companies,
  context,
  isAdmin,
  backHref,
  mode = "create",
  userId,
  initialData,
  allowedRoles,
}: CreateUserPageFormProps) {
  const router = useRouter();
  const fallbackAllowedRoles = useMemo(() => {
    if (context === "SYSTEM") return [ROLE.SUPORTE, ROLE.DEVELOPER, ...(isAdmin ? [ROLE.ADMIN] : [])] as PrismaRole[];
    if (context === "CLIENT") return [ROLE.CLIENTE_USER, ROLE.CLIENTE_ADMIN] as PrismaRole[];
    return [ROLE.CLIENTE_USER, ROLE.CLIENTE_ADMIN, ROLE.SUPORTE, ROLE.DEVELOPER, ...(isAdmin ? [ROLE.ADMIN] : [])] as PrismaRole[];
  }, [context, isAdmin]);
  const availableRoles = allowedRoles?.length ? allowedRoles : fallbackAllowedRoles;
  const defaultRole = availableRoles[0] ?? ROLE.CLIENTE_USER;
  const allowedCompanyIds = useMemo(() => companies.map((company) => company.id), [companies]);

  const [contactSearch, setContactSearch] = useState("");
  const [contactOptions, setContactOptions] = useState<ContactOption[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      email: initialData?.email ?? "",
      password: "",
      role: initialData?.role ?? defaultRole,
      contactId: initialData?.contactId ?? "",
      jobTitle: initialData?.jobTitle ?? "",
      phone: initialData?.phone ?? "",
      cpf: initialData?.cpf ?? "",
    },
    mode: "onTouched",
  });

  const { errors, isSubmitting, isDirty } = form.formState;
  const selectedContactId = useWatch({
    control: form.control,
    name: "contactId",
  });
  const selectedRole = useWatch({
    control: form.control,
    name: "role",
  });
  const selectedRoleIsClient = selectedRole === ROLE.CLIENTE_ADMIN || selectedRole === ROLE.CLIENTE_USER;

  useEffect(() => {
    const query = contactSearch.trim();
    const currentContactId = form.getValues("contactId");

    const timer = setTimeout(async () => {
      try {
        setLoadingContacts(true);

        const params = new URLSearchParams({ limit: "100" });
        if (query) params.set("q", query);

        const response = await fetch(`/api/contacts?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          setContactOptions([]);
          return;
        }

        const payload = (await response.json()) as ContactOption[];
        const normalized = Array.isArray(payload) ? payload : [];
        const filtered = selectedRoleIsClient
          ? normalized.filter((contact) => (contact.companyIds ?? (contact.companyId ? [contact.companyId] : [])).some((companyId) => allowedCompanyIds.includes(companyId)))
          : normalized;

        if (currentContactId && normalized.some((contact) => contact.id === currentContactId) && !filtered.some((contact) => contact.id === currentContactId)) {
          const selected = normalized.find((contact) => contact.id === currentContactId);
          setContactOptions(selected ? [selected, ...filtered] : filtered);
          return;
        }

        setContactOptions(filtered);
      } catch {
        setContactOptions([]);
      } finally {
        setLoadingContacts(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [allowedCompanyIds, contactSearch, selectedRoleIsClient, form]);

  useEffect(() => {
    const currentContactId = form.getValues("contactId");
    if (!currentContactId || contactOptions.some((contact) => contact.id === currentContactId)) {
      return;
    }

    let cancelled = false;

    const loadSelectedContact = async () => {
      try {
        const response = await fetch(`/api/contacts/${currentContactId}`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) return;
        const payload = (await response.json()) as ContactOption;
        if (cancelled || !payload?.id) return;

        setContactOptions((prev) => {
          if (prev.some((contact) => contact.id === payload.id)) return prev;
          return [payload, ...prev];
        });
      } catch {
        return;
      }
    };

    void loadSelectedContact();

    return () => {
      cancelled = true;
    };
  }, [contactOptions, form]);

  const selectedContact = useMemo(() => {
    if (!selectedContactId) return null;
    return contactOptions.find((contact) => contact.id === selectedContactId) ?? null;
  }, [contactOptions, selectedContactId]);

  const selectedCompanyNames = (selectedContact?.companies ?? (selectedContact?.company ? [selectedContact.company] : []))
    .map((company) => company.nomeFantasia || company.razaoSocial)
    .filter(Boolean)
    .join(", ");
  const selectedContactCompanyIds = selectedContact?.companyIds ?? (selectedContact?.companyId ? [selectedContact.companyId] : []);
  const clientContactInvalid = selectedRoleIsClient && Boolean(selectedContactId) && selectedContactCompanyIds.length === 0;

  const onSubmit: SubmitHandler<CreateUserInput> = async (data) => {
    if (!data.contactId?.trim()) {
      toast.error("Selecione um contato para este usuario.");
      return;
    }

    if (selectedRoleIsClient && selectedContactCompanyIds.length === 0) {
      toast.error("O contato do usuario precisa estar vinculado a uma empresa.");
      return;
    }

    const payload: CreateUserInput = {
      ...data,
      contactId: data.contactId.trim(),
    };

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

  const hasErrors = Object.keys(errors).length > 0;

  const title =
    mode === "edit"
      ? "Editar Usuario"
      : "Novo Usuario";

  const roleItems: Array<{ value: PrismaRole; label: string }> = [
    { value: ROLE.CLIENTE_USER, label: "Usuario" },
    { value: ROLE.CLIENTE_ADMIN, label: "Gestor da Unidade" },
    { value: ROLE.SUPORTE, label: "Suporte" },
    { value: ROLE.DEVELOPER, label: "Desenvolvedor" },
    { value: ROLE.ADMIN, label: "Admin" },
  ].filter((item) => availableRoles.includes(item.value));

  return (
    <div className="relative w-full min-h-[calc(100vh-140px)] rounded-2xl border border-border/50 bg-card/95 overflow-hidden shadow-xl">
      <div className="flex items-center justify-between gap-4 border-b border-border/50 px-6 py-4 bg-gradient-to-r from-muted/30 via-background to-muted/20">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight inline-flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary/70" />
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">O usuario herda sua identidade do contato vinculado.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => router.push(backHref)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col min-h-[calc(100vh-220px)]">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <Card className="border-border/60 bg-card/95">
              <CardHeader>
                <CardTitle className="text-base">Contato e credenciais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-primary/70" />
                    <div>
                      <p className="text-sm font-medium">Contato principal</p>
                      <p className="text-[11px] text-muted-foreground">
                        O usuario sempre representa um contato. As empresas acessiveis sao derivadas desse contato.
                      </p>
                    </div>
                  </div>

                  <Input
                    placeholder="Buscar contato por nome, email ou whatsapp..."
                    value={contactSearch}
                    onChange={(event) => setContactSearch(event.target.value)}
                  />

                  <FormField
                    control={form.control}
                    name="contactId"
                    render={({ field }) => {
                      const selectValue = toInputValue(field.value) || "__none__";
                      return (
                        <FormItem>
                          <FormLabel>Contato</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}
                            value={selectValue}
                            disabled={loadingContacts}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={loadingContacts ? "Carregando contatos..." : "Selecione um contato"}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">Selecione um contato</SelectItem>
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

                  {selectedContact ? (
                    <div className="grid gap-2 rounded-md border border-border/50 bg-background/80 p-3 text-xs text-muted-foreground md:grid-cols-2">
                      <div>
                        <span className="font-medium text-foreground">Contato:</span> {selectedContact.name}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">WhatsApp / Email:</span>{" "}
                        {selectedContact.whatsapp || selectedContact.email || "Nao informado"}
                      </div>
                      <div className="md:col-span-2 inline-flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        <span className="font-medium text-foreground">Empresa do contato:</span>{" "}
                        {selectedCompanyNames || "Sem empresa vinculada"}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            {roleItems.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
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
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail de acesso</FormLabel>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome exibido</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo" {...field} value={toInputValue(field.value)} />
                        </FormControl>
                        <p className="text-[11px] text-muted-foreground">
                          Esse nome identifica o acesso no portal e nao sobrescreve o cadastro do contato.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo</FormLabel>
                        <FormControl>
                          <Input placeholder="Cargo ou funcao" {...field} value={toInputValue(field.value)} />
                        </FormControl>
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
                        <FormControl>
                          <Input placeholder="(DD) 99999-9999" {...field} value={toInputValue(field.value)} />
                        </FormControl>
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
                        <FormControl>
                          <Input placeholder="00000000000" {...field} value={toInputValue(field.value)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="border-t border-border/50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasErrors && (
                <Badge variant="destructive" className="text-[11px] gap-1 font-medium">
                  <AlertCircle className="h-3 w-3" />
                  Campos invalidos
                </Badge>
              )}
              {clientContactInvalid && (
                <Badge variant="outline" className="text-[11px] gap-1 font-medium border-amber-500/40 text-amber-700">
                  <AlertCircle className="h-3 w-3" />
                  Contato sem empresa vinculada
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
        </form>
      </Form>
    </div>
  );
}
