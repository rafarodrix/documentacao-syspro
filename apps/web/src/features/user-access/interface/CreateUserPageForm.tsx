"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createUserSchema, type CreateUserInput } from "@dosc-syspro/contracts/user";
import type { Role as PrismaRole } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RegistryFormScaffold } from "@/components/platform/shared/RegistryFormScaffold";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertCircle,
  Building2,
  Check,
  ChevronsUpDown,
  Link2,
  Loader2,
  Mail,
  Phone,
  Search,
  UserRound,
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
const isValidEmailFormat = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

type EmailAvailabilityState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; message: string }
  | { status: "unavailable"; message: string };

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
  const [emailAvailability, setEmailAvailability] = useState<EmailAvailabilityState>({ status: "idle" });

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      email: initialData?.email ?? "",
      password: "",
      role: initialData?.role ?? defaultRole,
      contactId: initialData?.contactId ?? "",
    },
    mode: "onChange",
  });

  const { errors, isSubmitting } = form.formState;
  const selectedContactId = useWatch({
    control: form.control,
    name: "contactId",
  });
  const selectedRole = useWatch({
    control: form.control,
    name: "role",
  });
  const watchedName = useWatch({
    control: form.control,
    name: "name",
  });
  const watchedEmail = useWatch({
    control: form.control,
    name: "email",
  });
  const selectedRoleIsClient = selectedRole === ROLE.CLIENTE_ADMIN || selectedRole === ROLE.CLIENTE_USER;
  const normalizedWatchedEmail = String(watchedEmail ?? "").trim().toLowerCase();

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

  useEffect(() => {
    if (mode === "edit") return;
    if (!normalizedWatchedEmail || !isValidEmailFormat(normalizedWatchedEmail)) {
      setEmailAvailability({ status: "idle" });
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setEmailAvailability({ status: "checking" });
        const params = new URLSearchParams({ email: normalizedWatchedEmail });
        const response = await fetch(`/api/users/check-email?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });

        const payload = await response.json().catch(() => null);
        if (cancelled) return;

        if (!response.ok) {
          setEmailAvailability({ status: "idle" });
          return;
        }

        if (payload?.available) {
          setEmailAvailability({
            status: "available",
            message: payload?.message || "E-mail disponivel para cadastro.",
          });
          return;
        }

        setEmailAvailability({
          status: "unavailable",
          message: payload?.message || "Este e-mail nao esta disponivel.",
        });
      } catch {
        if (!cancelled) {
          setEmailAvailability({ status: "idle" });
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mode, normalizedWatchedEmail]);

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
  const canSubmitForm = Boolean(
    String(watchedName ?? "").trim().length >= 3 &&
    String(watchedEmail ?? "").trim().length > 0 &&
    selectedRole &&
    selectedContactId &&
    !clientContactInvalid &&
    (mode === "edit" || emailAvailability.status !== "unavailable"),
  );

  const onSubmit: SubmitHandler<CreateUserInput> = async (data) => {
    if (mode !== "edit" && emailAvailability.status === "unavailable") {
      toast.error(emailAvailability.message);
      return;
    }

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
        toast.error(
          errData?.error ||
          errData?.message ||
          (mode === "edit" ? "Erro ao atualizar usuario." : "Erro ao cadastrar usuario.")
        );
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
      ? "Editar usuario"
      : "Novo usuario";

  const roleItems: Array<{ value: PrismaRole; label: string }> = [
    { value: ROLE.CLIENTE_USER, label: "Usuario" },
    { value: ROLE.CLIENTE_ADMIN, label: "Gestor da Unidade" },
    { value: ROLE.SUPORTE, label: "Suporte" },
    { value: ROLE.DEVELOPER, label: "Desenvolvedor" },
    { value: ROLE.ADMIN, label: "Admin" },
  ].filter((item) => availableRoles.includes(item.value));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <RegistryFormScaffold
          title={title}
          description="O usuario herda identidade, empresas e escopo operacional do contato vinculado."
          onBack={() => router.push(backHref)}
          progressValue={selectedContactId ? 100 : 50}
          progressText={selectedContactId ? "Contato vinculado" : "Contato pendente"}
          submitLabel={mode === "edit" ? "Salvar alteracoes" : "Salvar usuario"}
          isSubmitting={isSubmitting}
          canSubmit={canSubmitForm}
          footerLeft={
            <>
              {hasErrors ? (
                <Badge variant="destructive" className="gap-1 text-[11px] font-medium">
                  <AlertCircle className="h-3 w-3" />
                  Campos invalidos
                </Badge>
              ) : null}
              {clientContactInvalid ? (
                <Badge variant="outline" className="gap-1 border-amber-500/40 text-[11px] font-medium text-amber-700">
                  <AlertCircle className="h-3 w-3" />
                  Contato sem empresa vinculada
                </Badge>
              ) : null}
              {mode !== "edit" && emailAvailability.status === "unavailable" ? (
                <Badge variant="outline" className="gap-1 border-destructive/40 text-[11px] font-medium text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {emailAvailability.message}
                </Badge>
              ) : null}
            </>
          }
        >
          <div className="space-y-6">
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

                  <FormField
                    control={form.control}
                    name="contactId"
                    render={({ field }) => {
                      return (
                        <FormItem>
                          <FormLabel>Contato</FormLabel>
                          <FormControl>
                            <ContactPicker
                              value={toInputValue(field.value)}
                              options={contactOptions}
                              loading={loadingContacts}
                              searchValue={contactSearch}
                              onSearchChange={setContactSearch}
                              onChange={field.onChange}
                              placeholder="Selecione um contato"
                            />
                          </FormControl>
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
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Selecione o nivel de acesso" />
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
                        {mode !== "edit" && emailAvailability.status === "checking" ? (
                          <p className="text-[11px] text-muted-foreground">Verificando disponibilidade do e-mail...</p>
                        ) : null}
                        {mode !== "edit" && emailAvailability.status === "available" ? (
                          <p className="text-[11px] text-emerald-600">E-mail disponivel para cadastro.</p>
                        ) : null}
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
                        Esse nome identifica o acesso no portal. Telefone, CPF e cargo ficam no cadastro do contato.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </RegistryFormScaffold>
      </form>
    </Form>
  );
}

function ContactPicker({
  value,
  options,
  loading,
  searchValue,
  onSearchChange,
  onChange,
  placeholder,
}: {
  value: string;
  options: ContactOption[];
  loading: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((contact) => contact.id === value) ?? null;

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) onSearchChange("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-auto min-h-11 w-full justify-between px-3 py-2 shadow-xs",
            !selected && "text-muted-foreground",
          )}
        >
          <div className="min-w-0 text-left">
            {selected ? (
              <>
                <span className="block truncate text-sm font-medium text-foreground">{selected.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {selected.whatsapp || selected.email || "Sem telefone ou e-mail"}
                </span>
              </>
            ) : (
              <span className="block truncate text-sm">{placeholder}</span>
            )}
          </div>
          {loading && !open ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-60" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[24rem] p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar por nome, e-mail ou WhatsApp..."
              className="h-9 border-none bg-muted/20 pl-9 pr-9 shadow-none focus-visible:ring-1 focus-visible:ring-offset-0"
              autoFocus
            />
            {loading ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
            ) : null}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto py-1.5">
          {options.map((contact) => {
            const isSelected = contact.id === value;
            const companyNames = (contact.companies ?? (contact.company ? [contact.company] : []))
              .map((company) => company.nomeFantasia || company.razaoSocial)
              .filter(Boolean)
              .join(", ");

            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => {
                  onChange(contact.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-start gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/50",
                  isSelected && "bg-primary/5 hover:bg-primary/10",
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/50 bg-muted/40 text-muted-foreground">
                  <UserRound className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{contact.name}</span>
                  <div className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 truncate">
                      <Phone className="h-3 w-3 shrink-0" />
                      {contact.whatsapp || "WhatsApp nao informado"}
                    </span>
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3 shrink-0" />
                      {contact.email || "E-mail nao informado"}
                    </span>
                    <span className="flex items-center gap-1 truncate">
                      <Building2 className="h-3 w-3 shrink-0" />
                      {companyNames || "Sem empresa vinculada"}
                    </span>
                  </div>
                </div>
                {isSelected ? <Check className="mt-1 h-4 w-4 shrink-0 text-primary" /> : null}
              </button>
            );
          })}

          {!options.length && !loading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhum contato encontrado para o termo informado.
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
