"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import { Controller, useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createUserSchema, type CreateUserInput, type UserAssignableProfile } from "@dosc-syspro/contracts/user";
import type { CompanyOption } from "@dosc-syspro/contracts/company";
import { type ContactOption } from "@dosc-syspro/contracts/contact";
import { AnimatePresence, motion } from "framer-motion";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Badge, Button, Popover, PopoverContent, PopoverTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@dosc-syspro/ui";
import { RegistryFormScaffold, type RegistryFormSection } from "@/components/platform/shared/registry-form-scaffold";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/api/trpc-client";
import { createUserAction, updateUserAction } from "@/features/user-access/application/user-access-write.actions";
import {
  AlertCircle,
  Building2,
  Check,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

const ROLE = {
  ADMIN: "ADMIN",
  DEVELOPER: "DEVELOPER",
  SUPORTE: "SUPORTE",
  CLIENTE_ADMIN: "CLIENTE_ADMIN",
  CLIENTE_USER: "CLIENTE_USER",
} as const;

type SectionId = "geral" | "vinculo";

const SECTIONS: Array<RegistryFormSection<SectionId> & { fields: string[] }> = [
  {
    id: "geral",
    title: "Geral",
    description: "Perfil e credenciais",
    icon: ShieldCheck as ElementType,
    fields: ["name", "email", "password", "profileKey"],
  },
  {
    id: "vinculo",
    title: "Empresa",
    description: "Empresas vinculadas e contato opcional",
    icon: Building2 as ElementType,
    fields: ["companyIds", "contactId"],
  },
];

export interface CreateUserPageFormProps {
  companies: CompanyOption[];
  backHref: string;
  mode?: "create" | "edit";
  userId?: string;
  initialData?: Partial<CreateUserInput>;
  assignableProfiles: UserAssignableProfile[];
}

const toInputValue = (value: unknown) => (typeof value === "string" ? value : "");
const isValidEmailFormat = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const getCompanyLabel = (company: CompanyOption) => company.nomeFantasia || company.razaoSocial;

type EmailAvailabilityState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; message: string }
  | { status: "unavailable"; message: string };

