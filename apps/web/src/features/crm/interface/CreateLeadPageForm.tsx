"use client";

import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  ChevronsUpDown,
  CircleDashed,
  FileSearch,
  Search,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { CRM_LEAD_SOURCE_VALUES, CRM_LEAD_STAGE_VALUES } from "@dosc-syspro/contracts/crm";
import type { LeadContactOption } from "@/features/crm/domain/model";
import { CRM_SOURCE_LABELS, CRM_STAGE_LABELS } from "@/features/crm/domain/model";
import { lookupCompanyProfileByCnpjClient } from "@/features/company/infrastructure/gateways/company-lookup-cnpj.gateway";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCNPJ } from "@/lib/formatters";

type LeadFormState = {
  title: string;
  stage: string;
  source: string;
  companyName: string;
  tradeName: string;
  document: string;
  industry: string;
  companySize: string;
  city: string;
  state: string;
  estimatedValue: string;
  expectedCloseAt: string;
  nextStep: string;
  qualificationNotes: string;
  lostReason: string;
};

const DEFAULT_FORM_STATE: LeadFormState = {
  title: "",
  stage: "LEAD",
  source: "MANUAL",
  companyName: "",
  tradeName: "",
  document: "",
  industry: "",
  companySize: "",
  city: "",
  state: "",
  estimatedValue: "",
  expectedCloseAt: "",
  nextStep: "",
  qualificationNotes: "",
  lostReason: "",
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isValidCnpj(value: string) {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;

  const calcDigit = (base: string, factors: number[]) => {
    const total = base
      .split("")
      .reduce((sum, digit, index) => sum + Number(digit) * factors[index], 0);
    const mod = total % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const base = digits.slice(0, 12);
  const firstDigit = calcDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calcDigit(`${base}${firstDigit}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits === `${base}${firstDigit}${secondDigit}`;
}

export function CreateLeadPageForm({ contacts }: { contacts: LeadContactOption[] }) {
  const router = useRouter();
  const [selectedContactId, setSelectedContactId] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [activeTab, setActiveTab] = useState("essentials");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [form, setForm] = useState<LeadFormState>(DEFAULT_FORM_STATE);

  const filteredContacts = useMemo(() => {
    const term = normalizeSearch(contactSearch);
    const source = term
      ? contacts.filter((contact) =>
          normalizeSearch(
            `${contact.name} ${contact.email || ""} ${contact.phone || ""} ${contact.companies.join(" ")}`,
          ).includes(term),
        )
      : contacts;

    return source.slice(0, 50);
  }, [contacts, contactSearch]);

  const selectedContact = contacts.find((contact) => contact.id === selectedContactId) || null;
  const essentialReady = Boolean(form.title.trim() && form.companyName.trim());
  const companyReady = Boolean(form.document.trim() || form.tradeName.trim() || form.city.trim() || form.state.trim());
  const qualificationReady = Boolean(form.nextStep.trim() || form.estimatedValue.trim() || form.qualificationNotes.trim());

  function updateField<K extends keyof LeadFormState>(field: K, value: LeadFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleLookupCnpj() {
    const normalizedCnpj = onlyDigits(form.document);

    if (normalizedCnpj.length !== 14) {
      toast.error("Informe um CNPJ completo.");
      return;
    }

    if (!isValidCnpj(normalizedCnpj)) {
      toast.error("Informe um CNPJ valido.");
      return;
    }

    setIsLookupLoading(true);
    const result = await lookupCompanyProfileByCnpjClient(normalizedCnpj);

    if (!result.success || !result.data?.profile) {
      toast.error(result.message || "Nao foi possivel consultar o CNPJ.");
      setIsLookupLoading(false);
      return;
    }

    const profile = result.data.profile;
    setForm((current) => ({
      ...current,
      document: formatCNPJ(profile.cnpj),
      companyName: profile.legalName || current.companyName,
      tradeName: profile.tradeName || current.tradeName,
      city: profile.address?.city || current.city,
      state: profile.address?.state || current.state,
      industry: profile.primaryCnaeDescription || current.industry,
    }));

    toast.success("Dados da empresa preenchidos a partir do CNPJ.");
    setIsLookupLoading(false);
    setActiveTab("company");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      toast.error("Informe o titulo do lead.");
      setActiveTab("essentials");
      return;
    }

    if (!form.companyName.trim()) {
      toast.error("Informe a empresa potencial.");
      setActiveTab("essentials");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/crm/leads", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          title: form.title.trim(),
          stage: form.stage,
          source: form.source,
          contactId: selectedContactId || null,
          contactName: selectedContact?.name || null,
          contactEmail: selectedContact?.email || null,
          contactPhone: selectedContact?.whatsapp || selectedContact?.phone || null,
          companyName: form.companyName.trim(),
          tradeName: form.tradeName.trim() || null,
          document: onlyDigits(form.document) || null,
          industry: form.industry.trim() || null,
          companySize: form.companySize.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          estimatedValue: form.estimatedValue.trim() ? Number(form.estimatedValue.replace(",", ".")) : null,
          expectedCloseAt: form.expectedCloseAt || null,
          nextStep: form.nextStep.trim() || null,
          qualificationNotes: form.qualificationNotes.trim() || null,
          lostReason: form.lostReason.trim() || null,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success === false) {
        toast.error(payload?.error || payload?.message || "Falha ao criar lead.");
        return;
      }

      toast.success("Lead criado com sucesso.");
      router.push("/portal/comercial/leads");
      router.refresh();
    } catch (error) {
      console.error("Erro ao criar lead:", error);
      toast.error("Falha ao criar lead.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-5xl flex-col gap-6 p-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Novo lead</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Cadastre a oportunidade em etapas. Primeiro o essencial, depois dados da empresa e qualificacao comercial.
          </p>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/portal/comercial/leads">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar lead"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FlowCard
          title="Essencial"
          description="Identificacao da oportunidade"
          ready={essentialReady}
          icon={Target}
        />
        <FlowCard
          title="Empresa"
          description="CNPJ e contexto do prospect"
          ready={companyReady}
          icon={Building2}
        />
        <FlowCard
          title="Qualificacao"
          description="Proximo passo e potencial"
          ready={qualificationReady}
          icon={CircleDashed}
        />
      </div>

      <Card className="border-border/60">
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Fluxo de cadastro</CardTitle>
            <CardDescription>
              O formulario foi separado para reduzir ruido. A mesma consulta de CNPJ do cadastro de empresas pode preencher os dados do prospect.
            </CardDescription>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid h-auto w-full grid-cols-3">
              <TabsTrigger value="essentials">Essencial</TabsTrigger>
              <TabsTrigger value="company">Empresa</TabsTrigger>
              <TabsTrigger value="qualification">Qualificacao</TabsTrigger>
            </TabsList>

            <TabsContent value="essentials" className="mt-5">
              <CardContent className="grid gap-4 px-0 pb-0 md:grid-cols-2">
                <Field label="Titulo" htmlFor="lead-title" required>
                  <Input
                    id="lead-title"
                    value={form.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    placeholder="Ex.: Rede avaliando migracao do ERP"
                    required
                  />
                </Field>

                <Field label="Empresa potencial" htmlFor="lead-company-name" required>
                  <Input
                    id="lead-company-name"
                    value={form.companyName}
                    onChange={(event) => updateField("companyName", event.target.value)}
                    placeholder="Nome da empresa prospect"
                    required
                  />
                </Field>

                <Field label="Etapa" htmlFor="lead-stage">
                  <select
                    id="lead-stage"
                    value={form.stage}
                    onChange={(event) => updateField("stage", event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {CRM_LEAD_STAGE_VALUES.map((value) => (
                      <option key={value} value={value}>
                        {CRM_STAGE_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Origem" htmlFor="lead-source">
                  <select
                    id="lead-source"
                    value={form.source}
                    onChange={(event) => updateField("source", event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {CRM_LEAD_SOURCE_VALUES.map((value) => (
                      <option key={value} value={value}>
                        {CRM_SOURCE_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Contato vinculado" htmlFor="lead-contact-picker">
                  <ContactPicker
                    contacts={filteredContacts}
                    selectedContact={selectedContact}
                    search={contactSearch}
                    onSearchChange={setContactSearch}
                    onSelect={(contact) => setSelectedContactId(contact?.id || "")}
                  />
                </Field>

                <Field label="Proximo passo" htmlFor="lead-next-step">
                  <Input
                    id="lead-next-step"
                    value={form.nextStep}
                    onChange={(event) => updateField("nextStep", event.target.value)}
                    placeholder="Ex.: agendar apresentacao comercial"
                  />
                </Field>
              </CardContent>
            </TabsContent>

            <TabsContent value="company" className="mt-5">
              <CardContent className="space-y-5 px-0 pb-0">
                <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                  <Field label="CNPJ / documento" htmlFor="lead-document">
                    <Input
                      id="lead-document"
                      value={form.document}
                      onChange={(event) => updateField("document", formatCNPJ(event.target.value))}
                      placeholder="00.000.000/0000-00"
                    />
                  </Field>
                  <div className="flex items-end">
                    <Button type="button" variant="outline" className="gap-2" onClick={handleLookupCnpj} disabled={isLookupLoading}>
                      <FileSearch className="h-4 w-4" />
                      {isLookupLoading ? "Consultando" : "Buscar por CNPJ"}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Nome fantasia" htmlFor="lead-trade-name">
                    <Input
                      id="lead-trade-name"
                      value={form.tradeName}
                      onChange={(event) => updateField("tradeName", event.target.value)}
                      placeholder="Opcional"
                    />
                  </Field>
                  <Field label="Segmento" htmlFor="lead-industry">
                    <Input
                      id="lead-industry"
                      value={form.industry}
                      onChange={(event) => updateField("industry", event.target.value)}
                      placeholder="Autopecas, farmacia, comercial..."
                    />
                  </Field>
                  <Field label="Cidade" htmlFor="lead-city">
                    <Input
                      id="lead-city"
                      value={form.city}
                      onChange={(event) => updateField("city", event.target.value)}
                      placeholder="Cidade do prospect"
                    />
                  </Field>
                  <Field label="UF" htmlFor="lead-state">
                    <Input
                      id="lead-state"
                      value={form.state}
                      onChange={(event) => updateField("state", event.target.value.toUpperCase())}
                      placeholder="MG"
                      maxLength={8}
                    />
                  </Field>
                  <Field label="Porte" htmlFor="lead-company-size">
                    <Input
                      id="lead-company-size"
                      value={form.companySize}
                      onChange={(event) => updateField("companySize", event.target.value)}
                      placeholder="Ex.: 3 lojas / 25 usuarios"
                    />
                  </Field>
                </div>
              </CardContent>
            </TabsContent>

            <TabsContent value="qualification" className="mt-5">
              <CardContent className="space-y-5 px-0 pb-0">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Valor estimado" htmlFor="lead-estimated-value">
                    <Input
                      id="lead-estimated-value"
                      value={form.estimatedValue}
                      onChange={(event) => updateField("estimatedValue", event.target.value)}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                    />
                  </Field>

                  <Field label="Fechamento previsto" htmlFor="lead-expected-close-at">
                    <Input
                      id="lead-expected-close-at"
                      value={form.expectedCloseAt}
                      onChange={(event) => updateField("expectedCloseAt", event.target.value)}
                      type="date"
                    />
                  </Field>
                </div>

                <Field label="Notas de qualificacao" htmlFor="lead-qualification-notes">
                  <Textarea
                    id="lead-qualification-notes"
                    value={form.qualificationNotes}
                    onChange={(event) => updateField("qualificationNotes", event.target.value)}
                    rows={6}
                    placeholder="Contexto, dores, prazo, concorrente ou observacoes da oportunidade."
                  />
                </Field>

                <Field label="Motivo de perda" htmlFor="lead-lost-reason">
                  <Input
                    id="lead-lost-reason"
                    value={form.lostReason}
                    onChange={(event) => updateField("lostReason", event.target.value)}
                    placeholder="Preencha somente quando o lead for perdido"
                  />
                </Field>
              </CardContent>
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
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
    </div>
  );
}

function FlowCard({
  title,
  description,
  ready,
  icon: Icon,
}: {
  title: string;
  description: string;
  ready: boolean;
  icon: typeof Target;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Badge variant={ready ? "default" : "outline"} className="gap-1">
          <Icon className="h-3.5 w-3.5" />
          {ready ? "Pronto" : "Pendente"}
        </Badge>
      </CardContent>
    </Card>
  );
}

function ContactPicker({
  contacts,
  selectedContact,
  search,
  onSearchChange,
  onSelect,
}: {
  contacts: LeadContactOption[];
  selectedContact: LeadContactOption | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (contact: LeadContactOption | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="lead-contact-picker"
          type="button"
          variant="outline"
          className="h-auto min-h-11 w-full justify-between px-3 py-2"
        >
          <div className="min-w-0 text-left">
            <span className="block truncate text-sm font-medium text-foreground">
              {selectedContact ? selectedContact.name : "Selecionar contato existente"}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {selectedContact
                ? `${selectedContact.email || selectedContact.phone || "Sem canal"}`
                : "Busca por nome, email, telefone ou empresa"}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[28rem] p-0" align="start">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-9 border-none bg-muted/20 pl-9 shadow-none"
              placeholder="Buscar contato..."
            />
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto py-1.5">
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setOpen(false);
              onSearchChange("");
            }}
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/50"
          >
            <div>
              <span className="block text-sm font-medium text-foreground">Sem vinculo</span>
              <span className="block text-[11px] text-muted-foreground">
                Registrar lead sem contato associado
              </span>
            </div>
            {!selectedContact ? <Check className="h-4 w-4 text-primary" /> : null}
          </button>

          {contacts.map((contact) => {
            const isSelected = selectedContact?.id === contact.id;
            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => {
                  onSelect(contact);
                  setOpen(false);
                  onSearchChange("");
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/50",
                  isSelected ? "bg-primary/5" : "",
                )}
              >
                <div className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{contact.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {[contact.email, contact.whatsapp || contact.phone, contact.companies[0]]
                      .filter(Boolean)
                      .join(" - ")}
                  </span>
                </div>
                {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
              </button>
            );
          })}

          {contacts.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhum contato encontrado.
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
