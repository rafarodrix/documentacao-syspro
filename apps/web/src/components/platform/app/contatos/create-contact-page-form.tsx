"use client";

import { useMemo, useState } from "react";
import type { ElementType } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createContactSchema, type CreateContactInput } from "@dosc-syspro/contracts/contact";
import type { CompanyOption } from "@dosc-syspro/contracts/company";
import { includesNormalizedSearch, normalizeSearchText } from "@dosc-syspro/shared";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Check,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { RegistryFormScaffold, type RegistryFormSection } from "@/components/platform/shared/registry-form-scaffold";
import { cn } from "@/lib/utils";

type Props = {
  companies: CompanyOption[];
  backHref: string;
  mode?: "create" | "edit";
  contactId?: string;
  initialData?: Partial<CreateContactInput>;
};

type SectionId = "geral" | "empresas";

const SECTIONS: Array<RegistryFormSection<SectionId> & { fields: string[] }> = [
  {
    id: "geral",
    title: "Geral",
    description: "Identidade e canais",
    icon: UserRound as ElementType,
    fields: ["name", "email", "phone", "cpf", "jobTitle", "whatsapp", "notes"],
  },
  {
    id: "empresas",
    title: "Vinculo das empresas",
    description: "Empresas associadas ao contato",
    icon: Building2 as ElementType,
    fields: ["companyIds"],
  },
];