export function CreateUserPageForm({
  companies,
  backHref,
  mode = "create",
  userId,
  initialData,
  assignableProfiles,
}: CreateUserPageFormProps) {
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState<SectionId>("geral");
  const defaultProfileKey = assignableProfiles[0]?.key ?? ROLE.CLIENTE_USER;
  const allowedCompanyIds = useMemo(() => companies.map((company) => company.id), [companies]);

  const [companyQuery, setCompanyQuery] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [contactOptions, setContactOptions] = useState<ContactOption[]>([]);
  const [contactPage, setContactPage] = useState(1);
  const [hasMoreContacts, setHasMoreContacts] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [emailAvailability, setEmailAvailability] = useState<EmailAvailabilityState>({ status: "idle" });

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      email: initialData?.email ?? "",
      password: "",
      profileKey: initialData?.profileKey ?? defaultProfileKey,
      companyIds: initialData?.companyIds ?? (companies.length === 1 && companies[0]?.id ? [companies[0].id] : []),
      contactId: initialData?.contactId ?? "",
    },
    mode: "onChange",
  });

  const { errors, isSubmitting } = form.formState;
  const selectedContactId = useWatch({
    control: form.control,
    name: "contactId",
  });
  const selectedProfileKey = useWatch({
    control: form.control,
    name: "profileKey",
  });
  const watchedCompanyIds = useWatch({
    control: form.control,
    name: "companyIds",
  });
  const watchedName = useWatch({
    control: form.control,
    name: "name",
  });
  const watchedEmail = useWatch({
    control: form.control,
    name: "email",
  });
  const selectedRoleIsClient = selectedProfileKey === ROLE.CLIENTE_ADMIN || selectedProfileKey === ROLE.CLIENTE_USER;
  const normalizedWatchedEmail = String(watchedEmail ?? "").trim().toLowerCase();
  const selectedCompanyIds = watchedCompanyIds ?? [];

  useEffect(() => {
    setContactPage(1);
  }, [contactSearch, selectedRoleIsClient, allowedCompanyIds, selectedCompanyIds]);

  useEffect(() => {
    if (companies.length === 1 && companies[0]?.id && selectedCompanyIds.length === 0) {
      form.setValue("companyIds", [companies[0].id], { shouldDirty: false, shouldValidate: true });
    }
  }, [companies, form, selectedCompanyIds]);

  useEffect(() => {
    const query = contactSearch.trim();
    const currentContactId = form.getValues("contactId");

    const timer = setTimeout(async () => {
      try {
        setLoadingContacts(true);

        const result = await trpc.contacts.list.query({
          page: String(contactPage),
          pageSize: "100",
          q: query || undefined,
          companyId: selectedCompanyIds.length === 1 ? selectedCompanyIds[0] : undefined,
        });
        const normalized = result.items as ContactOption[];
        const filtered = selectedCompanyIds.length > 0
          ? normalized.filter((contact) => (contact.companyIds ?? (contact.companyId ? [contact.companyId] : [])).some((companyId) => selectedCompanyIds.includes(companyId)))
          : selectedRoleIsClient
            ? normalized.filter((contact) => (contact.companyIds ?? (contact.companyId ? [contact.companyId] : [])).some((companyId) => allowedCompanyIds.includes(companyId)))
            : normalized;
        const selected = currentContactId ? normalized.find((contact) => contact.id === currentContactId) : undefined;

        setHasMoreContacts(Boolean(result.pagination?.hasNextPage));

        setContactOptions((prev) => {
          const base = contactPage === 1 ? [] : prev;
          const next = [...base];
          const pushUnique = (contact: ContactOption | undefined | null) => {
            if (!contact || next.some((item) => item.id === contact.id)) return;
            next.push(contact);
          };

          if (currentContactId && selected && !filtered.some((contact) => contact.id === currentContactId)) {
            pushUnique(selected);
          }

          filtered.forEach((contact) => pushUnique(contact));
          return next;
        });
      } catch {
        setHasMoreContacts(false);
        setContactOptions((prev) => (contactPage === 1 ? [] : prev));
      } finally {
        setLoadingContacts(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [allowedCompanyIds, contactPage, contactSearch, selectedRoleIsClient, selectedCompanyIds, form]);

  useEffect(() => {
    const currentContactId = form.getValues("contactId");
    if (!currentContactId || contactOptions.some((contact) => contact.id === currentContactId)) {
      return;
    }

    let cancelled = false;

    const loadSelectedContact = async () => {
      try {
        const contact = await trpc.contacts.getOne.query({ id: currentContactId });
        if (cancelled || !contact?.id) return;

        const firstCompanyId = contact.companyIds?.[0] ?? contact.companyId;
        if (firstCompanyId && (form.getValues("companyIds")?.length ?? 0) === 0) {
          form.setValue("companyIds", [firstCompanyId], { shouldDirty: false, shouldValidate: true });
        }

        setContactOptions((prev) => {
          if (prev.some((c) => c.id === contact.id)) return prev;
          return [contact, ...prev];
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
    const currentContactId = form.getValues("contactId");
    if (!currentContactId) return;

    const currentContact = contactOptions.find((contact) => contact.id === currentContactId);
    if (!currentContact) return;

    const companyIds = currentContact.companyIds ?? (currentContact.companyId ? [currentContact.companyId] : []);
    if (selectedCompanyIds.length > 0 && !companyIds.some((companyId) => selectedCompanyIds.includes(companyId))) {
      form.setValue("contactId", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [contactOptions, form, selectedCompanyIds]);

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
        const result = await trpc.users.checkEmail.query({ email: normalizedWatchedEmail });
        if (cancelled) return;

        if (result.available) {
          setEmailAvailability({ status: "available", message: result.message });
        } else {
          setEmailAvailability({ status: "unavailable", message: result.message });
        }
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
  const selectedCompanies = useMemo(
    () =>
      selectedCompanyIds
        .map((id) => companies.find((company) => company.id === id))
        .filter(Boolean) as CompanyOption[],
    [companies, selectedCompanyIds],
  );
  const filteredCompanies = useMemo(() => {
    const normalizedQuery = companyQuery.trim().toLowerCase();
    const source = normalizedQuery
      ? companies.filter((company) => `${company.nomeFantasia || ""} ${company.razaoSocial}`.toLowerCase().includes(normalizedQuery))
      : companies;

    return source
      .slice()
      .sort((left, right) => getCompanyLabel(left).localeCompare(getCompanyLabel(right), "pt-BR", {
        sensitivity: "base",
        numeric: true,
      }))
      .slice(0, 30);
  }, [companies, companyQuery]);

  const selectedCompanyNames = (selectedContact?.companies ?? (selectedContact?.company ? [selectedContact.company] : []))
    .map((company) => company.nomeFantasia || company.razaoSocial)
    .filter(Boolean)
    .join(", ");
  const selectedContactCompanyIds = selectedContact?.companyIds ?? (selectedContact?.companyId ? [selectedContact.companyId] : []);
  const clientContactInvalid = selectedRoleIsClient
    && Boolean(selectedContactId)
    && (selectedContactCompanyIds.length === 0 || !selectedContactCompanyIds.some((companyId) => selectedCompanyIds.includes(companyId)));
  const canSubmitForm = Boolean(
    String(watchedName ?? "").trim().length >= 3 &&
    String(watchedEmail ?? "").trim().length > 0 &&
    selectedProfileKey &&
    (!selectedRoleIsClient || selectedCompanyIds.length > 0) &&
    (!selectedContactId || !clientContactInvalid) &&
    (mode === "edit" || emailAvailability.status !== "unavailable"),
  );

  const onSubmit: SubmitHandler<CreateUserInput> = async (data) => {
    if (mode !== "edit" && emailAvailability.status === "unavailable") {
      toast.error(emailAvailability.message);
      return;
    }

    if (selectedRoleIsClient && (data.companyIds?.length ?? 0) === 0) {
      toast.error("Selecione ao menos uma empresa para o usuario.");
      return;
    }

    const payload: CreateUserInput = {
      ...data,
      companyIds: data.companyIds ?? [],
      contactId: data.contactId?.trim() || "",
    };

    if (mode === "edit" && !payload.password) payload.password = undefined;

    try {
      const result =
        mode === "edit" && userId
          ? await updateUserAction(userId, payload)
          : await createUserAction(payload);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message || (mode === "edit" ? "Usuario atualizado com sucesso." : "Usuario cadastrado com sucesso."));
      router.push(backHref);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : (mode === "edit" ? "Erro ao atualizar usuario." : "Erro ao cadastrar usuario."),
      );
    }
  };

  const hasErrors = Object.keys(errors).length > 0;
  const currentIndex = Math.max(
    SECTIONS.findIndex((section) => section.id === currentSection),
    0,
  );
  const progressPct = Math.round(((currentIndex + 1) / SECTIONS.length) * 100);
  const sectionStateMap = useMemo(() => {
    return SECTIONS.reduce<Record<SectionId, "error" | "ready" | "idle">>((acc, section) => {
      const hasError = section.fields.some((field) => hasPath(errors, field));
      if (hasError) {
        acc[section.id] = "error";
        return acc;
      }

      const hasValue = section.fields.some((field) => {
        const value = form.getValues(field as keyof CreateUserInput);
        if (Array.isArray(value)) return value.length > 0;
        return String(value ?? "").trim().length > 0;
      });
      acc[section.id] = hasValue ? "ready" : "idle";
      return acc;
    }, {} as Record<SectionId, "error" | "ready" | "idle">);
  }, [errors, form]);

  const title =
    mode === "edit"
      ? "Editar usuario"
      : "Novo usuario";

  const profileItems = assignableProfiles.map((profile) => ({
    value: profile.key,
    label: profile.label,
  }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <RegistryFormScaffold
          title={
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary/70" />
              {title}
            </span>
          }
          description={`${SECTIONS.find((section) => section.id === currentSection)?.title} - ${SECTIONS.find((section) => section.id === currentSection)?.description}`}
          onBack={() => router.push(backHref)}
          sections={SECTIONS}
          currentSection={currentSection}
          sectionStates={sectionStateMap}
          onSectionChange={setCurrentSection}
          progressLabel="Preenchimento"
          progressValue={progressPct}
          progressText={`${currentIndex + 1}/${SECTIONS.length}`}
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
                <Badge variant="warning" className="gap-1 text-[11px] font-medium">
                  <AlertCircle className="h-3 w-3" />
                  Contato sem empresa vinculada
                </Badge>
              ) : null}
              {!hasErrors ? (
                <Badge variant="muted" className="gap-1 text-[11px] font-medium">
                  {selectedCompanyIds.length} empresa(s) selecionada(s)
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
          footerCenter={
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={currentIndex === 0}
                onClick={() => setCurrentSection(SECTIONS[currentIndex - 1].id)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={currentIndex === SECTIONS.length - 1}
                onClick={() => setCurrentSection(SECTIONS[currentIndex + 1].id)}
                className="gap-1"
              >
                Proximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          }
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentSection}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-5"
            >
              {currentSection === "geral" ? (
                <section className="space-y-5">
                  <div className="flex items-center gap-2">
                    <div className="rounded-md bg-primary/10 p-1.5">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Perfil e credenciais</p>
                      <p className="text-xs text-muted-foreground">Defina acesso, e-mail e identificacao do usuario.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="profileKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Perfil de acesso</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Selecione o perfil de acesso" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {profileItems.map((item) => (
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
                </section>
              ) : null}

              {currentSection === "vinculo" ? (
                <section className="space-y-5">
                  <div className="flex items-center gap-2">
                    <div className="rounded-md bg-primary/10 p-1.5">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Empresa e Contato</p>
                      <p className="text-xs text-muted-foreground">Defina primeiro as empresas do usuario. O contato passa a ser opcional.</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-background/75 p-4 shadow-sm">
                    <Controller
                      control={form.control}
                      name="companyIds"
                      render={({ field }) => (
                        <div className="space-y-3">
                          <CompanyMultiPicker
                            selectedIds={field.value ?? []}
                            options={filteredCompanies}
                            query={companyQuery}
                            onQueryChange={setCompanyQuery}
                            onToggle={(companyId) => {
                              const current = field.value ?? [];
                              const next = current.includes(companyId)
                                ? current.filter((id) => id !== companyId)
                                : [...current, companyId];
                              field.onChange(next);
                            }}
                          />

                          <p className="text-[11px] text-muted-foreground">
                            Perfis de cliente exigem ao menos uma empresa. O contato, quando informado, deve pertencer a uma das empresas selecionadas.
                          </p>
                          {errors.companyIds?.message ? (
                            <p className="text-sm font-medium text-destructive">{errors.companyIds.message}</p>
                          ) : null}

                          <div className="flex flex-wrap gap-2">
                            {selectedCompanies.length === 0 ? (
                              <span className="rounded-lg border border-border/60 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
                                Nenhuma empresa vinculada.
                              </span>
                            ) : (
                              selectedCompanies.map((company) => (
                                <button
                                  key={company.id}
                                  type="button"
                                  onClick={() => field.onChange((field.value ?? []).filter((id) => id !== company.id))}
                                  className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
                                >
                                  <span className="truncate">{getCompanyLabel(company)}</span>
                                  <X className="h-3 w-3 shrink-0 text-muted-foreground" />
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    />
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
                              placeholder={selectedCompanyIds.length > 0 ? "Selecione um contato" : "Selecione ao menos uma empresa"}
                              hasMore={hasMoreContacts}
                              onLoadMore={() => setContactPage((current) => current + 1)}
                              disabled={selectedCompanyIds.length === 0}
                            />
                          </FormControl>
                          <p className="text-[11px] text-muted-foreground">
                            Opcional. Use quando quiser associar o usuario a um contato operacional especifico.
                          </p>
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
                        <span className="font-medium text-foreground">Empresas do contato:</span>{" "}
                        {selectedCompanyNames || "Sem empresa vinculada"}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-border/50 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                      Nenhum contato vinculado. O usuario sera criado apenas com as empresas selecionadas.
                    </div>
                  )}
                </section>
              ) : null}
            </motion.div>
          </AnimatePresence>
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
  hasMore,
  onLoadMore,
  disabled,
}: {
  value: string;
  options: ContactOption[];
  loading: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onChange: (value: string) => void;
  placeholder: string;
  hasMore: boolean;
  onLoadMore: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((contact) => contact.id === value) ?? null;

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (disabled) return;
        setOpen(nextOpen);
        if (!nextOpen) onSearchChange("");
      }}
    >
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
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
        className="w-(--radix-popover-trigger-width) min-w-[24rem] p-0"
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

          {options.length > 0 && hasMore ? (
            <div className="border-t px-2 pb-2 pt-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={onLoadMore}
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Carregar mais contatos
              </Button>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CompanyMultiPicker({
  selectedIds,
  options,
  query,
  onQueryChange,
  onToggle,
}: {
  selectedIds: string[];
  options: CompanyOption[];
  query: string;
  onQueryChange: (value: string) => void;
  onToggle: (companyId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) onQueryChange("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-11 w-full justify-between rounded-xl border-border/60 bg-background px-3 py-2 shadow-xs"
        >
          <div className="min-w-0 text-left">
            <span className="block truncate text-sm font-medium text-foreground">
              {selectedIds.length > 0 ? `${selectedIds.length} empresa(s) vinculada(s)` : "Selecionar empresas"}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              Vincule uma ou mais empresas para definir o escopo do usuario
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[28rem] rounded-2xl border-border/60 p-0 shadow-xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="border-b border-border/60 bg-background/90 p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Buscar empresa por nome fantasia ou razao social..."
              className="h-9 border-none bg-muted/20 pl-9 shadow-none focus-visible:ring-1 focus-visible:ring-offset-0"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto bg-background/95 py-1.5">
          {options.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              Nenhuma empresa encontrada.
            </div>
          ) : (
            options.map((company) => {
              const selected = selectedIds.includes(company.id);
              return (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => onToggle(company.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors",
                    selected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50",
                  )}
                >
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {getCompanyLabel(company)}
                    </span>
                    {company.nomeFantasia ? (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {company.razaoSocial}
                      </span>
                    ) : null}
                  </div>
                  <div className="shrink-0">
                    {selected ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                        <Check className="h-3.5 w-3.5" />
                        Vinculada
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-muted-foreground">Vincular</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
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
