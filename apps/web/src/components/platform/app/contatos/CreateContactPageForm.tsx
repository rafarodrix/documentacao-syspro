"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  CircleDot,
  Mail,
  Fingerprint,
  Phone,
  Search,
  Smartphone,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { RegistryFormScaffold } from "@/components/platform/shared/RegistryFormScaffold";
import { cn } from "@/lib/utils";

type CompanyOption = {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
};

type ContactInitialData = {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  jobTitle: string;
  whatsapp: string;
  notes: string;
  companyIds: string[];
};

type ContactTextField = Exclude<keyof ContactInitialData, "companyIds">;

type Props = {
  companies: CompanyOption[];
  backHref: string;
  mode?: "create" | "edit";
  contactId?: string;
  initialData?: Partial<ContactInitialData>;
};

function normalizeDigits(value: string) {
  return value.replace(/\D+/g, "");
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyQuery, setCompanyQuery] = useState("");
  const [form, setForm] = useState<ContactInitialData>({
    name: initialData?.name ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    cpf: initialData?.cpf ? formatCpf(initialData.cpf) : "",
    jobTitle: initialData?.jobTitle ?? "",
    whatsapp: initialData?.whatsapp ?? "",
    notes: initialData?.notes ?? "",
    companyIds: initialData?.companyIds ?? ([] as string[]),
  });

  const selectedCompanies = useMemo(
    () => form.companyIds.map((companyId) => companies.find((item) => item.id === companyId)).filter(Boolean) as CompanyOption[],
    [companies, form.companyIds],
  );

  const filteredCompanies = useMemo(() => {
    const term = normalizeSearch(companyQuery);
    const source = term
      ? companies.filter((company) => normalizeSearch(`${company.nomeFantasia || ""} ${company.razaoSocial}`).includes(term))
      : companies;

    return source
      .slice()
      .sort((a, b) => getCompanyLabel(a).localeCompare(getCompanyLabel(b), "pt-BR", { sensitivity: "base", numeric: true }))
      .slice(0, 30);
  }, [companies, companyQuery]);

  const activeChannelCount = [form.email, form.phone, form.whatsapp].filter((value) => value.trim()).length;
  const formId = isEdit && contactId ? `contact-form-${contactId}` : "contact-form-create";
  const readinessItems = [
    { label: "Nome", done: Boolean(form.name.trim()) },
    { label: "Canal", done: activeChannelCount > 0 },
    { label: "Empresas", done: form.companyIds.length > 0 },
  ];
  const completedItems = readinessItems.filter((item) => item.done).length;
  const progressPct = Math.round((completedItems / readinessItems.length) * 100);
  const canSubmit = Boolean(form.name.trim()) && !isSubmitting;

  function updateField(field: ContactTextField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleCompany(companyId: string) {
    setForm((current) => ({
      ...current,
      companyIds: current.companyIds.includes(companyId)
        ? current.companyIds.filter((id) => id !== companyId)
        : [...current.companyIds, companyId],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Informe o nome do contato.");
      return;
    }

    if (form.email.trim() && !isValidEmail(form.email)) {
      toast.error("Informe um e-mail valido.");
      return;
    }

    if (form.whatsapp.trim() && !isValidWhatsapp(form.whatsapp)) {
      toast.error("Informe o WhatsApp com DDI e DDD. Ex.: +55 (34) 99771-3731.");
      return;
    }

    if (form.phone.trim() && !isValidPhone(form.phone)) {
      toast.error("Informe o telefone com DDD. Ex.: (34) 3333-4444.");
      return;
    }

    if (form.cpf.trim() && !isValidCpf(form.cpf)) {
      toast.error("Informe o CPF com 11 digitos.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        cpf: normalizeDigits(form.cpf) || null,
        jobTitle: form.jobTitle.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        notes: form.notes.trim() || null,
        companyIds: form.companyIds,
      };

      const url = isEdit && contactId ? `/api/contacts/${contactId}` : "/api/contacts";
      const response = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.message || (isEdit ? "Erro ao atualizar contato." : "Erro ao cadastrar contato."));
        return;
      }

      toast.success(isEdit ? "Contato atualizado com sucesso." : "Contato cadastrado com sucesso.");
      router.push(backHref);
      router.refresh();
    } catch {
      toast.error("Erro na comunicacao com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form id={formId} onSubmit={handleSubmit} noValidate>
      <RegistryFormScaffold
        formId={formId}
        title={isEdit ? "Editar contato" : "Novo contato"}
        description={
          isEdit
            ? "Atualize identidade, canais e vinculos empresariais do contato."
            : "Cadastre a pessoa e vincule empresas para atendimento e relacionamento."
        }
        onBack={() => router.push(backHref)}
        progressLabel="Preenchimento"
        progressValue={progressPct}
        submitLabel={isEdit ? "Salvar alteracoes" : "Salvar contato"}
        isSubmitting={isSubmitting}
        canSubmit={canSubmit}
        footerLeft={
          <div className="flex flex-wrap gap-2">
            {readinessItems.map((item) => (
              <Badge
                key={item.label}
                variant="outline"
                className={cn(
                  "gap-1 text-[11px] font-medium",
                  item.done
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-border/60 text-muted-foreground",
                )}
              >
                {item.done ? <CheckCircle2 className="h-3 w-3" /> : <CircleDot className="h-3 w-3" />}
                {item.label}
              </Badge>
            ))}
          </div>
        }
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <section className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryCard title="Identidade" value={form.name.trim() ? "Ok" : "Pendente"} icon={UserRound} tone={form.name.trim() ? "success" : "neutral"} />
            <SummaryCard title="Canais ativos" value={String(activeChannelCount)} icon={Smartphone} tone={activeChannelCount > 0 ? "info" : "neutral"} />
            <SummaryCard title="Empresas" value={String(form.companyIds.length)} icon={Building2} tone={form.companyIds.length > 0 ? "success" : "neutral"} />
          </div>

          <Card className="border-border/60 bg-card shadow-sm">
            <CardContent className="space-y-5 p-4 md:p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome" htmlFor="contact-name" required>
                  <Input
                    id="contact-name"
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Nome completo"
                    className="h-10 border-border/60 bg-background"
                  />
                </Field>

                <Field label="Email" htmlFor="contact-email">
                  <Input
                    id="contact-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder="contato@empresa.com"
                    className="h-10 border-border/60 bg-background"
                  />
                </Field>

                <Field label="Cargo" htmlFor="contact-job-title">
                  <Input
                    id="contact-job-title"
                    value={form.jobTitle}
                    onChange={(event) => updateField("jobTitle", event.target.value)}
                    placeholder="Cargo ou funcao"
                    className="h-10 border-border/60 bg-background"
                  />
                </Field>

                <Field label="CPF" htmlFor="contact-cpf">
                  <Input
                    id="contact-cpf"
                    inputMode="numeric"
                    autoComplete="off"
                    value={form.cpf}
                    onChange={(event) => updateField("cpf", formatCpf(event.target.value))}
                    placeholder="000.000.000-00"
                    className="h-10 border-border/60 bg-background"
                  />
                </Field>

                <Field label="Telefone" htmlFor="contact-phone" hint="Use DDD. Ex.: (34) 3333-4444.">
                  <Input
                    id="contact-phone"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(event) => updateField("phone", formatPhone(event.target.value))}
                    placeholder="(00) 0000-0000"
                    className="h-10 border-border/60 bg-background"
                  />
                </Field>

                <Field label="WhatsApp" htmlFor="contact-whatsapp" hint="Use DDI e DDD. Ex.: +55 (34) 99771-3731.">
                  <Input
                    id="contact-whatsapp"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={form.whatsapp}
                    onChange={(event) => updateField("whatsapp", formatWhatsapp(event.target.value))}
                    placeholder="+55 (34) 99771-3731"
                    className="h-10 border-border/60 bg-background"
                  />
                </Field>
              </div>

              <Field label="Observacoes" htmlFor="contact-notes">
                <Textarea
                  id="contact-notes"
                  rows={5}
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  placeholder="Preferencias, horarios, area responsavel ou observacoes comerciais."
                  className="resize-none border-border/60 bg-background"
                />
              </Field>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card shadow-sm">
            <CardContent className="space-y-4 p-4 md:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Empresas vinculadas</h2>
                  <p className="mt-1 text-xs text-muted-foreground">O contato pode pertencer a uma ou mais empresas.</p>
                </div>
                <Badge variant="outline" className="w-fit rounded-md border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                  {form.companyIds.length} selecionada(s)
                </Badge>
              </div>

              <div className="relative">
                <CompanyMultiPicker
                  selectedIds={form.companyIds}
                  options={filteredCompanies}
                  query={companyQuery}
                  onQueryChange={setCompanyQuery}
                  onToggle={toggleCompany}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedCompanies.length === 0 ? (
                  <span className="rounded-md border border-border/60 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">Nenhuma empresa vinculada.</span>
                ) : (
                  selectedCompanies.map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => toggleCompany(company.id)}
                      className="inline-flex max-w-full items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-1.5 text-xs text-foreground hover:bg-muted"
                    >
                      <span className="truncate">{getCompanyLabel(company)}</span>
                      <X className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-5">
          <Card className="border-border/60 bg-card shadow-sm">
            <CardContent className="space-y-4 p-4 md:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Resumo do contato</h2>
                  <p className="text-xs text-muted-foreground">Conferencia rapida antes de salvar.</p>
                </div>
              </div>

              <div className="space-y-2">
                {readinessItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 rounded-md border border-border/50 bg-muted/10 px-3 py-2 text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className={cn("inline-flex items-center gap-1 font-medium", item.done ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                      {item.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleDot className="h-3.5 w-3.5" />}
                      {item.done ? "Ok" : "Pendente"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="rounded-md border border-border/50 bg-muted/10 p-3 text-xs">
                <div className="space-y-3">
                  <SummaryLine icon={UserRound} label="Nome" value={form.name || "Nao informado"} />
                  <SummaryLine icon={Briefcase} label="Cargo" value={form.jobTitle || "Nao informado"} />
                  <SummaryLine icon={Fingerprint} label="CPF" value={form.cpf || "Nao informado"} />
                  <SummaryLine icon={Mail} label="Email" value={form.email || "Nao informado"} />
                  <SummaryLine icon={Phone} label="Telefone" value={form.phone || "Nao informado"} />
                  <SummaryLine icon={Smartphone} label="WhatsApp" value={form.whatsapp || "Nao informado"} />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Use o botao fixo no rodape para salvar. O vinculo com empresa libera o contato para usuario e atendimento.
              </p>
            </CardContent>
          </Card>
        </aside>
        </div>
      </RegistryFormScaffold>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  tone: "info" | "success" | "neutral";
}) {
  const toneClass = {
    info: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    neutral: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
  }[tone];

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-md", toneClass)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
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
              {selectedIds.length > 0 ? `${selectedIds.length} empresa(s) vinculada(s)` : "Selecionar empresas"}
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
                    <span className="block truncate text-sm font-medium text-foreground">{getCompanyLabel(company)}</span>
                    {company.nomeFantasia ? (
                      <span className="block truncate text-[11px] text-muted-foreground">{company.razaoSocial}</span>
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

function SummaryLine({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-xs font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