function normalizeDigits(value: string) {
  return value.replace(/\D+/g, "");
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function formatWhatsapp(value: string) {
  const digits = normalizeDigits(value).slice(0, 13);

  if (!digits) return "";
  if (digits.length <= 2) return `+${digits}`;
  if (digits.length <= 4) return `+${digits.slice(0, 2)} (${digits.slice(2)}`;
  if (digits.length <= 9) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4)}`;
  return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
}

function formatPhone(value: string) {
  const digits = normalizeDigits(value).slice(0, 11);

  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCpf(value: string) {
  const digits = normalizeDigits(value).slice(0, 11);

  if (!digits) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function isValidWhatsapp(value: string) {
  const digits = normalizeDigits(value);
  return digits.length === 12 || digits.length === 13;
}

function isValidPhone(value: string) {
  const digits = normalizeDigits(value);
  return digits.length === 10 || digits.length === 11;
}

function isValidCpf(value: string) {
  return normalizeDigits(value).length === 11;
}

function getCompanyLabel(company: CompanyOption) {
  return company.nomeFantasia || company.razaoSocial;
}

export function CreateContactPageForm({
  companies,
  backHref,
  mode = "create",
  contactId,
  initialData,
}: Props) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [currentSection, setCurrentSection] = useState<SectionId>("geral");
  const [companyQuery, setCompanyQuery] = useState("");

  const form = useForm<CreateContactInput>({
    resolver: zodResolver(createContactSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      email: initialData?.email ?? "",
      phone: initialData?.phone ?? "",
      cpf: initialData?.cpf ? formatCpf(initialData.cpf) : "",
      jobTitle: initialData?.jobTitle ?? "",
      whatsapp: initialData?.whatsapp ?? "",
      notes: initialData?.notes ?? "",
      companyIds: initialData?.companyIds ?? [],
    },
    mode: "onTouched",
  });

  const { isSubmitting } = form.formState;
  const watchedName = useWatch({ control: form.control, name: "name" });
  const watchedCompanyIds = useWatch({ control: form.control, name: "companyIds" });

  const selectedCompanies = useMemo(
    () =>
      (watchedCompanyIds ?? [])
        .map((id) => companies.find((item) => item.id === id))
        .filter(Boolean) as CompanyOption[],
    [companies, watchedCompanyIds],
  );

  const filteredCompanies = useMemo(() => {
    const term = normalizeSearchText(companyQuery, { preserveSeparators: false });
    const source = term
      ? companies.filter((company) =>
          includesNormalizedSearch(`${company.nomeFantasia || ""} ${company.razaoSocial}`, term, {
            preserveSeparators: false,
          }),
        )
      : companies;

    return source
      .slice()
      .sort((a, b) =>
        getCompanyLabel(a).localeCompare(getCompanyLabel(b), "pt-BR", {
          sensitivity: "base",
          numeric: true,
        }),
      )
      .slice(0, 30);
  }, [companies, companyQuery]);

  const formId = isEdit && contactId ? `contact-form-${contactId}` : "contact-form-create";
  const canSubmit = Boolean(watchedName?.trim()) && !isSubmitting;

  const { errors, dirtyFields } = form.formState;

  const currentIndex = Math.max(
    SECTIONS.findIndex((section) => section.id === currentSection),
    0,
  );
  const progressPct = Math.round(((currentIndex + 1) / SECTIONS.length) * 100);
  const hasErrors = Object.keys(errors).length > 0;

  const sectionStateMap = useMemo(() => {
    return SECTIONS.reduce<Record<SectionId, "error" | "ready" | "idle">>((acc, section) => {
      const hasError = section.fields.some((field) => hasPath(errors, field));
      if (hasError) {
        acc[section.id] = "error";
        return acc;
      }

      const hasTouched = section.fields.some((field) => hasPath(dirtyFields, field));
      acc[section.id] = hasTouched ? "ready" : "idle";
      return acc;
    }, {} as Record<SectionId, "error" | "ready" | "idle">);
  }, [dirtyFields, errors]);

  async function onSubmit(data: CreateContactInput) {
    const phone = data.phone?.trim() ?? "";
    const whatsapp = data.whatsapp?.trim() ?? "";
    const cpf = data.cpf?.trim() ?? "";

    if (phone && !isValidPhone(phone)) {
      toast.error("Informe o telefone com DDD. Ex.: (34) 3333-4444.");
      return;
    }

    if (whatsapp && !isValidWhatsapp(whatsapp)) {
      toast.error("Informe o WhatsApp com DDI e DDD. Ex.: +55 (34) 99771-3731.");
      return;
    }

    if (cpf && !isValidCpf(cpf)) {
      toast.error("Informe o CPF com 11 digitos.");
      return;
    }

    try {
      const payload = {
        name: data.name.trim(),
        email: data.email?.trim() || null,
        phone: phone || null,
        cpf: normalizeDigits(cpf) || null,
        jobTitle: data.jobTitle?.trim() || null,
        whatsapp: whatsapp || null,
        notes: data.notes?.trim() || null,
        companyIds: data.companyIds ?? [],
      };

      const url = isEdit && contactId ? `/api/contacts/${contactId}` : "/api/contacts";
      const response = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const responseData = await response.json().catch(() => null);
        toast.error(
          responseData?.message ||
            (isEdit ? "Erro ao atualizar contato." : "Erro ao cadastrar contato."),
        );
        return;
      }

      toast.success(isEdit ? "Contato atualizado com sucesso." : "Contato cadastrado com sucesso.");
      router.push(backHref);
      router.refresh();
    } catch {
      toast.error("Erro na comunicacao com o servidor.");
    }
  }

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <RegistryFormScaffold
          formId={formId}
          title={
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary/70" />
              {isEdit ? "Editar contato" : "Novo contato"}
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
          submitLabel={isEdit ? "Salvar alteracoes" : "Salvar contato"}
          isSubmitting={isSubmitting}
          canSubmit={canSubmit}
          footerLeft={
            hasErrors ? (
              <Badge variant="destructive" className="gap-1 text-[11px] font-medium">
                Campos invalidos
              </Badge>
            ) : null
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
                      <UserRound className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Dados do contato</p>
                      <p className="text-xs text-muted-foreground">Identidade, canais e documentos.</p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Nome <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Nome completo"
                              className="h-10 border-border/60 bg-background"
                            />
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
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="contato@empresa.com"
                              className="h-10 border-border/60 bg-background"
                            />
                          </FormControl>
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
                            <Input
                              {...field}
                              placeholder="Cargo ou funcao"
                              className="h-10 border-border/60 bg-background"
                            />
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
                            <Input
                              {...field}
                              inputMode="numeric"
                              autoComplete="off"
                              onChange={(e) => field.onChange(formatCpf(e.target.value))}
                              placeholder="000.000.000-00"
                              className="h-10 border-border/60 bg-background"
                            />
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
                            <Input
                              {...field}
                              inputMode="numeric"
                              autoComplete="tel"
                              onChange={(e) => field.onChange(formatPhone(e.target.value))}
                              placeholder="(00) 0000-0000"
                              className="h-10 border-border/60 bg-background"
                            />
                          </FormControl>
                          <p className="text-[11px] text-muted-foreground">Use DDD. Ex.: (34) 3333-4444.</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="whatsapp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WhatsApp</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              inputMode="numeric"
                              autoComplete="tel"
                              onChange={(e) => field.onChange(formatWhatsapp(e.target.value))}
                              placeholder="+55 (34) 99771-3731"
                              className="h-10 border-border/60 bg-background"
                            />
                          </FormControl>
                          <p className="text-[11px] text-muted-foreground">
                            Use DDI e DDD. Ex.: +55 (34) 99771-3731.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observacoes</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={5}
                            placeholder="Preferencias, horarios, area responsavel ou observacoes comerciais."
                            className="resize-none border-border/60 bg-background"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </section>
              ) : null}

              {currentSection === "empresas" ? (
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="rounded-md bg-primary/10 p-1.5">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Empresas vinculadas</p>
                        <p className="text-xs text-muted-foreground">O contato pode pertencer a uma ou mais empresas.</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="w-fit rounded-md border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
                    >
                      {watchedCompanyIds?.length ?? 0} selecionada(s)
                    </Badge>
                  </div>

                  <Controller
                  control={form.control}
                  name="companyIds"
                  render={({ field }) => (
                    <>
                      <CompanyMultiPicker
                        selectedIds={field.value ?? []}
                        options={filteredCompanies}
                        query={companyQuery}
                        onQueryChange={setCompanyQuery}
                        onToggle={(companyId) => {
                          const current = field.value ?? [];
                          field.onChange(
                            current.includes(companyId)
                              ? current.filter((id) => id !== companyId)
                              : [...current, companyId],
                          );
                        }}
                      />

                      <div className="flex flex-wrap gap-2">
                        {selectedCompanies.length === 0 ? (
                          <span className="rounded-md border border-border/60 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
                            Nenhuma empresa vinculada.
                          </span>
                        ) : (
                          selectedCompanies.map((company) => (
                            <button
                              key={company.id}
                              type="button"
                              onClick={() => {
                                const current = field.value ?? [];
                                field.onChange(current.filter((id) => id !== company.id));
                              }}
                              className="inline-flex max-w-full items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-1.5 text-xs text-foreground hover:bg-muted"
                            >
                              <span className="truncate">{getCompanyLabel(company)}</span>
                              <X className="h-3 w-3 shrink-0 text-muted-foreground" />
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                />
                </section>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </registry-form-scaffold>
      </form>
    </Form>
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
          className="h-auto min-h-11 w-full justify-between border-border/60 bg-background px-3 py-2 shadow-xs"
        >
          <div className="min-w-0 text-left">
            <span className="block truncate text-sm font-medium text-foreground">
              {selectedIds.length > 0
                ? `${selectedIds.length} empresa(s) vinculada(s)`
                : "Selecionar empresas"}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              Busque e vincule sem precisar rolar a pagina inteira
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[28rem] p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="border-b p-2">
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

        <div className="max-h-80 overflow-y-auto py-1.5">
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
                    "flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors",
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
