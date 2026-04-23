"use client";

import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CircleDollarSign, FileSearch, Target, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { CRM_LEAD_SOURCE_VALUES, CRM_LEAD_STAGE_VALUES, type CrmLeadManualContact } from "@dosc-syspro/contracts/crm";
import { CRM_SOURCE_LABELS, CRM_STAGE_LABELS } from "@/features/crm/domain/model";
import { lookupCompanyProfileByCnpjClient } from "@/features/company/infrastructure/gateways/company-lookup-cnpj.gateway";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  licenseValue: string;
  monthlyFee: string;
  minimumWagePercentage: string;
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
  licenseValue: "",
  monthlyFee: "",
  minimumWagePercentage: "",
  expectedCloseAt: "",
  nextStep: "",
  qualificationNotes: "",
  lostReason: "",
};

const EMPTY_CONTACT: CrmLeadManualContact = {
  name: "",
  role: "",
  email: "",
  phone: "",
  whatsapp: "",
  isPrimary: true,
};

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

function parseNullableNumber(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasCompanyContext(form: LeadFormState) {
  return Boolean(form.document.trim() || form.tradeName.trim() || form.city.trim() || form.state.trim());
}

function hasCommercialQualification(form: LeadFormState) {
  return Boolean(
    form.licenseValue.trim() ||
    form.monthlyFee.trim() ||
    form.minimumWagePercentage.trim() ||
    form.nextStep.trim() ||
    form.qualificationNotes.trim(),
  );
}

export function CreateLeadPageForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("essentials");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [form, setForm] = useState<LeadFormState>(DEFAULT_FORM_STATE);
  const [contacts, setContacts] = useState<CrmLeadManualContact[]>([{ ...EMPTY_CONTACT }]);

  const essentialReady = Boolean(form.title.trim() && form.companyName.trim());
  const companyReady = hasCompanyContext(form);
  const contactsReady = contacts.some((contact) => contact.name.trim());
  const qualificationReady = hasCommercialQualification(form);

  const normalizedContacts = useMemo(
    () =>
      contacts
        .map((contact, index) => ({
          name: contact.name.trim(),
          role: contact.role?.trim() || "",
          email: contact.email?.trim() || "",
          phone: contact.phone?.trim() || "",
          whatsapp: contact.whatsapp?.trim() || "",
          isPrimary: index === 0 ? true : Boolean(contact.isPrimary),
        }))
        .filter((contact) => contact.name),
    [contacts],
  );

  function updateField<K extends keyof LeadFormState>(field: K, value: LeadFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateContact(index: number, field: keyof CrmLeadManualContact, value: string | boolean) {
    setContacts((current) =>
      current.map((contact, currentIndex) => {
        if (currentIndex !== index) return contact;
        return {
          ...contact,
          [field]: value,
        };
      }),
    );
  }

  function addContact() {
    setContacts((current) => [...current, { ...EMPTY_CONTACT, isPrimary: false }]);
  }

  function removeContact(index: number) {
    setContacts((current) => {
      const next = current.filter((_, currentIndex) => currentIndex !== index);
      if (!next.length) return [{ ...EMPTY_CONTACT }];
      return next.map((contact, currentIndex) => ({
        ...contact,
        isPrimary: currentIndex === 0 ? true : contact.isPrimary,
      }));
    });
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

    if (!normalizedContacts.length) {
      toast.error("Informe ao menos um contato manual do lead.");
      setActiveTab("contacts");
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
          companyName: form.companyName.trim(),
          tradeName: form.tradeName.trim() || null,
          document: onlyDigits(form.document) || null,
          contacts: normalizedContacts,
          industry: form.industry.trim() || null,
          companySize: form.companySize.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          estimatedValue: parseNullableNumber(form.estimatedValue),
          licenseValue: parseNullableNumber(form.licenseValue),
          monthlyFee: parseNullableNumber(form.monthlyFee),
          minimumWagePercentage: parseNullableNumber(form.minimumWagePercentage),
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
            Organize o cadastro em quatro frentes: essenciais, empresa, contatos e qualificacao comercial.
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

      <div className="grid gap-4 md:grid-cols-4">
        <FlowCard title="Essenciais" description="Entrada no funil" ready={essentialReady} icon={Target} />
        <FlowCard title="Empresa" description="Dados do prospect" ready={companyReady} icon={Building2} />
        <FlowCard title="Contatos" description="Socios e decisores" ready={contactsReady} icon={UsersRound} />
        <FlowCard title="Qualificacao" description="Licenca e mensalidade" ready={qualificationReady} icon={CircleDollarSign} />
      </div>

      <Card className="border-border/60">
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Cadastro do lead</CardTitle>
            <CardDescription>
              O lead agora possui contatos manuais proprios e qualificacao comercial adaptada ao modelo de software.
            </CardDescription>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid h-auto w-full grid-cols-4">
              <TabsTrigger value="essentials">Essenciais</TabsTrigger>
              <TabsTrigger value="company">Empresa</TabsTrigger>
              <TabsTrigger value="contacts">Contatos</TabsTrigger>
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
                  />
                </Field>

                <Field label="Empresa potencial" htmlFor="lead-company-name" required>
                  <Input
                    id="lead-company-name"
                    value={form.companyName}
                    onChange={(event) => updateField("companyName", event.target.value)}
                    placeholder="Nome da empresa prospect"
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
                      placeholder="ERP, varejo, farmacia, distribuicao..."
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

            <TabsContent value="contacts" className="mt-5">
              <CardContent className="space-y-4 px-0 pb-0">
                {contacts.map((contact, index) => (
                  <div key={index} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {index === 0 ? "Contato principal" : `Contato ${index + 1}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Registre socios, decisores ou usuarios-chave da empresa.
                        </p>
                      </div>
                      {contacts.length > 1 ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeContact(index)}>
                          Remover
                        </Button>
                      ) : null}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Nome" htmlFor={`lead-contact-name-${index}`} required={index === 0}>
                        <Input
                          id={`lead-contact-name-${index}`}
                          value={contact.name}
                          onChange={(event) => updateContact(index, "name", event.target.value)}
                          placeholder="Nome do contato"
                        />
                      </Field>

                      <Field label="Cargo / papel" htmlFor={`lead-contact-role-${index}`}>
                        <Input
                          id={`lead-contact-role-${index}`}
                          value={contact.role || ""}
                          onChange={(event) => updateContact(index, "role", event.target.value)}
                          placeholder="Socio, financeiro, gerente, TI..."
                        />
                      </Field>

                      <Field label="Email" htmlFor={`lead-contact-email-${index}`}>
                        <Input
                          id={`lead-contact-email-${index}`}
                          value={contact.email || ""}
                          onChange={(event) => updateContact(index, "email", event.target.value)}
                          placeholder="contato@empresa.com"
                        />
                      </Field>

                      <Field label="Telefone" htmlFor={`lead-contact-phone-${index}`}>
                        <Input
                          id={`lead-contact-phone-${index}`}
                          value={contact.phone || ""}
                          onChange={(event) => updateContact(index, "phone", event.target.value)}
                          placeholder="(00) 0000-0000"
                        />
                      </Field>

                      <Field label="WhatsApp" htmlFor={`lead-contact-whatsapp-${index}`}>
                        <Input
                          id={`lead-contact-whatsapp-${index}`}
                          value={contact.whatsapp || ""}
                          onChange={(event) => updateContact(index, "whatsapp", event.target.value)}
                          placeholder="+55 (00) 00000-0000"
                        />
                      </Field>
                    </div>
                  </div>
                ))}

                <Button type="button" variant="outline" onClick={addContact}>
                  Adicionar contato
                </Button>
              </CardContent>
            </TabsContent>

            <TabsContent value="qualification" className="mt-5">
              <CardContent className="space-y-5 px-0 pb-0">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Valor total estimado" htmlFor="lead-estimated-value">
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

                  <Field label="Valor da licenca" htmlFor="lead-license-value">
                    <Input
                      id="lead-license-value"
                      value={form.licenseValue}
                      onChange={(event) => updateField("licenseValue", event.target.value)}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                    />
                  </Field>

                  <Field label="Mensalidade" htmlFor="lead-monthly-fee">
                    <Input
                      id="lead-monthly-fee"
                      value={form.monthlyFee}
                      onChange={(event) => updateField("monthlyFee", event.target.value)}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                    />
                  </Field>

                  <Field label="% do salario minimo" htmlFor="lead-minimum-wage-percentage">
                    <Input
                      id="lead-minimum-wage-percentage"
                      value={form.minimumWagePercentage}
                      onChange={(event) => updateField("minimumWagePercentage", event.target.value)}
                      type="number"
                      min="0"
                      step="0.0001"
                      placeholder="Ex.: 12.5"
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
                    placeholder="Necessidade, quantidade de usuarios, dores, prazo, implantacao, concorrente e regra comercial."
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
