"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  CircleDot,
  Loader2,
  Mail,
  Fingerprint,
  Phone,
  Save,
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
import { Textarea } from "@/components/ui/textarea";
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
    <div className="animate-in fade-in slide-in-from-bottom-3 space-y-5 pb-8 duration-500">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Button type="button" variant="ghost" size="sm" className="-ml-2 mb-2 h-8 gap-2 text-muted-foreground" onClick={() => router.push(backHref)}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {isEdit ? "Editar contato" : "Novo contato"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            {isEdit
              ? "Atualize identidade, canais e vinculos empresariais do contato."
              : "Cadastre a pessoa e vincule empresas para atendimento e relacionamento."}
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm sm:min-w-72">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preenchimento</span>
            <span className="text-sm font-semibold text-foreground">{progressPct}%</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-muted">
            <div className={cn("h-1.5 rounded-full transition-all", progressPct === 100 ? "bg-emerald-500" : "bg-primary")} style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_25rem]">
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
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={companyQuery}
                  onChange={(event) => setCompanyQuery(event.target.value)}
                  placeholder="Buscar empresa por nome fantasia ou razao social..."
                  className="h-10 border-border/60 bg-background pl-10"
                />
                {companyQuery ? (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setCompanyQuery("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
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

              <div className="max-h-72 overflow-y-auto rounded-md border border-border/60 bg-background p-2">
                {filteredCompanies.length === 0 ? (
                  <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">Nenhuma empresa encontrada.</div>
                ) : (
                  filteredCompanies.map((company) => {
                    const selected = form.companyIds.includes(company.id);
                    return (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => toggleCompany(company.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                          selected ? "bg-primary/10 text-primary" : "hover:bg-muted/60",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{getCompanyLabel(company)}</span>
                          {company.nomeFantasia ? <span className="block truncate text-[11px] text-muted-foreground">{company.razaoSocial}</span> : null}
                        </span>
                        <span className="shrink-0 text-[11px] font-medium">{selected ? "Selecionada" : "Selecionar"}</span>
                      </button>
                    );
                  })
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

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end xl:flex-col-reverse">
                <Button type="button" variant="outline" className="h-10 gap-2" onClick={() => router.push(backHref)}>
                  <ArrowLeft className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button type="submit" className="h-10 gap-2" disabled={!canSubmit}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSubmitting ? "Salvando" : isEdit ? "Salvar alteracoes" : "Salvar contato"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </form>
    </div>
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
